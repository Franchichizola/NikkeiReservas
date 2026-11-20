// Registro y login (RF001)
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Usuario } from '@prisma/client';
import { prisma } from '../db';
import { JWT_EXPIRA, JWT_SECRET } from '../config';
import { ErrorHttp } from '../middleware/errores';

// Devuelve el usuario sin el hash de la contraseña
export function datosPublicos(u: Usuario) {
  const { passwordHash, ...resto } = u;
  return resto;
}

function firmarToken(u: Usuario) {
  return jwt.sign({ id: u.id, rol: u.rol }, JWT_SECRET, { expiresIn: JWT_EXPIRA as jwt.SignOptions['expiresIn'] });
}

export async function registrarCliente(d: {
  nombre: string; apellido: string; email: string; telefono: string; password: string;
}) {
  // TODO: verificación del email con enlace y recuperar contraseña (por ahora la cuenta queda activa)
  const passwordHash = await bcrypt.hash(d.password, 10);
  const usuario = await prisma.usuario.create({
    data: {
      nombre: d.nombre,
      apellido: d.apellido,
      email: d.email.toLowerCase(),
      telefono: d.telefono,
      passwordHash,
      rol: 'CLIENTE',
      consentimientoEn: new Date(), // Ley 25.326: se registra cuándo aceptó
    },
  });
  return { token: firmarToken(usuario), usuario: datosPublicos(usuario) };
}

export async function iniciarSesion(email: string, password: string) {
  // TODO: bloquear 15 minutos tras 5 intentos fallidos
  const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
  const ok = usuario?.passwordHash && usuario.activo && (await bcrypt.compare(password, usuario.passwordHash));
  if (!usuario || !ok) throw new ErrorHttp(401, 'Email o contraseña incorrectos'); // mensaje genérico a propósito
  return { token: firmarToken(usuario), usuario: datosPublicos(usuario) };
}
