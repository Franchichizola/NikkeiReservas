// Lógica central de reservas: crear con retención, cancelar, reprogramar (RF003, RF004, RF007, RF008)
import { Prisma, Reserva } from '@prisma/client';
import { prisma } from '../db';
import { DIAS_ANTICIPACION } from '../config';
import { ErrorHttp, esSuperposicion } from '../middleware/errores';
import { sumarMinutos } from './fechas';
import { getPolitica } from './politica';
import { notificar } from './notificaciones';
import { reembolsar } from './mercadoPago';
import { liberarRetenidasVencidas, precioDelTurno, turnosDelDia } from './turnos';

// Para poder usar estas funciones dentro de una transacción (bloqueos) o fuera de ella
type Db = Prisma.TransactionClient;

export const incluirCancha = { cancha: { select: { id: true, nombre: true, deporte: true } } };

// Si la BD rechaza por superposición (restricción de exclusión), lo convertimos en un 409 claro
export async function protegerSuperposicion<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion();
  } catch (e) {
    if (esSuperposicion(e)) throw new ErrorHttp(409, 'Turno no disponible: otra reserva ocupa ese horario');
    throw e;
  }
}

// Valida cancha, horario y tarifa de un turno. Devuelve sus datos.
export async function buscarTurno(canchaId: number, fecha: string, hora: string) {
  const cancha = await prisma.cancha.findUnique({ where: { id: canchaId } });
  if (!cancha || !cancha.activa) throw new ErrorHttp(404, 'La cancha no existe o no está activa');

  const pol = await getPolitica();
  const turno = turnosDelDia(cancha, fecha, pol).find((t) => t.hora === hora);
  if (!turno) throw new ErrorHttp(400, `${hora} no es un horario de turno válido para ${cancha.nombre}`);

  const tarifas = await prisma.tarifa.findMany({ where: { deporte: cancha.deporte } });
  const precio = precioDelTurno(tarifas, turno.horaEntera);
  if (precio === null) throw new ErrorHttp(422, 'No hay una tarifa configurada para ese horario');
  return { cancha, inicio: turno.inicio, fin: turno.fin, precio };
}

// El turno no puede ser pasado ni estar a más de 30 días (RB-03).
// enCursoOk = true permite turnos que ya empezaron pero no terminaron (solo recepción).
export function validarVentana(inicio: Date, fin: Date, enCursoOk = false) {
  const ahora = Date.now();
  if ((enCursoOk ? fin.getTime() : inicio.getTime()) <= ahora) throw new ErrorHttp(400, 'Ese turno ya pasó');
  if (inicio.getTime() > ahora + DIAS_ANTICIPACION * 86400000) {
    throw new ErrorHttp(400, `Solo se puede reservar hasta ${DIAS_ANTICIPACION} días antes`);
  }
}

// La cancha no debe estar bloqueada en ese horario
export async function verificarSinBloqueo(canchaId: number, inicio: Date, fin: Date, db: Db = prisma) {
  const hay = await db.bloqueo.count({ where: { canchaId, activo: true, inicio: { lt: fin }, fin: { gt: inicio } } });
  if (hay > 0) throw new ErrorHttp(409, 'La cancha está bloqueada en ese horario');
}

// Cantidad de ausencias del cliente dentro del período de la política (60 días)
export async function contarAusencias(clienteId: number) {
  const pol = await getPolitica();
  const desde = new Date(Date.now() - pol.ausenciasDias * 86400000);
  return prisma.reserva.count({ where: { clienteId, estado: 'AUSENTE', inicio: { gte: desde } } });
}

// Con 3 ausencias en 60 días se exige pagar el total por adelantado
export async function pagoTotalExigido(clienteId: number) {
  const pol = await getPolitica();
  return (await contarAusencias(clienteId)) >= pol.ausenciasMax;
}

// Seña que corresponde: porcentaje del precio, o el total si el cliente tiene muchas ausencias
export async function calcularSena(precio: number, pagoTotal: boolean) {
  const pol = await getPolitica();
  return pagoTotal ? precio : Math.round((precio * pol.senaPorcentaje) / 100);
}

// RF003: crea la reserva del cliente en estado RETENIDA por 10 minutos
export async function retenerTurno(clienteId: number, canchaId: number, fecha: string, hora: string) {
  await liberarRetenidasVencidas(); // libera turnos retenidos vencidos para que no estorben
  const turno = await buscarTurno(canchaId, fecha, hora);
  validarVentana(turno.inicio, turno.fin);
  await verificarSinBloqueo(canchaId, turno.inicio, turno.fin);

  const pol = await getPolitica();
  const pagoTotal = await pagoTotalExigido(clienteId);
  const montoSena = await calcularSena(turno.precio, pagoTotal);

  // Si el turno está ocupado, la restricción de la BD lanza el error (RF004)
  return protegerSuperposicion(() =>
    prisma.reserva.create({
      data: {
        canchaId,
        clienteId,
        inicio: turno.inicio,
        fin: turno.fin,
        estado: 'RETENIDA',
        precio: turno.precio,
        montoSena,
        pagoTotalRequerido: pagoTotal,
        retenidaHasta: sumarMinutos(new Date(), pol.retencionMinutos),
      },
      include: incluirCancha,
    }),
  );
}

// Lo que el cliente ya pagó, neto de reembolsos (los pendientes también se descuentan)
export async function totalPagado(reservaId: number, db: Db = prisma) {
  const pagos = await db.pago.findMany({ where: { reservaId } });
  let total = 0;
  for (const p of pagos) {
    if ((p.tipo === 'SENA' || p.tipo === 'SALDO') && p.estado === 'APROBADO') total += p.monto;
    if (p.tipo === 'REEMBOLSO' && p.estado !== 'RECHAZADO') total -= p.monto;
  }
  return total;
}

