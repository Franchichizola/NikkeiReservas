// Operación de recepción: carga manual, check-in, cobro del saldo y ausencias (RF012, RF013, RF014)
import { MedioPago, Usuario } from '@prisma/client';
import { prisma } from '../db';
import { ErrorHttp } from '../middleware/errores';
import { getPolitica } from './politica';
import { notificar } from './notificaciones';
import { verificarCajaAbierta } from './caja';
import {
  buscarTurno, calcularSena, contarAusencias, incluirCancha, pagoTotalExigido, protegerSuperposicion,
  totalPagado, validarVentana, verificarSinBloqueo,
} from './reservas';

// Busca clientes por nombre, apellido o teléfono
export function buscarClientes(texto: string) {
  return prisma.usuario.findMany({
    where: {
      rol: 'CLIENTE',
      OR: [
        { nombre: { contains: texto, mode: 'insensitive' } },
        { apellido: { contains: texto, mode: 'insensitive' } },
        { telefono: { contains: texto } },
      ],
    },
    select: { id: true, nombre: true, apellido: true, telefono: true, email: true },
    take: 20,
  });
}

type DatosManual = {
  canchaId: number;
  fecha: string;
  hora: string;
  clienteId?: number;
  cliente?: { nombre: string; apellido?: string; telefono: string };
  sena?: { medio: Exclude<MedioPago, 'MERCADO_PAGO'>; monto: number };
};

// RF012: el personal carga una reserva de alguien que llamó o se presentó
export async function cargarReservaManual(d: DatosManual) {
  const turno = await buscarTurno(d.canchaId, d.fecha, d.hora);
  validarVentana(turno.inicio, turno.fin, true);
  await verificarSinBloqueo(d.canchaId, turno.inicio, turno.fin);
  if (d.sena) await verificarCajaAbierta();

  // Cliente existente, o cuenta simplificada (sin email ni contraseña)
  let cliente: Usuario;
  if (d.clienteId) {
    const existente = await prisma.usuario.findUnique({ where: { id: d.clienteId } });
    if (!existente || existente.rol !== 'CLIENTE') throw new ErrorHttp(404, 'Cliente no encontrado');
    cliente = existente;
  } else {
    cliente = await prisma.usuario.create({ data: { ...d.cliente!, rol: 'CLIENTE' } });
  }

  // Si el cliente tiene 3 ausencias en 60 días debe pagar el total por adelantado
  const pagoTotal = await pagoTotalExigido(cliente.id);
  const montoSena = await calcularSena(turno.precio, pagoTotal);
  if (pagoTotal && (!d.sena || d.sena.monto < turno.precio)) {
    throw new ErrorHttp(422, `El cliente tiene ${await contarAusencias(cliente.id)} ausencias recientes: debe pagar el total ($${turno.precio}) por adelantado`);
  }
  if (d.sena && (d.sena.monto < montoSena || d.sena.monto > turno.precio)) {
    throw new ErrorHttp(422, `La seña debe estar entre $${montoSena} y $${turno.precio}`);
  }

  const reserva = await protegerSuperposicion(() =>
    prisma.reserva.create({
      data: {
        canchaId: d.canchaId,
        clienteId: cliente.id,
        inicio: turno.inicio,
        fin: turno.fin,
        estado: d.sena ? 'SENADA' : 'RESERVADA',
        precio: turno.precio,
        montoSena,
        pagoTotalRequerido: pagoTotal,
        pagos: d.sena ? { create: { tipo: 'SENA', medio: d.sena.medio, estado: 'APROBADO', monto: d.sena.monto } } : undefined,
      },
      include: { ...incluirCancha, pagos: true },
    }),
  );
  notificar(cliente, `Reserva ${reserva.id} confirmada para el ${d.fecha} a las ${d.hora}.`);
  return reserva;
}

// Check-in: el cliente llegó, el turno pasa a EN_JUEGO
export async function hacerCheckIn(reservaId: number) {
  const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } });
  if (!reserva) throw new ErrorHttp(404, 'Reserva no encontrada');
  if (!['RESERVADA', 'SENADA'].includes(reserva.estado)) {
    throw new ErrorHttp(409, `No se puede hacer check-in de una reserva en estado ${reserva.estado}`);
  }
  return prisma.reserva.update({ where: { id: reservaId }, data: { estado: 'EN_JUEGO' } });
}

// RF013: cobra el saldo (precio - lo ya pagado), finaliza la reserva y devuelve el comprobante
export async function cobrarSaldo(reservaId: number, medio: MedioPago) {
  const reserva = await prisma.reserva.findUnique({ where: { id: reservaId }, include: incluirCancha });
  if (!reserva) throw new ErrorHttp(404, 'Reserva no encontrada');
  if (reserva.estado !== 'EN_JUEGO') throw new ErrorHttp(409, 'Primero hay que hacer el check-in del turno');
  await verificarCajaAbierta();

  const yaPagado = await totalPagado(reserva.id);
  const saldo = Math.max(reserva.precio - yaPagado, 0);
  if (saldo > 0) {
    await prisma.pago.create({ data: { reservaId, tipo: 'SALDO', medio, estado: 'APROBADO', monto: saldo } });
  }
  await prisma.reserva.update({ where: { id: reservaId }, data: { estado: 'FINALIZADA' } });

  return {
    comprobante: {
      codigoReserva: reserva.id,
      cancha: reserva.cancha.nombre,
      inicio: reserva.inicio,
      precioTotal: reserva.precio,
      pagadoAntes: yaPagado,
      saldoCobrado: saldo,
      medio,
      emitido: new Date(),
    },
  };
}

// RF014: marca ausente pasados 15 minutos del inicio. La seña se retiene y la cancha se libera.
export async function marcarAusente(reservaId: number) {
  const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } });
  if (!reserva) throw new ErrorHttp(404, 'Reserva no encontrada');
  if (!['RESERVADA', 'SENADA'].includes(reserva.estado)) {
    throw new ErrorHttp(409, `No se puede marcar ausente una reserva en estado ${reserva.estado}`);
  }
  const pol = await getPolitica();
  const permitidoDesde = reserva.inicio.getTime() + pol.minutosAusencia * 60000;
  if (Date.now() < permitidoDesde) {
    throw new ErrorHttp(409, `Solo se puede marcar ausente pasados ${pol.minutosAusencia} minutos del inicio del turno`);
  }
  await prisma.reserva.update({ where: { id: reservaId }, data: { estado: 'AUSENTE' } });

  const ausencias = await contarAusencias(reserva.clienteId);
  return { mensaje: 'Turno marcado como ausente. Se retiene la seña', ausenciasEnPeriodo: ausencias, exigePagoTotal: ausencias >= pol.ausenciasMax };
}
