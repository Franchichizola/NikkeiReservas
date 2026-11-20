// Cierre de caja diario (RF017). Encargado y administrador.
import { Router } from 'express';
import { z } from 'zod';
import { autenticar, requiereRol } from '../middleware/auth';
import { fechaSchema } from '../middleware/validar';
import { cerrarCaja, reabrirCaja, resumenDelDia } from '../services/caja';

export const rutasCaja = Router();
rutasCaja.use(autenticar, requiereRol('ENCARGADO'));

// Resumen del día antes de cerrar
rutasCaja.get('/resumen', async (req, res) => {
  const { fecha } = z.object({ fecha: fechaSchema }).parse(req.query);
  res.json(await resumenDelDia(fecha));
});

rutasCaja.post('/cierre', async (req, res) => {
  const d = z.object({
    fecha: fechaSchema,
    efectivoContado: z.number().int().min(0),
    observacion: z.string().trim().min(3).optional(),
  }).parse(req.body);
  res.status(201).json(await cerrarCaja(d.fecha, d.efectivoContado, d.observacion));
});

// Solo el administrador puede reabrir un día cerrado
rutasCaja.post('/reabrir', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const d = z.object({ fecha: fechaSchema, motivo: z.string().trim().min(3) }).parse(req.body);
  await reabrirCaja(d.fecha, d.motivo);
  res.json({ mensaje: `Caja del ${d.fecha} reabierta` });
});