// Registra un reembolso en el mismo medio con que se pagó la seña.
// Si Mercado Pago lo rechaza queda "PENDIENTE" para resolverlo a mano.
export async function reembolsarReserva(reserva: Reserva, monto: number, db: Db = prisma) {
  const sena = await db.pago.findFirst({
    where: { reservaId: reserva.id, tipo: 'SENA', estado: 'APROBADO' },
    orderBy: { id: 'asc' },
  });
  const medio = sena?.medio ?? 'EFECTIVO';
  let ok = true;
  if (medio === 'MERCADO_PAGO' && sena?.externoId) ok = await reembolsar(sena.externoId, monto);
  await db.pago.create({
    data: { reservaId: reserva.id, tipo: 'REEMBOLSO', medio, estado: ok ? 'APROBADO' : 'PENDIENTE', monto },
  });
  if (!ok) console.log(`[AVISO] Reembolso pendiente de la reserva ${reserva.id}: gestionarlo a mano`);
}

// RF007: cancela. Con 12 h o más de anticipación se reembolsa la seña.
// reembolsoTotal = true fuerza el reembolso (bloqueos de cancha o excepción del encargado).
export async function cancelarReserva(reserva: Reserva, reembolsoTotal = false, db: Db = prisma) {
  if (!['RETENIDA', 'RESERVADA', 'SENADA'].includes(reserva.estado)) {
    throw new ErrorHttp(409, `No se puede cancelar una reserva en estado ${reserva.estado}`);
  }
  const pol = await getPolitica();
  const horasAntes = (reserva.inicio.getTime() - Date.now()) / 3600000;
  const aTiempo = horasAntes >= pol.horasCancelacion;
  const pagado = await totalPagado(reserva.id, db);

  let reembolsado = 0;
  if (pagado > 0 && (aTiempo || reembolsoTotal)) {
    await reembolsarReserva(reserva, pagado, db);
    reembolsado = pagado;
  }
  const actualizada = await db.reserva.update({
    where: { id: reserva.id },
    data: { estado: 'CANCELADA', retenidaHasta: null },
  });

  let mensaje = 'Reserva cancelada.';
  if (reembolsado > 0) mensaje += ` Se reembolsan $${reembolsado}.`;
  else if (pagado > 0) mensaje += ` Faltaban menos de ${pol.horasCancelacion} h: la seña no es reembolsable.`;
  return { reserva: actualizada, reembolsado, mensaje };
}

// Mueve una reserva a otro turno del mismo tipo de cancha (reprogramar / modificar).
// Mantiene el precio original. La restricción de la BD evita superposiciones.
export async function moverReserva(
  reserva: Reserva,
  destino: { canchaId: number; fecha: string; hora: string },
  marcarReprogramada: boolean,
  db: Db = prisma,
) {
  const actual = await db.cancha.findUniqueOrThrow({ where: { id: reserva.canchaId } });
  const turno = await buscarTurno(destino.canchaId, destino.fecha, destino.hora);
  if (turno.cancha.deporte !== actual.deporte) {
    throw new ErrorHttp(422, 'Solo se puede mover a una cancha del mismo tipo de deporte');
  }
  if (turno.cancha.id === reserva.canchaId && turno.inicio.getTime() === reserva.inicio.getTime()) {
    throw new ErrorHttp(400, 'Elegí un turno distinto al actual');
  }
  validarVentana(turno.inicio, turno.fin);
  await verificarSinBloqueo(turno.cancha.id, turno.inicio, turno.fin, db);

  return protegerSuperposicion(() =>
    db.reserva.update({
      where: { id: reserva.id },
      data: {
        canchaId: turno.cancha.id,
        inicio: turno.inicio,
        fin: turno.fin,
        reprogramada: marcarReprogramada ? true : reserva.reprogramada,
      },
      include: incluirCancha,
    }),
  );
}

// RF008: el cliente reprograma una sola vez y con 12 h o más de anticipación, sin costo
export async function reprogramarComoCliente(
  reservaId: number,
  clienteId: number,
  destino: { canchaId?: number; fecha: string; hora: string },
) {
  const reserva = await buscarReservaDeCliente(reservaId, clienteId);
  if (!['RESERVADA', 'SENADA'].includes(reserva.estado)) {
    throw new ErrorHttp(409, `No se puede reprogramar una reserva en estado ${reserva.estado}`);
  }
  if (reserva.reprogramada) throw new ErrorHttp(409, 'Esta reserva ya fue reprogramada una vez');

  const pol = await getPolitica();
  const horasAntes = (reserva.inicio.getTime() - Date.now()) / 3600000;
  if (horasAntes < pol.horasCancelacion) {
    throw new ErrorHttp(409, `Solo se puede reprogramar con ${pol.horasCancelacion} h o más de anticipación`);
  }
  const actualizada = await moverReserva(reserva, { ...destino, canchaId: destino.canchaId ?? reserva.canchaId }, true);
  notificar(await prisma.usuario.findUniqueOrThrow({ where: { id: clienteId } }), `Tu reserva ${reserva.id} fue reprogramada.`);
  return actualizada;
}

// Busca una reserva y verifica que sea del cliente (si no, responde 404 para no dar pistas)
export async function buscarReservaDeCliente(reservaId: number, clienteId: number) {
  const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } });
  if (!reserva || reserva.clienteId !== clienteId) throw new ErrorHttp(404, 'Reserva no encontrada');
  return reserva;
}

export async function buscarReserva(reservaId: number) {
  const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } });
  if (!reserva) throw new ErrorHttp(404, 'Reserva no encontrada');
  return reserva;
}
