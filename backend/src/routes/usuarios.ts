// Usuarios del personal y roles (RF019). Solo administrador.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db';
import { autenticar, requiereRol } from '../middleware/auth';
import { ErrorHttp } from '../middleware/errores';
import { leerId } from '../middleware/validar';
import { datosPublicos } from '../services/auth';

export const rutasUsuarios = Router();
rutasUsuarios.use(autenticar, requiereRol('ADMINISTRADOR'));

const rolSchema = z.enum(['CLIENTE', 'RECEPCIONISTA', 'ENCARGADO', 'ADMINISTRADOR']);

rutasUsuarios.get('/', async (req, res) => {
  const rol = rolSchema.optional().parse(req.query.rol);
  const usuarios = await prisma.usuario.findMany({ where: { rol }, orderBy: { id: 'asc' } });
  res.json(usuarios.map(datosPublicos));
});

// El administrador define la contraseña inicial.
// TODO: enviar una invitación por email para que la persona elija su contraseña.
rutasUsuarios.post('/', async (req, res) => {
  const d = z.object({
    nombre: z.string().trim().min(1),
    apellido: z.string().trim().min(1),
    email: z.string().trim().email(),
    telefono: z.string().trim().optional(),
    password: z.string().min(8),
    rol: z.enum(['RECEPCIONISTA', 'ENCARGADO', 'ADMINISTRADOR']),
  }).parse(req.body);
  const { password, ...resto } = d;
  const usuario = await prisma.usuario.create({
    data: { ...resto, email: d.email.toLowerCase(), passwordHash: await bcrypt.hash(password, 10) },
  });
  res.status(201).json(datosPublicos(usuario));
});

// Cambia el rol o activa/desactiva a un usuario
rutasUsuarios.patch('/:id', async (req, res) => {
  const id = leerId(req);
  const d = z.object({ rol: rolSchema.optional(), activo: z.boolean().optional() }).parse(req.body);
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new ErrorHttp(404, 'Usuario no encontrado');

  // No se puede dejar al sistema sin administradores
  const dejaDeSerAdmin = usuario.rol === 'ADMINISTRADOR' && (d.rol && d.rol !== 'ADMINISTRADOR' || d.activo === false);
  if (dejaDeSerAdmin) {
    const admins = await prisma.usuario.count({ where: { rol: 'ADMINISTRADOR', activo: true } });
    if (admins <= 1) throw new ErrorHttp(409, 'No se puede quitar al último administrador');
  }
  res.json(datosPublicos(await prisma.usuario.update({ where: { id }, data: d })));
});
