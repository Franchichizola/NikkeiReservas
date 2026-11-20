// Reservas del cliente: reservar, pagar seña, cancelar, reprogramar (RF003, RF005, RF007, RF008)
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { autenticar, soloCliente } from '../middleware/auth';
import { leerId, fechaSchema, horaSchema } from '../middleware/validar';
import { iniciarPagoSena } from '../services/pagos';
import {
  buscarReservaDeCliente, cancelarReserva, incluirCancha, reprogramarComoCliente, retenerTurno,
} from '../services/reservas';
import { notificar } from '../services/notificaciones';

export const rutasReservas = Router();
rutasReservas.use(autenticar, soloCliente); // todas las rutas de este archivo son de clientes

const turnoSchema = z.object({ canchaId: z.number().int().positive(), fecha: fechaSchema, hora: horaSchema });

// Crea la reserva y retiene el turno 10 minutos
rutasReservas.post('/', async (req, res) => {
  const { canchaId, fecha, hora } = turnoSchema.parse(req.body);
  const reserva = await retenerTurno(req.usuario!.id, canchaId, fecha, hora);
  res.status(201).json({ reserva, mensaje: 'Turno retenido. Pagá la seña antes de que venza la retención' });
});

// Historial de reservas del cliente (futuras y pasadas)
rutasReservas.get('/mias', async (req, res) => {
  const reservas = await prisma.reserva.findMany({
    where: { clienteId: req.usuario!.id },
    include: { ...incluirCancha, pagos: true },
    orderBy: { inicio: 'desc' },
  });
  res.json(reservas);
});

// Inicia el pago de la seña (simulado). Devuelve el externoId que usa el webhook.
rutasReservas.post('/:id/pagar-sena', async (req, res) => {
  res.status(201).json(await iniciarPagoSena(leerId(req), req.usuario!.id));
});

rutasReservas.post('/:id/cancelar', async (req, res) => {
  const reserva = await buscarReservaDeCliente(leerId(req), req.usuario!.id);
  const resultado = await cancelarReserva(reserva);
  notificar(req.usuario!, resultado.mensaje);
  res.json(resultado);
});

rutasReservas.post('/:id/reprogramar', async (req, res) => {
  const destino = z.object({ canchaId: z.number().int().positive().optional(), fecha: fechaSchema, hora: horaSchema }).parse(req.body);
  res.json(await reprogramarComoCliente(leerId(req), req.usuario!.id, destino));
});
