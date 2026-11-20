// Administración de canchas (RF016). Solo administrador. Las canchas no se borran, se desactivan.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { autenticar, requiereRol } from '../middleware/auth';
import { ErrorHttp } from '../middleware/errores';
import { leerId } from '../middleware/validar';

export const rutasCanchas = Router();
rutasCanchas.use(autenticar, requiereRol('ADMINISTRADOR'));

const deporteSchema = z.enum(['FUTBOL5', 'FUTBOL7', 'PADEL']);

rutasCanchas.get('/', async (req, res) => {
  res.json(await prisma.cancha.findMany({ orderBy: { id: 'asc' } }));
});

rutasCanchas.post('/', async (req, res) => {
  const d = z.object({
    nombre: z.string().trim().min(2),
    deporte: deporteSchema,
    duracionMin: z.number().int().min(30).max(180).optional(),
  }).parse(req.body);
  // Si no se indica, 90 minutos en pádel y 60 en fútbol (RB-01)
  const duracionMin = d.duracionMin ?? (d.deporte === 'PADEL' ? 90 : 60);
  res.status(201).json(await prisma.cancha.create({ data: { nombre: d.nombre, deporte: d.deporte, duracionMin } }));
});

rutasCanchas.patch('/:id', async (req, res) => {
  const id = leerId(req);
  const d = z.object({
    nombre: z.string().trim().min(2).optional(),
    duracionMin: z.number().int().min(30).max(180).optional(),
    activa: z.boolean().optional(),
  }).parse(req.body);

  // Para desactivar una cancha con reservas futuras hay que usar bloqueos
  if (d.activa === false) {
    const futuras = await prisma.reserva.count({
      where: { canchaId: id, fin: { gt: new Date() }, estado: { in: ['RETENIDA', 'RESERVADA', 'SENADA', 'EN_JUEGO'] } },
    });
    if (futuras > 0) throw new ErrorHttp(409, `La cancha tiene ${futuras} reservas futuras. Gestionalas con un bloqueo antes de desactivarla`);
  }
  const existe = await prisma.cancha.findUnique({ where: { id } });
  if (!existe) throw new ErrorHttp(404, 'Cancha no encontrada');
  res.json(await prisma.cancha.update({ where: { id }, data: d }));
});
