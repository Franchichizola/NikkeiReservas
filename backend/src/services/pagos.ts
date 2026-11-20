// Pago de la seña (RF005). Habla con Mercado Pago solo a través de services/mercadoPago.ts
import { prisma } from '../db';
import { ErrorHttp } from '../middleware/errores';
import { crearCobroSena } from './mercadoPago';
import { notificar } from './notificaciones';
import { buscarReservaDeCliente, protegerSuperposicion, reembolsarReserva } from './reservas';

// Paso 1: el cliente pide pagar la seña. Se crea un pago PENDIENTE y se devuelve el "link de pago".
export async function iniciarPagoSena(reservaId: number, clienteId: number) {
  const reserva = await buscarReservaDeCliente(reservaId, clienteId);
  if (reserva.estado !== 'RETENIDA' || !reserva.retenidaHasta || reserva.retenidaHasta < new Date()) {
    throw new ErrorHttp(409, 'La reserva ya no está retenida (pasaron los 10 minutos o ya fue pagada)');
  }

  // Si ya había un pago pendiente se reutiliza, para no cobrar dos veces
  const existente = await prisma.pago.findFirst({ where: { reservaId, tipo: 'SENA', estado: 'PENDIENTE' } });
  if (existente) {
    return { pagoId: existente.id, externoId: existente.externoId, monto: existente.monto, mensaje: 'Ya tenés un pago pendiente' };
  }

  const cobro = await crearCobroSena({ reservaId, monto: reserva.montoSena, descripcion: `Seña reserva ${reservaId}` });
  const pago = await prisma.pago.create({
    data: { reservaId, tipo: 'SENA', medio: 'MERCADO_PAGO', estado: 'PENDIENTE', monto: reserva.montoSena, externoId: cobro.externoId },
  });
  return { pagoId: pago.id, externoId: cobro.externoId, urlPago: cobro.urlPago, monto: pago.monto };
}

// Paso 2: Mercado Pago avisa el resultado (webhook). Es seguro recibirlo más de una vez.
export async function procesarResultadoPago(externoId: string, estado: 'approved' | 'rejected' | 'pending') {
  const pago = await prisma.pago.findUnique({ where: { externoId }, include: { reserva: true } });
  if (!pago) throw new ErrorHttp(404, 'No existe un pago con ese externoId');
  if (pago.estado !== 'PENDIENTE') return { mensaje: `El pago ya estaba procesado (${pago.estado})` };
  if (estado === 'pending') return { mensaje: 'El pago sigue pendiente' };

  if (estado === 'rejected') {
    await prisma.pago.update({ where: { id: pago.id }, data: { estado: 'RECHAZADO' } });
    return { mensaje: 'Pago rechazado. El cliente puede reintentar mientras dure la retención' };
  }

  // Aprobado: se registra el pago y se confirma la reserva
  await prisma.pago.update({ where: { id: pago.id }, data: { estado: 'APROBADO' } });
  const reserva = pago.reserva;
  let confirmada = false;
  if (reserva.estado === 'RETENIDA') {
    await prisma.reserva.update({ where: { id: reserva.id }, data: { estado: 'SENADA', retenidaHasta: null } });
    confirmada = true;
  } else if (reserva.estado === 'EXPIRADA') {
    // Pagó tarde: se intenta recuperar el turno si nadie lo tomó
    try {
      await protegerSuperposicion(() =>
        prisma.reserva.update({ where: { id: reserva.id }, data: { estado: 'SENADA', retenidaHasta: null } }),
      );
      confirmada = true;
    } catch {
      confirmada = false;
    }
  }

  const cliente = await prisma.usuario.findUniqueOrThrow({ where: { id: reserva.clienteId } });
  if (!confirmada) {
    // El turno ya no está disponible: se devuelve el dinero
    await reembolsarReserva(reserva, pago.monto);
    notificar(cliente, `Tu pago llegó tarde y el turno ya no estaba disponible. Te reembolsamos $${pago.monto}.`);
    return { mensaje: 'Pago aprobado pero el turno ya no estaba disponible: se reembolsó' };
  }
  notificar(cliente, `Reserva ${reserva.id} confirmada. Seña pagada: $${pago.monto}.`);
  return { mensaje: 'Pago aprobado: reserva confirmada (SENADA)' };
}
