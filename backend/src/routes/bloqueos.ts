// Bloqueo de canchas por mantenimiento, lluvia o eventos (RF015). Desde encargado.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { autenticar, requiereRol } from '../middleware/auth';
import { ErrorHttp } from '../middleware/errores';
import { fechaHoraSchema, fechaSchema, horaSchema, leerId } from '../middleware/validar';
import { crearBloqueo, reservasAfectadas } from '../services/bloqueos';

export const rutasBloqueos = Router();
rutasBloqueos.use(autenticar, requiereRol('ENCARGADO'));

// Bloqueos vigentes o futuros
rutasBloqueos.get('/', async (req, res) => {
  res.json(await prisma.bloqueo.findMany({
    where: { activo: true, fin: { gt: new Date() } },
    include: { cancha: { select: { id: true, nombre: true } } },
    orderBy: { inicio: 'asc' },
  }));
});

// Vista previa: qué reservas quedarían afectadas. Ej: ?canchaIds=1,2&desde=...&hasta=...
rutasBloqueos.get('/afectadas', async (req, res) => {
  const q = z.object({ canchaIds: z.string().min(1), desde: fechaHoraSchema, hasta: fechaHoraSchema }).parse(req.query);
  const ids = q.canchaIds.split(',').map(Number);
  if (ids.some((n) => !Number.isInteger(n) || n <= 0)) throw new ErrorHttp(400, 'canchaIds debe ser una lista de números: 1,2,3');
  res.json(await reservasAfectadas(ids, new Date(q.desde), new Date(q.hasta)));
});

const bloqueoSchema = z.object({
  canchaIds: z.array(z.number().int().positive()).min(1),
  desde: fechaHoraSchema,
  hasta: fechaHoraSchema,
  motivo: z.string().trim().min(3),
  // Qué hacer con cada reserva afectada
  acciones: z.array(z.object({
    reservaId: z.number().int().positive(),
    accion: z.enum(['CANCELAR', 'REPROGRAMAR']),
    canchaId: z.number().int().positive().optional(),
    fecha: fechaSchema.optional(),
    hora: horaSchema.optional(),
  })).default([]),
});

// TODO: bloqueos recurrentes (ej. mantenimiento semanal)
rutasBloqueos.post('/', async (req, res) => {
  const d = bloqueoSchema.parse(req.body);
  res.status(201).json(await crearBloqueo({ ...d, desde: new Date(d.desde), hasta: new Date(d.hasta) }));
});

// Levanta un bloqueo antes de tiempo: los turnos vuelven a estar libres
rutasBloqueos.delete('/:id', async (req, res) => {
  const id = leerId(req);
  const bloqueo = await prisma.bloqueo.findUnique({ where: { id } });
  if (!bloqueo || !bloqueo.activo) throw new ErrorHttp(404, 'Bloqueo no encontrado');
  await prisma.bloqueo.update({ where: { id }, data: { activo: false } });
  res.json({ mensaje: 'Bloqueo levantado' });
});
