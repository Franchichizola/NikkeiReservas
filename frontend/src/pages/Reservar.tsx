import { CalendarDays, CheckCircle2, ChevronRight, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiCancelar, apiDisponibilidad, apiPagarSena, apiSimularWebhook, CanchaConTurnos, Deporte, Reserva } from '../api';
import Contador from '../components/Contador';
import { Cargando, MensajeError, MensajeOk } from '../components/Mensajes';
import ModalCancha from '../components/ModalCancha';
import { DEPORTES, fechaHora, hoy, mensajeError, NOMBRE_DEPORTE, pesos } from '../utils';

type CanchaBasica = CanchaConTurnos['cancha'];

// Pantalla 2: elegir deporte y cancha. Al tocar una cancha se abre un pop up con las fechas y los turnos.
// Después se reserva y se paga la seña (simulada).
export default function Reservar() {
  const [deporte, setDeporte] = useState<Deporte>('FUTBOL5');
  const [lista, setLista] = useState<CanchaBasica[] | null>(null); // canchas del deporte; null = cargando
  const [errorLista, setErrorLista] = useState('');
  const [canchaElegida, setCanchaElegida] = useState<CanchaBasica | null>(null); // la que abrió el pop up
  const [reserva, setReserva] = useState<Reserva | null>(null); // turno retenido esperando la seña
  const [estadoPago, setEstadoPago] = useState<'esperando' | 'pagando' | 'pagada' | 'vencida'>('esperando');
  const [ocupado, setOcupado] = useState(false); // evita apretar dos veces un botón
  const [error, setError] = useState('');

  // Pide las canchas del deporte elegido. Se usa la consulta de hoy solo para obtener la lista de canchas.
  useEffect(() => {
    let cancelado = false; // si cambia el deporte antes de que llegue la respuesta, se ignora la vieja
    setLista(null);
    setErrorLista('');
    apiDisponibilidad(hoy(), deporte)
      .then((r) => {
        if (!cancelado) setLista(r.canchas.map((c) => c.cancha));
      })
      .catch((e) => {
        if (!cancelado) setErrorLista(mensajeError(e));
      });
    return () => {
      cancelado = true;
    };
  }, [deporte]);

  // El pop up avisa que el turno quedó retenido: se pasa a la pantalla de pago
  function alReservar(r: Reserva) {
    setCanchaElegida(null);
    setReserva(r);
    setEstadoPago('esperando');
    setError('');
  }

  // "Paga" la seña. Es simulado: se pide el pago y enseguida se manda el aviso de aprobado.
  async function pagarSena() {
    if (!reserva) return;
    setEstadoPago('pagando');
    setError('');
    try {
      const pago = await apiPagarSena(reserva.id);
      await apiSimularWebhook(pago.externoId, 'approved');
      setEstadoPago('pagada');
    } catch (e) {
      setError(mensajeError(e));
      setEstadoPago('esperando');
    }
  }

  // Si la persona se arrepiente, libera el turno retenido
  async function liberarTurno() {
    if (!reserva) return;
    setOcupado(true);
    try {
      await apiCancelar(reserva.id);
      volverAElegir();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }

  function volverAElegir() {
    setReserva(null);
    setEstadoPago('esperando');
  }

  // ---------- Vista: ya hay un turno retenido ----------
  if (reserva) {
    const nombreCancha = reserva.cancha?.nombre ?? 'Cancha';

    if (estadoPago === 'pagada') {
      return (
        <div className="mx-auto max-w-md space-y-4">
          <MensajeOk texto="¡Reserva confirmada! Ya pagaste la seña." />
          <div className="tarjeta">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5 text-pasto-600" /> {nombreCancha}
            </p>
            <p>{fechaHora(reserva.inicio)} hs</p>
            <p className="text-sm text-gray-600">Saldo a pagar en el complejo: {pesos(reserva.precio - reserva.montoSena)}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/mis-reservas" className="btn-primario">
              Ver mis reservas
            </Link>
            <button type="button" className="btn-secundario" onClick={volverAElegir}>
              Reservar otro turno
            </button>
          </div>
        </div>
      );
    }

    if (estadoPago === 'vencida') {
      return (
        <div className="mx-auto max-w-md space-y-4">
          <MensajeError texto="Se terminó el tiempo para pagar la seña y el turno volvió a quedar libre." />
          <button type="button" className="btn-primario" onClick={volverAElegir}>
            Elegir otro turno
          </button>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-pasto-900">Pagá la seña para confirmar</h1>
        <div className="tarjeta space-y-4">
          <div>
            <p className="font-semibold">{nombreCancha}</p>
            <p>{fechaHora(reserva.inicio)} hs</p>
            <p className="text-sm text-gray-600">Valor del turno: {pesos(reserva.precio)}</p>
          </div>
          {reserva.pagoTotalRequerido && (
            <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">Por ausencias anteriores, tenés que pagar el total del turno por adelantado.</p>
          )}
          {reserva.retenidaHasta && <Contador hasta={reserva.retenidaHasta} onVencido={() => setEstadoPago((p) => (p === 'pagada' ? p : 'vencida'))} />}
          <p className="text-center text-lg font-semibold">
            {reserva.pagoTotalRequerido ? 'Total a pagar' : 'Seña a pagar'}: {pesos(reserva.montoSena)}
          </p>
          <MensajeError texto={error} />
          <button type="button" className="btn-primario w-full" disabled={estadoPago === 'pagando'} onClick={pagarSena}>
            {estadoPago === 'pagando' ? 'Procesando pago...' : 'Pagar seña (simulado)'}
          </button>
          <button type="button" className="btn-secundario w-full" disabled={ocupado || estadoPago === 'pagando'} onClick={liberarTurno}>
            No quiero este turno
          </button>
          <p className="text-center text-xs text-gray-500">Pago simulado: no se cobra dinero real.</p>
        </div>
      </div>
    );
  }

  // ---------- Vista: elegir deporte y cancha ----------
  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-pasto-900">
        <CalendarDays className="h-6 w-6 text-pasto-600" /> Reservar una cancha
      </h1>

      <div className="flex flex-wrap gap-2">
        {DEPORTES.map((d) => (
          <button key={d} type="button" onClick={() => setDeporte(d)} className={d === deporte ? 'btn-primario' : 'btn-secundario'}>
            {NOMBRE_DEPORTE[d]}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-600">Elegí una cancha para ver las fechas y los turnos disponibles.</p>

      <MensajeError texto={error} />
      <MensajeError texto={errorLista} />
      {lista === null && !errorLista && <Cargando texto="Buscando canchas..." />}
      {lista !== null && lista.length === 0 && <p className="text-gray-600">No hay canchas para mostrar de este deporte.</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista?.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCanchaElegida(c)}
            className="tarjeta flex items-center gap-3 border-t-4 border-t-pasto-600 text-left transition hover:bg-pasto-50"
          >
            <Trophy className="h-8 w-8 shrink-0 text-pasto-600" />
            <span className="flex-1">
              <span className="block font-semibold">{c.nombre}</span>
              <span className="block text-sm text-gray-600">
                {NOMBRE_DEPORTE[c.deporte]} · turnos de {c.duracionMin} min
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-pasto-600" />
          </button>
        ))}
      </div>

      {/* Pop up con las fechas y los turnos de la cancha elegida */}
      {canchaElegida && <ModalCancha cancha={canchaElegida} onCerrar={() => setCanchaElegida(null)} onReservada={alReservar} />}
    </div>
  );
}
