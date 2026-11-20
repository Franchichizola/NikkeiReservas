// Grilla de turnos por cancha (RF002 y RF011)
import { Deporte } from '@prisma/client';
import { prisma } from '../db';
import { rangoDelDia } from './fechas';
import { getPolitica } from './politica';
import { ESTADOS_ACTIVOS, liberarRetenidasVencidas, precioDelTurno, turnosDelDia } from './turnos';

// paraPersonal = false: estados simples (LIBRE / OCUPADO / NO_DISPONIBLE) sin datos de clientes
// paraPersonal = true:  estado real de la reserva y datos del cliente
export async function armarGrilla(
  fecha: string,
  filtros: { deporte?: Deporte; canchaId?: number },
  paraPersonal: boolean,
) {
  await liberarRetenidasVencidas();
  const { inicio: inicioDia, fin: finDia } = rangoDelDia(fecha);
  const pol = await getPolitica();
  const tarifas = await prisma.tarifa.findMany();
  const canchas = await prisma.cancha.findMany({
    where: { activa: true, deporte: filtros.deporte, id: filtros.canchaId },
    orderBy: { id: 'asc' },
  });
  const ids = canchas.map((c) => c.id);

  // Reservas y bloqueos del día, para cruzarlos con los turnos
  const reservas = await prisma.reserva.findMany({
    where: {
      canchaId: { in: ids },
      inicio: { lt: finDia },
      fin: { gt: inicioDia },
      estado: { in: [...ESTADOS_ACTIVOS, 'AUSENTE'] },
    },
    include: { cliente: { select: { id: true, nombre: true, apellido: true, telefono: true } } },
  });
  const bloqueos = await prisma.bloqueo.findMany({
    where: { canchaId: { in: ids }, activo: true, inicio: { lt: finDia }, fin: { gt: inicioDia } },
  });

  const ahora = new Date();
  return canchas.map((cancha) => ({
    cancha: { id: cancha.id, nombre: cancha.nombre, deporte: cancha.deporte, duracionMin: cancha.duracionMin },
    turnos: turnosDelDia(cancha, fecha, pol).map((t) => {
      const solapadas = reservas.filter((r) => r.canchaId === cancha.id && r.inicio < t.fin && r.fin > t.inicio);
      const ocupante = solapadas.find((r) => r.estado !== 'AUSENTE'); // reserva que ocupa el turno
      const ausente = solapadas.find((r) => r.estado === 'AUSENTE');
      const bloqueado = bloqueos.some((b) => b.canchaId === cancha.id && b.inicio < t.fin && b.fin > t.inicio);
      const precio = precioDelTurno(tarifas.filter((x) => x.deporte === cancha.deporte), t.horaEntera);

      const base = { hora: t.hora, inicio: t.inicio, fin: t.fin, precio };
      if (!paraPersonal) {
        const estado = ocupante ? 'OCUPADO' : bloqueado || t.inicio <= ahora ? 'NO_DISPONIBLE' : 'LIBRE';
        return { ...base, estado };
      }
      const estado = ocupante ? ocupante.estado : bloqueado ? 'BLOQUEADO' : ausente ? 'AUSENTE' : 'LIBRE';
      const reserva = ocupante ?? ausente;
      return {
        ...base,
        estado,
        disponible: !ocupante && !bloqueado && t.fin > ahora, // se puede cargar una reserva
        reservaId: reserva?.id ?? null,
        cliente: reserva?.cliente ?? null,
      };
    }),
  }));
}
