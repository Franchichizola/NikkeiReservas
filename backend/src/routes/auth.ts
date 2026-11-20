// Registro, login y "quién soy" (RF001)
import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../middleware/auth';
import { datosPublicos, iniciarSesion, registrarCliente } from '../services/auth';

export const rutasAuth = Router();

const registroSchema = z.object({
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  email: z.string().trim().email(),
  telefono: z.string().trim().min(6),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  aceptaTerminos: z.literal(true, { errorMap: () => ({ message: 'Tenés que aceptar la política de privacidad' }) }),
});

rutasAuth.post('/registro', async (req, res) => {
  const datos = registroSchema.parse(req.body);
  res.status(201).json(await registrarCliente(datos));
});

rutasAuth.post('/login', async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  res.json(await iniciarSesion(email, password));
});

rutasAuth.get('/me', autenticar, (req, res) => {
  res.json(datosPublicos(req.usuario!));
});
