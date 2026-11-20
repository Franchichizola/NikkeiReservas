import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { puedeUsar, useAuth } from '../auth';
import { Rol } from '../api';
import { panelInicial } from '../utils';
import { Cargando } from './Mensajes';

// Envuelve una pantalla y la deja pasar solo si la persona tiene el rol pedido.
// Uso: <RutaProtegida rol="ENCARGADO"><Caja /></RutaProtegida>
// (el backend igual vuelve a controlar los permisos: esto es solo para no mostrar pantallas que no sirven)
export default function RutaProtegida({ rol, children }: { rol: Rol; children: ReactNode }) {
  const { usuario, cargando } = useAuth();

  if (cargando) return <Cargando texto="Verificando sesión..." />;
  if (!usuario) return <Navigate to="/login" replace />; // sin sesión: al login
  if (!puedeUsar(usuario, rol)) return <Navigate to={panelInicial(usuario.rol)} replace />; // sin permiso: a su pantalla principal

  return <>{children}</>;
}
