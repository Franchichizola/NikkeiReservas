// Autenticación (JWT) y control de roles
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Rol, Usuario } from '@prisma/client';
import { prisma } from '../db';
import { JWT_SECRET } from '../config';
import { ErrorHttp } from './errores';

// Le agrega "usuario" al request para que las rutas sepan quién llama
declare global {
  namespace Express {
    interface Request {
      usuario?: Usuario;
    }
  }
}

// Nivel de cada rol: un nivel mayor puede hacer todo lo del menor
const nivel: Record<Rol, number> = { CLIENTE: 0, RECEPCIONISTA: 1, ENCARGADO: 2, ADMINISTRADOR: 3 };

// Verifica el token "Authorization: Bearer xxx" y carga el usuario desde la BD.
// Se consulta la BD en cada pedido para que un usuario desactivado quede bloqueado enseguida.
export async function autenticar(req: Request, res: Response, next: NextFunction) {
  const cabecera = req.headers.authorization ?? '';
  if (!cabecera.startsWith('Bearer ')) throw new ErrorHttp(401, 'Falta el token. Iniciá sesión primero');

  let id: number;
  try {
    id = (jwt.verify(cabecera.slice(7), JWT_SECRET) as { id: number }).id;
  } catch {
    throw new ErrorHttp(401, 'Token inválido o vencido');
  }

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario || !usuario.activo) throw new ErrorHttp(401, 'Usuario inexistente o desactivado');
  req.usuario = usuario;
  next();
}

// Solo personal con ese rol o uno superior (recepcionista < encargado < administrador)
export function requiereRol(minimo: 'RECEPCIONISTA' | 'ENCARGADO' | 'ADMINISTRADOR') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (nivel[req.usuario!.rol] < nivel[minimo]) {
      throw new ErrorHttp(403, 'No tenés permiso para esta acción');
    }
    next();
  };
}

// Solo clientes (las rutas de "mis reservas")
export function soloCliente(req: Request, res: Response, next: NextFunction) {
  if (req.usuario!.rol !== 'CLIENTE') throw new ErrorHttp(403, 'Esta acción es solo para clientes');
  next();
}

// ¿El usuario tiene al menos ese rol? (para chequeos dentro de una ruta)
export function tieneRol(usuario: Usuario, minimo: Rol) {
  return nivel[usuario.rol] >= nivel[minimo];
}
