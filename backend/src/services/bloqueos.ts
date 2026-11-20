// Bloqueo de canchas y gestión de las reservas afectadas (RF015)
import { prisma } from '../db';
import { ErrorHttp } from '../middleware/errores';
import { notificar } from './notificaciones';
import { cancelarReserva, moverReserva } from './reservas';

export type Accion = { reservaId: number; accion: 'CANCELAR' | 'REPROGRAMAR'; canchaId?: number; fecha?: string; hora?: string };

// Reservas que quedarían afectadas por un bloqueo
export function reservasAfectadas(canchaIds: number[], desde: Date, hasta: Date) {
  return prisma.reserva.findMany({
    where: { canchaId: { in: canchaIds }, inicio: { lt: hasta }, fin: { gt: desde }, estado: { in: ['RETENIDA', 'RESERVADA', 'SENADA'] } },
    include: { cancha: { select: { id: true, nombre: true } }, cliente: { select: { id: true, nombre: true, apellido: true, telefono: true } } },
    orderBy: { inicio: 'asc' },
  });
}

export async function crearBloqueo(d: { canchaIds: number[]; desde: Date; hasta: Date; motivo: string; acciones: Accion[] }) {
  if (d.hasta <= d.desde) throw new ErrorHttp(400, '"hasta" debe ser posterior a "desde"');
  const canchas = await prisma.cancha.findMany({ where: { id: { in: d.canchaIds } } });
  if (canchas.length !== new Set(d.canchaIds).size) throw new ErrorHttp(404, 'Alguna de las canchas no existe');

  // Cada reserva afectada necesita una decisión (las "retenidas" sin pagar se cancelan solas)
  const afectadas = await reservasAfectadas(d.canchaIds, d.desde, d.hasta);
  const sinAccion = afectadas.filter((r) => r.estado !== 'RETENIDA' && !d.acciones.some((a) => a.reservaId === r.id));
  if (sinAccion.length > 0) {
    throw new ErrorHttp(409, 'Hay reservas afectadas sin decidir: indicá CANCELAR o REPROGRAMAR para cada una', {
      reservasSinAccion: sinAccion.map((r) => ({ reservaId: r.id, cancha: r.cancha.nombre, inicio: r.inicio, cliente: r.cliente })),
    });
  }

  // Todo junto en una transacción: si algo falla, no se aplica nada
  const avisos: { cliente: (typeof afectadas)[0]['cliente']; mensaje: string }[] = [];
  const bloqueos = await prisma.$transaction(async (tx) => {
    // Primero se crean los bloqueos, así "mover" ya no puede elegir un turno dentro del bloqueo
    const creados = [];
    for (const canchaId of d.canchaIds) {
      creados.push(await tx.bloqueo.create({ data: { canchaId, inicio: d.desde, fin: d.hasta, motivo: d.motivo } }));
    }
    for (const r of afectadas) {
      const accion = d.acciones.find((a) => a.reservaId === r.id);
      if (!accion || accion.accion === 'CANCELAR' || r.estado === 'RETENIDA') {
        const res = await cancelarReserva(r, true, tx); // RB-10: reembolso del 100 %
        avisos.push({ cliente: r.cliente, mensaje: `Tu reserva ${r.id} fue cancelada por ${d.motivo}. ${res.mensaje}` });
      } else {
        if (!accion.fecha || !accion.hora) throw new ErrorHttp(400, `Falta fecha y hora para reprogramar la reserva ${r.id}`);
        await moverReserva(r, { canchaId: accion.canchaId ?? r.canchaId, fecha: accion.fecha, hora: accion.hora }, false, tx);
        avisos.push({ cliente: r.cliente, mensaje: `Tu reserva ${r.id} se movió al ${accion.fecha} ${accion.hora} por ${d.motivo}.` });
      }
    }
    return creados;
  });

  for (const a of avisos) notificar(a.cliente, a.mensaje);
  return { bloqueos, reservasGestionadas: afectadas.length };
}
