// Sesión simple: guarda quién inició sesión y lo comparte con todas las pantallas (contexto de React).
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { apiLogin, apiMe, apiRegistro, borrarToken, DatosRegistro, guardarToken, leerToken, Rol, Usuario } from './api';

// Un rol más alto puede hacer todo lo del rol más bajo (igual que en el backend)
const NIVEL: Record<Rol, number> = { CLIENTE: 0, RECEPCIONISTA: 1, ENCARGADO: 2, ADMINISTRADOR: 3 };

// ¿Este usuario puede usar lo que pide "minimo"?
// - Lo de clientes es solo para clientes.
// - Lo del personal es para ese rol o uno superior (los clientes nunca).
export function puedeUsar(usuario: Usuario | null, minimo: Rol): boolean {
  if (!usuario) return false;
  if (minimo === 'CLIENTE') return usuario.rol === 'CLIENTE';
  return usuario.rol !== 'CLIENTE' && NIVEL[usuario.rol] >= NIVEL[minimo];
}

interface ContextoSesion {
  usuario: Usuario | null;
  cargando: boolean; // true mientras se verifica la sesión guardada al abrir la página
  entrar: (email: string, password: string) => Promise<Usuario>;
  registrarse: (datos: DatosRegistro) => Promise<Usuario>;
  salir: () => void;
}

const Sesion = createContext<ContextoSesion | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir la página: si quedó un token guardado, se pregunta al backend quién es
  useEffect(() => {
    if (!leerToken()) {
      setCargando(false);
      return;
    }
    apiMe()
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  async function entrar(email: string, password: string) {
    const r = await apiLogin(email, password);
    guardarToken(r.token);
    setUsuario(r.usuario);
    return r.usuario;
  }

  async function registrarse(datos: DatosRegistro) {
    const r = await apiRegistro(datos);
    guardarToken(r.token);
    setUsuario(r.usuario);
    return r.usuario;
  }

  function salir() {
    borrarToken();
    setUsuario(null);
  }

  return <Sesion.Provider value={{ usuario, cargando, entrar, registrarse, salir }}>{children}</Sesion.Provider>;
}

// Uso en cualquier pantalla: const { usuario, salir } = useAuth();
export function useAuth(): ContextoSesion {
  const contexto = useContext(Sesion);
  if (!contexto) throw new Error('useAuth se tiene que usar dentro de <AuthProvider>');
  return contexto;
}
