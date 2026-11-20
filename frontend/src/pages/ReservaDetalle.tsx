import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { apiAusente, apiCancelarRecepcion, apiCheckin, apiCobrarSaldo, apiDetalleReserva, Comprobante, MedioPersonal, Reserva } from '../api';
import { puedeUsar, useAuth } from '../auth';
import Campo from '../components/Campo';
import { Cargando, MensajeError, MensajeOk } from '../components/Mensajes';
import { COLOR_ESTADO, fechaHora, mensajeError, MEDIOS_PERSONAL, NOMBRE_ESTADO, NOMBRE_MEDIO, pesos, totalPagado } from '../utils';

// Pantalla 5: detalle de una reserva con check-in, cobro del saldo, ausente y cancelación
export default function ReservaDetalle() {
  const { id } = useParams();
  const reservaId = Number(id);
  const { usuario } = useAuth();

  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [medio, setMedio] = useState<MedioPersonal>('EFECTIVO');
  const [comprobante, setComprobante] = useState<Comprobante | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [exceptuar, setExceptuar] = useState(false);
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    apiDetalleReserva(reservaId)
      .then(setReserva)
      .catch((e) => setError(mensajeError(e)));
  }, [reservaId, version]);

  // Ejecuta una acción del backend: muestra el resultado (o el error) y vuelve a pedir el detalle.
  // Cada acción devuelve el texto que se le muestra a la persona.
  async function ejecutar(accion: () => Promise<string>) {
    setOcupado(true);
    setError('');
    setAviso('');
    try {
      setAviso(await accion());
      setVersion((v) => v + 1);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }

  function hacerCheckin() {
    ejecutar(async () => {
      await apiCheckin(reservaId);
      return 'Check-in registrado: el turno está en juego.';
    });
  }

  function cobrarSaldo() {
    ejecutar(async () => {
      const r = await apiCobrarSaldo(reservaId, medio);
      setComprobante(r.comprobante);
      return 'Saldo cobrado. El turno quedó finalizado.';
    });
  }

  function marcarAusente() {
    ejecutar(async () => {
      const r = await apiAusente(reservaId);
      return r.mensaje + (r.exigePagoTotal ? ` Atención: el cliente ya tiene ${r.ausenciasEnPeriodo} ausencias y desde ahora deberá pagar el total por adelantado.` : '');
    });
  }

  function cancelarReserva() {
    ejecutar(async () => {
      const r = await apiCancelarRecepcion(reservaId, exceptuar, motivo);
      setCancelando(false);
      return r.mensaje;
    });
  }

  if (!reserva) {
    return error ? (
      <div className="space-y-3">
        <MensajeError texto={error} />
        <Link to="/recepcion" className="btn-secundario">
          Volver a la grilla
        </Link>
      </div>
    ) : (
      <Cargando texto="Cargando la reserva..." />
    );
  }

  const pagado = totalPagado(reserva.pagos);
  const saldo = Math.max(reserva.precio - pagado, 0);
  const puedeCheckin = reserva.estado === 'RESERVADA' || reserva.estado === 'SENADA';
  const puedeCancelar = ['RETENIDA', 'RESERVADA', 'SENADA'].includes(reserva.estado);
  const esEncargado = puedeUsar(usuario, 'ENCARGADO'); // solo el encargado puede exceptuar la política

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/recepcion" className="text-sm text-pasto-700 underline">
        ← Volver a la grilla
      </Link>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-pasto-900"><Receipt className="h-6 w-6 text-pasto-600" /> Reserva #{reserva.id}</h1>

      <MensajeOk texto={aviso} />
      <MensajeError texto={error} />

      <section className="tarjeta space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">{reserva.cancha?.nombre}</p>
          <span className={`rounded border px-2 py-1 text-xs font-medium ${COLOR_ESTADO[reserva.estado] ?? ''}`}>{NOMBRE_ESTADO[reserva.estado] ?? reserva.estado}</span>
        </div>
        <p>{fechaHora(reserva.inicio)} hs</p>
        {reserva.cliente && (
          <p className="text-sm text-gray-700">
            Cliente: {reserva.cliente.nombre} {reserva.cliente.apellido} · {reserva.cliente.telefono ?? 'sin teléfono'}
          </p>
        )}
        <p className="text-sm text-gray-700">
          Valor: {pesos(reserva.precio)} · Pagado: {pesos(pagado)} · <strong>Saldo: {pesos(saldo)}</strong>
        </p>
        {reserva.pagoTotalRequerido && <p className="text-sm text-amber-800">Este cliente debe pagar el total por ausencias anteriores.</p>}
      </section>

      {/* Pagos registrados */}
      {reserva.pagos && reserva.pagos.length > 0 && (
        <section className="tarjeta">
          <h2 className="mb-2 font-semibold">Pagos</h2>
          <ul className="space-y-1 text-sm">
            {reserva.pagos.map((p) => (
              <li key={p.id} className="flex justify-between gap-2">
                <span>
                  {p.tipo === 'SENA' ? 'Seña' : p.tipo === 'SALDO' ? 'Saldo' : 'Reembolso'} · {NOMBRE_MEDIO[p.medio] ?? p.medio} · {p.estado.toLowerCase()}
                </span>
                <span>{p.tipo === 'REEMBOLSO' ? '- ' : ''}{pesos(p.monto)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Acciones según el estado */}
      {puedeCheckin && (
        <section className="tarjeta space-y-3">
          <h2 className="font-semibold">Llegada del cliente</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primario" disabled={ocupado} onClick={hacerCheckin}>
              Hacer check-in
            </button>
            <button type="button" className="btn-secundario" disabled={ocupado} onClick={marcarAusente}>
              Marcar ausente
            </button>
          </div>
          <p className="text-xs text-gray-600">“Ausente” solo se puede marcar pasados unos minutos del inicio del turno (lo controla el sistema). La seña queda retenida.</p>
        </section>
      )}

      {reserva.estado === 'EN_JUEGO' && (
        <section className="tarjeta space-y-3">
          <h2 className="font-semibold">Cobro del saldo</h2>
          <div className="max-w-xs">
            <Campo etiqueta="Medio de pago">
              <select className="campo" value={medio} onChange={(e) => setMedio(e.target.value as MedioPersonal)}>
                {MEDIOS_PERSONAL.map((m) => (
                  <option key={m} value={m}>
                    {NOMBRE_MEDIO[m]}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <button type="button" className="btn-primario" disabled={ocupado} onClick={cobrarSaldo}>
            {saldo > 0 ? `Cobrar saldo (${pesos(saldo)})` : 'Finalizar turno (sin saldo)'}
          </button>
        </section>
      )}

      {puedeCancelar && (
        <section className="tarjeta space-y-3">
          {!cancelando ? (
            <button type="button" className="btn-secundario" onClick={() => setCancelando(true)}>
              Cancelar reserva
            </button>
          ) : (
            <>
              <h2 className="font-semibold">Cancelar reserva</h2>
              <p className="text-sm text-gray-700">Se aplica la política: con 12 h o más de anticipación se reembolsa la seña; con menos, no.</p>
              {esEncargado && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={exceptuar} onChange={(e) => setExceptuar(e.target.checked)} />
                  Exceptuar la política (reembolso total)
                </label>
              )}
              {exceptuar && (
                <Campo etiqueta="Motivo de la excepción">
                  <input className="campo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: lluvia" />
                </Campo>
              )}
              <div className="flex gap-2">
                <button type="button" className="btn-peligro" disabled={ocupado} onClick={cancelarReserva}>
                  Confirmar cancelación
                </button>
                <button type="button" className="btn-secundario" onClick={() => setCancelando(false)}>
                  Volver
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* Comprobante del cobro */}
      {comprobante && (
        <section className="tarjeta space-y-1 border-green-400">
          <h2 className="font-semibold">Comprobante</h2>
          <p className="text-sm">Reserva #{comprobante.codigoReserva} · {comprobante.cancha}</p>
          <p className="text-sm">{fechaHora(comprobante.inicio)} hs</p>
          <p className="text-sm">Total: {pesos(comprobante.precioTotal)} · Pagado antes: {pesos(comprobante.pagadoAntes)}</p>
          <p className="text-sm font-semibold">Saldo cobrado: {pesos(comprobante.saldoCobrado)} ({NOMBRE_MEDIO[comprobante.medio] ?? comprobante.medio})</p>
          <button type="button" className="btn-secundario mt-2" onClick={() => window.print()}>
            Imprimir
          </button>
        </section>
      )}
    </div>
  );
}
