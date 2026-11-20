// Parámetros de política (seña, plazos, horario). Es una sola fila en la BD.
import { prisma } from '../db';

export function getPolitica() {
  return prisma.politica.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
