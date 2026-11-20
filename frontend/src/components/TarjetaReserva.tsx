import { useState } from 'react';
import { CalendarDays, XCircle } from 'lucide-react';
import { apiCancelar, Reserva } from '../api';
import { COLOR_ESTADO, fechaHora, HORAS_CANCELACION, horasHasta, mensajeError, NOMBRE_DEPORTE, NOMBRE_ESTADO, pesos, totalPagado } from '../utils';
import { MensajeError } from './Mensajes';
import Reprogramar from './Reprogramar';

// Una reserva del cliente con sus botones de cancelar y reprogramar.
// Props: la reserva y qué hacer cuando algo cambió (para que la lista se vuelva a pedir).
interface Props {
  reserva: Reserva;
  onCambio: (mensaje: string) => void;
}

export default function TarjetaReserva({ reserva, onCambio }: Props) {
  const [modo, setModo] = useState<'ninguno' | 'cancelar' | 'reprogramar'>('ninguno');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  const horas = horasHasta(reserva.inicio);
  const puedeCancelar = ['RETENIDA', 'RESERVADA', 'SENADA'].includes(reserva.estado) && horas > 0;
  const esReprogramable = ['RESERVADA', 'SENADA'].includes(reserva.estado) && horas > 0;
  const puedeReprogramar = esReprogramable && !reserva.reprogramada && horas >= HORAS_CANCELACION;
  const pagado = totalPagado(reserva.pagos);
  const aTiempo = horas >= HORAS_CANCELACION; // regla de 12 horas

  async function cancelar() {
    setOcupado(true);
    setError('');
    try {
      const r = await apiCancelar(reserva.id);
      onCambio(r.mensaje); // el backend dice si se reembolsó o no
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <article className="tarjeta">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{reserva.cancha?.nombre ?? 'Cancha'}</p>
          <p className="text-sm text-gray-600">
            {fechaHora(reserva.inicio)} hs{reserva.cancha?.deporte ? ` · ${NOMBRE_DEPORTE[reserva.cancha.deporte]}` : ''}
          </p>
        </div>
        <span className={`rounded border px-2 py-1 text-xs font-medium ${COLOR_ESTADO[reserva.estado] ?? ''}`}>{NOMBRE_ESTADO[reserva.estado] ?? reserva.estado}</span>
      </div>

      <p className="mt-2 text-sm text-gray-700">
        Valor: {pesos(reserva.precio)} · Pagado: {pesos(pagado)}
        {reserva.reprogramada && ' · Ya reprogramada'}
      </p>

      {/* Botones: solo aparecen si la reserva todavía se puede modificar */}
      {puedeCancelar && modo === 'ninguno' && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secundario" onClick={() => setModo('cancelar')}>
            <XCircle className="mr-1 h-4 w-4" /> Cancelar reserva
          </button>
          {esReprogramable && (
            <button type="button" className="btn-secundario" disabled={!puedeReprogramar} onClick={() => setModo('reprogramar')}>
              <CalendarDays className="mr-1 h-4 w-4" /> Reprogramar
            </button>
          )}
          {esReprogramable && !puedeReprogramar && (
            <span className="text-xs text-gray-500">
              {reserva.reprogramada ? 'Ya se reprogramó una vez.' : `Solo se puede reprogramar con ${HORAS_CANCELACION} h o más de anticipación.`}
            </span>
          )}
        </div>
      )}

      {/* Aviso claro de la regla de 12 horas antes de confirmar la cancelación */}
      {modo === 'cancelar' && (
        <div className="mt-3 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-semibold">Regla de cancelación: {HORAS_CANCELACION} horas de anticipación</p>
          {aTiempo ? (
            <p>
              Faltan {Math.floor(horas)} h para tu turno, estás a tiempo.
              {pagado > 0 ? ` Te reembolsamos la seña (${pesos(pagado)}).` : ' No tenés pagos para reembolsar.'}
            </p>
          ) : (
            <p className="font-medium text-red-700">
              Faltan menos de {HORAS_CANCELACION} h para tu turno.
              {pagado > 0 ? ` Si cancelás ahora NO se reembolsa la seña (${pesos(pagado)}).` : ' Se cancela la reserva.'}
            </p>
          )}
          <MensajeError texto={error} />
          <div className="flex gap-2">
            <button type="button" className="btn-peligro" disabled={ocupado} onClick={cancelar}>
              {ocupado ? 'Cancelando...' : 'Sí, cancelar la reserva'}
            </button>
            <button type="button" className="btn-secundario" onClick={() => setModo('ninguno')}>
              Volver
            </button>
          </div>
        </div>
      )}

      {modo === 'reprogramar' && (
        <Reprogramar
          reserva={reserva}
          onListo={(mensaje) => {
            setModo('ninguno');
            onCambio(mensaje);
          }}
          onCerrar={() => setModo('ninguno')}
        />
      )}
    </article>
  );
}
