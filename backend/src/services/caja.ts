// Cierre de caja diario simple (RF017)
import { prisma } from '../db';
import { ErrorHttp } from '../middleware/errores';
import { fechaLocal, rangoDelDia } from './fechas';

// Después de cerrar la caja del día no se pueden registrar más cobros
export async function verificarCajaAbierta() {
  const cierre = await prisma.cierreCaja.findUnique({ where: { fecha: fechaLocal(new Date()) } });
  if (cierre) throw new ErrorHttp(409, 'La caja de hoy ya está cerrada. Un administrador debe reabrirla');
}

// Calcula lo cobrado y reembolsado del día, por medio de pago
export async function resumenDelDia(fecha: string) {
  const { inicio, fin } = rangoDelDia(fecha);
  const pagos = await prisma.pago.findMany({ where: { estado: 'APROBADO', creadoEn: { gte: inicio, lt: fin } } });

  const porMedio: Record<string, { cobrado: number; reembolsado: number }> = {};
  let totalCobrado = 0;
  let totalReembolsos = 0;
  for (const p of pagos) {
    porMedio[p.medio] ??= { cobrado: 0, reembolsado: 0 };
    if (p.tipo === 'REEMBOLSO') {
      porMedio[p.medio].reembolsado += p.monto;
      totalReembolsos += p.monto;
    } else {
      porMedio[p.medio].cobrado += p.monto;
      totalCobrado += p.monto;
    }
  }
  const efectivo = porMedio['EFECTIVO'] ?? { cobrado: 0, reembolsado: 0 };

  // Turnos del día que ya empezaron y siguen sin resolverse (sin cobro ni ausente)
  const pendientes = await prisma.reserva.findMany({
    where: { inicio: { gte: inicio, lt: fin }, estado: { in: ['RESERVADA', 'SENADA', 'EN_JUEGO'] } },
  });
  const sinResolver = pendientes.filter((r) => r.inicio < new Date()).map((r) => ({ reservaId: r.id, estado: r.estado, inicio: r.inicio }));

  const cierre = await prisma.cierreCaja.findUnique({ where: { fecha } });
  return {
    fecha,
    porMedio,
    totalCobrado,
    totalReembolsos,
    neto: totalCobrado - totalReembolsos,
    efectivoEsperado: efectivo.cobrado - efectivo.reembolsado,
    turnosSinResolver: sinResolver,
    cierre,
  };
}

export async function cerrarCaja(fecha: string, efectivoContado: number, observacion?: string) {
  if (fecha > fechaLocal(new Date())) throw new ErrorHttp(400, 'No se puede cerrar la caja de un día futuro');
  const resumen = await resumenDelDia(fecha);
  if (resumen.cierre) throw new ErrorHttp(409, 'Ese día ya tiene la caja cerrada');
  if (resumen.turnosSinResolver.length > 0) {
    throw new ErrorHttp(409, 'Hay turnos del día sin cobro o sin marcar como ausentes. Resolvelos antes de cerrar', {
      turnosSinResolver: resumen.turnosSinResolver,
    });
  }
  const diferencia = efectivoContado - resumen.efectivoEsperado;
  if (diferencia !== 0 && !observacion) {
    throw new ErrorHttp(422, `Hay una diferencia de $${diferencia} en el efectivo: indicá una observación`);
  }
  return prisma.cierreCaja.create({
    data: {
      fecha,
      totalCobrado: resumen.totalCobrado,
      totalReembolsos: resumen.totalReembolsos,
      efectivoEsperado: resumen.efectivoEsperado,
      efectivoContado,
      diferencia,
      observacion,
    },
  });
}

// Solo el administrador (lo controla la ruta). TODO: registrar el motivo en una auditoría.
export async function reabrirCaja(fecha: string, motivo: string) {
  const cierre = await prisma.cierreCaja.findUnique({ where: { fecha } });
  if (!cierre) throw new ErrorHttp(404, 'Ese día no tiene la caja cerrada');
  await prisma.cierreCaja.delete({ where: { fecha } });
  console.log(`[CAJA] Se reabrió el día ${fecha}. Motivo: ${motivo}`);
}
