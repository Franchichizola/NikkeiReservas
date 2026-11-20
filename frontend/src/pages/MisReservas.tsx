import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiMisReservas, Reserva } from '../api';
import { Cargando, MensajeError, MensajeOk } from '../components/Mensajes';
import TarjetaReserva from '../components/TarjetaReserva';
import { HORAS_CANCELACION, mensajeError } from '../utils';

// Pantalla 3: historial de reservas, cancelar y reprogramar
export default function MisReservas() {
  const [reservas, setReservas] = useState<Reserva[] | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    apiMisReservas()
      .then(setReservas)
      .catch((e) => setError(mensajeError(e)));
  }, [version]);

  // Cuando una tarjeta cancela o reprograma, se muestra el resultado y se recarga la lista
  function alCambiar(mensaje: string) {
    setAviso(mensaje);
    setVersion((v) => v + 1);
  }

  // "Próximas" = todavía activas; el resto es historial
  const activas = ['RETENIDA', 'RESERVADA', 'SENADA', 'EN_JUEGO'];
  const proximas = (reservas ?? []).filter((r) => activas.includes(r.estado) && new Date(r.fin).getTime() > Date.now());
  const historial = (reservas ?? []).filter((r) => !proximas.includes(r));

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-pasto-900"><ClipboardList className="h-6 w-6 text-pasto-600" /> Mis reservas</h1>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
        <p className="font-semibold">Reglas de cancelación y cambios</p>
        <ul className="ml-5 list-disc">
          <li>Si cancelás con {HORAS_CANCELACION} horas o más de anticipación, se te reembolsa la seña.</li>
          <li>Si faltan menos de {HORAS_CANCELACION} horas, la seña NO se reembolsa.</li>
          <li>Podés reprogramar una sola vez, con {HORAS_CANCELACION} horas o más de anticipación y al mismo deporte.</li>
        </ul>
      </div>

      <MensajeOk texto={aviso} />
      <MensajeError texto={error} />
      {reservas === null && !error && <Cargando texto="Cargando tus reservas..." />}

      {reservas !== null && reservas.length === 0 && (
        <p className="text-gray-600">
          Todavía no tenés reservas.{' '}
          <Link to="/reservar" className="font-medium text-pasto-700 underline">
            Reservá tu primer turno
          </Link>
        </p>
      )}

      {proximas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Próximas</h2>
          {proximas.map((r) => (
            <TarjetaReserva key={r.id} reserva={r} onCambio={alCambiar} />
          ))}
        </section>
      )}

      {historial.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Historial</h2>
          {historial.map((r) => (
            <TarjetaReserva key={r.id} reserva={r} onCambio={alCambiar} />
          ))}
        </section>
      )}
    </div>
  );
}
