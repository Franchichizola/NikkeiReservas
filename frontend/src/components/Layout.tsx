import { Ban, Banknote, CalendarDays, CircleDot, ClipboardList, LogIn, LogOut, LucideIcon, Menu, Settings, UserPlus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Rol } from '../api';
import { puedeUsar, useAuth } from '../auth';
import { NOMBRE_ROL } from '../utils';
import Footer from './Footer';

// Todas las opciones del menú, con su ícono y el rol mínimo que necesita cada una.
// El menú muestra solo las que la persona logueada puede usar.
const OPCIONES: { ruta: string; texto: string; rol: Rol; Icono: LucideIcon }[] = [
  { ruta: '/reservar', texto: 'Reservar', rol: 'CLIENTE', Icono: CalendarDays },
  { ruta: '/mis-reservas', texto: 'Mis reservas', rol: 'CLIENTE', Icono: ClipboardList },
  { ruta: '/recepcion', texto: 'Recepción', rol: 'RECEPCIONISTA', Icono: Users },
  { ruta: '/bloqueos', texto: 'Bloqueos', rol: 'ENCARGADO', Icono: Ban },
  { ruta: '/caja', texto: 'Cierre de caja', rol: 'ENCARGADO', Icono: Banknote },
  { ruta: '/admin', texto: 'Administración', rol: 'ADMINISTRADOR', Icono: Settings },
];

export default function Layout() {
  const { usuario, salir } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false); // solo se usa en pantallas chicas

  const visibles = OPCIONES.filter((o) => puedeUsar(usuario, o.rol));

  function cerrarSesion() {
    salir();
    setMenuAbierto(false);
    navigate('/'); // vuelve a la página principal
  }

  // Estilo de cada link: resaltado si es la página actual
  function claseLink({ isActive }: { isActive: boolean }) {
    return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-pasto-600 text-white' : 'text-pasto-50 hover:bg-pasto-700'}`;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Franja amarilla abajo del header: como la tarjeta del árbitro */}
      <header className="border-b-4 border-amarilla bg-pasto-800 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          {/* El nombre del complejo lleva siempre a la página principal */}
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-wide" onClick={() => setMenuAbierto(false)}>
            <CircleDot className="h-6 w-6 text-amarilla" />
            Nikkei
          </Link>

          <button
            type="button"
            className="rounded-lg border border-pasto-600 p-2 md:hidden"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-expanded={menuAbierto}
            aria-label="Abrir o cerrar el menú"
          >
            {menuAbierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <nav className={`${menuAbierto ? 'flex' : 'hidden'} w-full flex-col gap-1 md:flex md:w-auto md:flex-row md:items-center`}>
            {usuario ? (
              <>
                {visibles.map(({ ruta, texto, Icono }) => (
                  <NavLink key={ruta} to={ruta} className={claseLink} onClick={() => setMenuAbierto(false)}>
                    <Icono className="h-4 w-4" />
                    {texto}
                  </NavLink>
                ))}
                <span className="px-3 py-2 text-xs text-pasto-200">
                  {usuario.nombre} · {NOMBRE_ROL[usuario.rol]}
                </span>
                <button type="button" onClick={cerrarSesion} className="flex items-center gap-2 rounded-lg border border-pasto-600 px-3 py-2 text-sm hover:bg-pasto-700">
                  <LogOut className="h-4 w-4" />
                  Salir
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={claseLink} onClick={() => setMenuAbierto(false)}>
                  <LogIn className="h-4 w-4" />
                  Ingresar
                </NavLink>
                <NavLink to="/registro" className={claseLink} onClick={() => setMenuAbierto(false)}>
                  <UserPlus className="h-4 w-4" />
                  Registrarse
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Acá se dibuja la pantalla que corresponda a la ruta */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
