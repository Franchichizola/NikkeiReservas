// Cálculo de turnos y precios. Lo usan la disponibilidad y las reservas.
import { Cancha, EstadoReserva, Politica, Tarifa } from '@prisma/client';
import { prisma } from '../db';
import { aFecha, sumarMinutos } from './fechas';

// Estados en los que una reserva ocupa la cancha (igual a la restricción de la BD)
export const ESTADOS_ACTIVOS: EstadoReserva[] = ['RETENIDA', 'RESERVADA', 'SENADA', 'EN_JUEGO', 'FINALIZADA'];

// Lista los turnos de una cancha en un día: 9:00, 10:00... (o 9:00, 10:30... en pádel)
export function turnosDelDia(cancha: Cancha, fecha: string, pol: Politica) {
  const turnos = [];
  const base = aFecha(fecha);
  for (let min = pol.horaApertura * 60; min + cancha.duracionMin <= pol.horaCierre * 60; min += cancha.duracionMin) {
    const inicio = sumarMinutos(base, min);
    const hh = String(Math.floor(min / 60)).padStart(2, '0');
    const mm = String(min % 60).padStart(2, '0');
    turnos.push({ hora: `${hh}:${mm}`, horaEntera: Math.floor(min / 60), inicio, fin: sumarMinutos(inicio, cancha.duracionMin) });
  }
  return turnos;
}

// Busca la tarifa que corresponde a la hora de inicio. Devuelve null si no hay.
export function precioDelTurno(tarifas: Tarifa[], horaEntera: number): number | null {
  const tarifa = tarifas.find((t) => horaEntera >= t.horaDesde && horaEntera < t.horaHasta);
  return tarifa ? tarifa.precio : null;
}

// Libera las reservas retenidas cuyo tiempo (10 min) ya venció.
// Se llama desde un temporizador y también antes de consultar o reservar.
export async function liberarRetenidasVencidas() {
  await prisma.reserva.updateMany({
    where: { estado: 'RETENIDA', retenidaHasta: { lt: new Date() } },
    data: { estado: 'EXPIRADA' },
  });
}
