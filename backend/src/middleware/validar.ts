// Pequeñas ayudas para validar datos de entrada
import { Request } from 'express';
import { z } from 'zod';
import { ErrorHttp } from './errores';
import { aFecha } from '../services/fechas';

// Lee el :id de la URL y verifica que sea un entero
export function leerId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorHttp(400, 'El id de la URL no es válido');
  return id;
}

// "2026-11-25"
export const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usá el formato AAAA-MM-DD')
  .refine((f) => !Number.isNaN(aFecha(f).getTime()), 'La fecha no existe');

// "18:30"
export const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Usá el formato HH:MM');

// Fecha y hora completas con zona horaria. Ej: "2026-11-25T18:00:00-03:00"
export const fechaHoraSchema = z.string().datetime({ offset: true, message: 'Usá el formato 2026-11-25T18:00:00-03:00' });

export const medioPersonalSchema = z.enum(['EFECTIVO', 'TRANSFERENCIA', 'QR', 'TARJETA']);
