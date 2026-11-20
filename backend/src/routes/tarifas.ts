// Administración de tarifas por deporte y franja horaria (RF016). Solo administrador.
// Las reservas ya hechas conservan el precio con el que se tomaron.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { autenticar, requiereRol } from '../middleware/auth';
import { ErrorHttp } from '../middleware/errores';
import { leerId } from '../middleware/validar';

export const rutasTarifas = Router();
rutasTarifas.use(autenticar, requiereRol('ADMINISTRADOR'));

const tarifaSchema = z.object({
  deporte: z.enum(['FUTBOL5', 'FUTBOL7', 'PADEL']),
  horaDesde: z.number().int().min(0).max(23),
  horaHasta: z.number().int().min(1).max(24),
  precio: z.number().int().positive('El precio debe ser mayor a cero'),
});

// Las franjas de un mismo deporte no pueden superponerse
async function verificarFranja(t: { deporte: any; horaDesde: number; horaHasta: number }, ignorarId?: number) {
  if (t.horaDesde >= t.horaHasta) throw new ErrorHttp(422, '"horaDesde" debe ser menor que "horaHasta"');
  const otras = await prisma.tarifa.findMany({ where: { deporte: t.deporte, id: { not: ignorarId } } });
  const choca = otras.find((o) => t.horaDesde < o.horaHasta && t.horaHasta > o.horaDesde);
  if (choca) throw new ErrorHttp(422, `La franja se superpone con la tarifa ${choca.id} (${choca.horaDesde} a ${choca.horaHasta} hs)`);
}

rutasTarifas.get('/', async (req, res) => {
  res.json(await prisma.tarifa.findMany({ orderBy: [{ deporte: 'asc' }, { horaDesde: 'asc' }] }));
});

rutasTarifas.post('/', async (req, res) => {
  const d = tarifaSchema.parse(req.body);
  await verificarFranja(d);
  res.status(201).json(await prisma.tarifa.create({ data: d }));
});

rutasTarifas.patch('/:id', async (req, res) => {
  const id = leerId(req);
  const actual = await prisma.tarifa.findUnique({ where: { id } });
  if (!actual) throw new ErrorHttp(404, 'Tarifa no encontrada');
  const d = tarifaSchema.partial().parse(req.body);
  await verificarFranja({ ...actual, ...d }, id);
  res.json(await prisma.tarifa.update({ where: { id }, data: d }));
});
// TODO: tarifas programadas con fecha de vigencia futura
