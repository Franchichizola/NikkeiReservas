import { CircleDot, Clock, Mail, MapPin, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { panelInicial } from '../utils';

// Pie de página: datos de contacto del complejo y accesos rápidos.
// Los datos salen del SRS (sección 2.1).
export default function Footer() {
  const { usuario } = useAuth();

  return (
    <footer className="mt-10 border-t-4 border-amarilla bg-pasto-900 text-pasto-50">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 text-xl font-extrabold tracking-wide text-white">
            <CircleDot className="h-6 w-6 text-amarilla" />
            Nikkei
          </p>
          <p className="mt-2 text-sm text-pasto-200">Complejo de canchas de fútbol 5, fútbol 7 y pádel.</p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">Contacto</p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-amarilla" /> Chacabuco 1260, CABA
          </p>
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-amarilla" /> Todos los días de 9 a 24 hs
          </p>
          <p className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 shrink-0 text-amarilla" /> WhatsApp +54 9 11 5555-0000
          </p>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-amarilla" /> info@Nikkei.com.ar
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">Accesos</p>
          <Link to="/" className="block hover:text-white hover:underline">
            Inicio
          </Link>
          {usuario ? (
            <Link to={panelInicial(usuario.rol)} className="block hover:text-white hover:underline">
              {usuario.rol === 'CLIENTE' ? 'Reservar una cancha' : 'Mi panel'}
            </Link>
          ) : (
            <>
              <Link to="/login" className="block hover:text-white hover:underline">
                Ingresar
              </Link>
              <Link to="/registro" className="block hover:text-white hover:underline">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-pasto-800 px-4 py-3 text-center text-xs text-pasto-200">
        © {new Date().getFullYear()} Complejo Nikkei
      </div>
    </footer>
  );
}
