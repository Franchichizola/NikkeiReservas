// Panel de recepción: grilla, carga manual, check-in, cobro y ausencias (RF011 a RF014)
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { autenticar, requiereRol, tieneRol } from '../middleware/auth';
import { ErrorHttp } from '../middleware/errores';
import { fechaSchema, horaSchema, leerId, medioPersonalSchema } from '../middleware/validar';
import { armarGrilla } from '../services/disponibilidad';
import { aFecha, fechaLocal } from '../services/fechas';
import { buscarClientes, cargarReservaManual, cobrarSaldo, hacerCheckIn, marcarAusente } from '../services/recepcion';
import { buscarReserva, cancelarReserva, incluirCancha, moverReserva } from '../services/reservas';
import { notificar } from '../services/notificaciones';

export const rutasRecepcion = Router();
rutasRecepcion.use(autenticar, requiereRol('RECEPCIONISTA'));

// Grilla diaria (dias=1) o semanal (dias=7) con el estado real de cada turno
rutasRecepcion.get('/grilla', async (req, res) => {
  const q = z.object({
    fecha: fechaSchema,
    dias: z.coerce.number().int().min(1).max(7).default(1),
    deporte: z.enum(['FUTBOL5', 'FUTBOL7', 'PADEL']).optional(),
  }).parse(req.query);

  const dias = [];
  for (let i = 0; i < q.dias; i++) {
    const fecha = fechaLocal(new Date(aFecha(q.fecha).getTime() + i * 86400000));
    dias.push({ fecha, canchas: await armarGrilla(fecha, { deporte: q.deporte }, true) });
  }
  res.json({ dias });
});

rutasRecepcion.get('/clientes', async (req, res) => {
  const { q } = z.object({ q: z.string().trim().min(2, 'Escribí al menos 2 letras') }).parse(req.query);
  res.json(await buscarClientes(q));
});

// Carga una reserva. Usá clienteId, o "cliente" para crear uno rápido.
const manualSchema = z.object({
  canchaId: z.number().int().positive(),
  fecha: fechaSchema,
  hora: horaSchema,
  clienteId: z.number().int().positive().optional(),
  cliente: z.object({ nombre: z.string().trim().min(1), apellido: z.string().trim().optional(), telefono: z.string().trim().min(6) }).optional(),
  sena: z.object({ medio: medioPersonalSchema, monto: z.number().int().positive() }).optional(),
}).refine((d) => d.clienteId || d.cliente, { message: 'Indicá clienteId o los datos de "cliente"' });

rutasRecepcion.post('/reservas', async (req, res) => {
  res.status(201).json(await cargarReservaManual(manualSchema.parse(req.body)));
});

// Modifica horario o cancha (mismo tipo de deporte)
rutasRecepcion.patch('/reservas/:id', async (req, res) => {
  const destino = z.object({ canchaId: z.number().int().positive().optional(), fecha: fechaSchema, hora: horaSchema }).parse(req.body);
  const reserva = await buscarReserva(leerId(req));
  if (!['RESERVADA', 'SENADA'].includes(reserva.estado)) {
    throw new ErrorHttp(409, `No se puede modificar una reserva en estado ${reserva.estado}`);
  }
  const actualizada = await moverReserva(reserva, { ...destino, canchaId: destino.canchaId ?? reserva.canchaId }, false);
  const cliente = await prisma.usuario.findUniqueOrThrow({ where: { id: reserva.clienteId } });
  notificar(cliente, `Tu reserva ${reserva.id} se modificó al ${destino.fecha} ${destino.hora}.`);
  res.json(actualizada);
});

// Cancela aplicando la política. Solo el encargado puede exceptuarla (reembolso total) con un motivo.
rutasRecepcion.post('/reservas/:id/cancelar', async (req, res) => {
  const { exceptuar, motivo } = z.object({ exceptuar: z.boolean().default(false), motivo: z.string().trim().min(3).optional() }).parse(req.body ?? {});
  if (exceptuar) {
    if (!tieneRol(req.usuario!, 'ENCARGADO')) throw new ErrorHttp(403, 'Solo el encargado puede exceptuar la política');
    if (!motivo) throw new ErrorHttp(400, 'Indicá el motivo de la excepción');
    console.log(`[EXCEPCIÓN] ${req.usuario!.email} exceptuó la política en la reserva ${req.params.id}: ${motivo}`);
  }
  const reserva = await buscarReserva(leerId(req));
  const resultado = await cancelarReserva(reserva, exceptuar);
  notificar(await prisma.usuario.findUniqueOrThrow({ where: { id: reserva.clienteId } }), resultado.mensaje);
  res.json(resultado);
});

rutasRecepcion.post('/reservas/:id/checkin', async (req, res) => {
  res.json(await hacerCheckIn(leerId(req)));
});

rutasRecepcion.post('/reservas/:id/cobrar-saldo', async (req, res) => {
  const { medio } = z.object({ medio: medioPersonalSchema }).parse(req.body);
  res.json(await cobrarSaldo(leerId(req), medio));
});

rutasRecepcion.post('/reservas/:id/ausente', async (req, res) => {
  res.json(await marcarAusente(leerId(req)));
});

// Detalle de una reserva (con pagos)
rutasRecepcion.get('/reservas/:id', async (req, res) => {
  const reserva = await prisma.reserva.findUnique({
    where: { id: leerId(req) },
    include: { ...incluirCancha, pagos: true, cliente: { select: { id: true, nombre: true, apellido: true, telefono: true } } },
  });
  if (!reserva) throw new ErrorHttp(404, 'Reserva no encontrada');
  res.json(reserva);
});
