// Manejo de errores: todo error termina acá y sale como JSON { error: "mensaje" }
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// Error "esperado" con su código HTTP. Ej: throw new ErrorHttp(404, 'No existe')
export class ErrorHttp extends Error {
  constructor(public estado: number, mensaje: string, public extra: object = {}) {
    super(mensaje);
  }
}

// ¿El error viene de la restricción de exclusión de PostgreSQL (turno superpuesto)?
export function esSuperposicion(err: unknown): boolean {
  const texto = String((err as any)?.message ?? '') + JSON.stringify((err as any)?.meta ?? {});
  return texto.includes('23P01') || texto.includes('Reserva_sin_superposicion');
}

export function rutaNoEncontrada(req: Request, res: Response) {
  res.status(404).json({ error: `No existe la ruta ${req.method} ${req.path}` });
}

export function manejarErrores(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    const detalles = err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message }));
    return res.status(400).json({ error: 'Datos inválidos', detalles });
  }
  if (err instanceof ErrorHttp) {
    return res.status(err.estado).json({ error: err.message, ...err.extra });
  }
  if (esSuperposicion(err)) {
    return res.status(409).json({ error: 'Turno no disponible: otra reserva ocupa ese horario' });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
