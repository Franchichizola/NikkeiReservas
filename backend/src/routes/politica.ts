// Parámetros de política: seña, plazo de cancelación, etc. (RF016). Solo administrador.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { autenticar, requiereRol } from '../middleware/auth';
import { ErrorHttp } from '../middleware/errores';
import { getPolitica } from '../services/politica';

export const rutasPolitica = Router();
rutasPolitica.use(autenticar, requiereRol('ADMINISTRADOR'));

rutasPolitica.get('/', async (req, res) => {
  res.json(await getPolitica());
});

rutasPolitica.patch('/', async (req, res) => {
  const d = z.object({
    senaPorcentaje: z.number().int().min(1).max(100),
    horasCancelacion: z.number().int().min(0).max(72),
    retencionMinutos: z.number().int().min(1).max(60),
    minutosAusencia: z.number().int().min(1).max(120),
    ausenciasMax: z.number().int().min(1).max(20),
    ausenciasDias: z.number().int().min(1).max(365),
    horaApertura: z.number().int().min(0).max(23),
    horaCierre: z.number().int().min(1).max(24),
  }).partial().parse(req.body);

  const actual = await getPolitica();
  const apertura = d.horaApertura ?? actual.horaApertura;
  const cierre = d.horaCierre ?? actual.horaCierre;
  if (apertura >= cierre) throw new ErrorHttp(422, 'La hora de apertura debe ser menor que la de cierre');
  res.json(await prisma.politica.update({ where: { id: 1 }, data: d }));
});
