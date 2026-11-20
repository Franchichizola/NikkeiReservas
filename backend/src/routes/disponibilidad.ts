// Disponibilidad pública por deporte, fecha y cancha (RF002). No requiere login.
import { Router } from 'express';
import { z } from 'zod';
import { DIAS_ANTICIPACION } from '../config';
import { ErrorHttp } from '../middleware/errores';
import { fechaSchema } from '../middleware/validar';
import { armarGrilla } from '../services/disponibilidad';
import { fechaLocal } from '../services/fechas';

export const rutasDisponibilidad = Router();

const consultaSchema = z.object({
  fecha: fechaSchema,
  deporte: z.enum(['FUTBOL5', 'FUTBOL7', 'PADEL']).optional(),
  canchaId: z.coerce.number().int().positive().optional(),
});

rutasDisponibilidad.get('/', async (req, res) => {
  const { fecha, deporte, canchaId } = consultaSchema.parse(req.query);
  const hoy = fechaLocal(new Date());
  const limite = fechaLocal(new Date(Date.now() + DIAS_ANTICIPACION * 86400000));
  if (fecha < hoy || fecha > limite) {
    throw new ErrorHttp(400, `Solo se puede consultar desde hoy (${hoy}) hasta ${limite}`);
  }
  res.json({ fecha, canchas: await armarGrilla(fecha, { deporte, canchaId }, false) });
});
