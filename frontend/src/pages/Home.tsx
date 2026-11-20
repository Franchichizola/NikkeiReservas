import { ArrowRight, CalendarDays, Clock, CreditCard, MapPin, Trophy, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { panelInicial } from '../utils';

// Datos fijos del complejo (salen del SRS). No se piden al backend porque no cambian seguido.
const DEPORTES_INFO = [
  { nombre: 'Fútbol 5', canchas: 4, turno: '60 min' },
  { nombre: 'Fútbol 7', canchas: 2, turno: '60 min' },
  { nombre: 'Pádel', canchas: 3, turno: '90 min' },
];

const PASOS = [
  { Icono: Trophy, titulo: '1. Elegí la cancha', texto: 'Mirá las canchas de fútbol 5, fútbol 7 y pádel.' },
  { Icono: CalendarDays, titulo: '2. Elegí día y horario', texto: 'Ves en el momento qué turnos están libres y cuánto cuestan.' },
  { Icono: CreditCard, titulo: '3. Pagá la seña', texto: 'Con el 30 % del valor confirmás tu turno. El resto se paga en el complejo.' },
];

// Página principal: la puede ver cualquiera, sin iniciar sesión
export default function Home() {
  const { usuario } = useAuth();

  return (
    <div className="space-y-10">
      {/* Portada con las líneas de una cancha: círculo central y línea del medio */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pasto-800 to-pasto-600 px-6 py-14 text-center text-white shadow-lg">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
        <div className="relative">
          <h1 className="text-5xl font-extrabold tracking-wide sm:text-6xl">Nikkei</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-pasto-50">Complejo de canchas de fútbol 5, fútbol 7 y pádel. Reservá tu turno online en un minuto.</p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {usuario ? (
              <Link to={panelInicial(usuario.rol)} className="inline-flex items-center gap-2 rounded-lg bg-amarilla px-5 py-3 font-bold text-pasto-900 hover:brightness-95">
                {usuario.rol === 'CLIENTE' ? 'Reservar una cancha' : 'Ir a mi panel'}
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-amarilla px-5 py-3 font-bold text-pasto-900 hover:brightness-95">
                  Ingresar y reservar
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link to="/registro" className="inline-flex items-center gap-2 rounded-lg border border-white/60 px-5 py-3 font-semibold hover:bg-white/10">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Datos del complejo */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="tarjeta flex items-center gap-3">
          <Clock className="h-6 w-6 shrink-0 text-pasto-600" />
          <p className="text-sm">
            <span className="block font-semibold">Todos los días</span>De 9 a 24 hs
          </p>
        </div>
        <div className="tarjeta flex items-center gap-3">
          <MapPin className="h-6 w-6 shrink-0 text-pasto-600" />
          <p className="text-sm">
            <span className="block font-semibold">Chacabuco 1260</span>San Telmo, CABA
          </p>
        </div>
        <div className="tarjeta flex items-center gap-3">
          <Wallet className="h-6 w-6 shrink-0 text-pasto-600" />
          <p className="text-sm">
            <span className="block font-semibold">Cancelá sin perder la seña</span>Hasta 12 horas antes
          </p>
        </div>
      </section>

      {/* Canchas */}
      <section>
        <h2 className="mb-3 text-xl font-bold text-pasto-900">Nuestras canchas</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {DEPORTES_INFO.map((d) => (
            <div key={d.nombre} className="tarjeta border-t-4 border-t-pasto-600">
              <Trophy className="mb-2 h-6 w-6 text-pasto-600" />
              <p className="text-lg font-semibold">{d.nombre}</p>
              <p className="text-sm text-gray-600">
                {d.canchas} canchas · turnos de {d.turno}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo reservar */}
      <section>
        <h2 className="mb-3 text-xl font-bold text-pasto-900">Reservar es fácil</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {PASOS.map(({ Icono, titulo, texto }) => (
            <div key={titulo} className="tarjeta">
              <Icono className="mb-2 h-6 w-6 text-pasto-600" />
              <p className="font-semibold">{titulo}</p>
              <p className="text-sm text-gray-600">{texto}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
