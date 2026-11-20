import { FormEvent, useEffect, useState } from 'react';
import { Banknote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiCerrarCaja, apiReabrirCaja, apiResumenCaja, ResumenCaja } from '../api';
import { puedeUsar, useAuth } from '../auth';
import Campo from '../components/Campo';
import { Cargando, MensajeError, MensajeOk } from '../components/Mensajes';
import { fechaHora, hoy, mensajeError, NOMBRE_ESTADO, NOMBRE_MEDIO, pesos } from '../utils';

// Pantalla 8: cierre de caja del día. Encargado y administrador.
export default function Caja() {
  const { usuario } = useAuth();
  const [fecha, setFecha] = useState(hoy());
  const [resumen, setResumen] = useState<ResumenCaja | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [contado, setContado] = useState(''); // efectivo que se contó en la caja
  const [observacion, setObservacion] = useState('');
  const [motivoReapertura, setMotivoReapertura] = useState('');

  useEffect(() => {
    if (!fecha) return;
    let cancelado = false;
    setError('');
    apiResumenCaja(fecha)
      .then((r) => {
        if (!cancelado) setResumen(r);
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeError(e));
      });
    return () => {
      cancelado = true;
    };
  }, [fecha, version]);

  function cambiarFecha(nueva: string) {
    setResumen(null);
    setAviso('');
    setContado('');
    setObservacion('');
    setFecha(nueva);
  }

  async function cerrar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setAviso('');
    setOcupado(true);
    try {
      await apiCerrarCaja(fecha, Math.round(Number(contado)), observacion);
      setAviso('Caja cerrada correctamente.');
      setVersion((v) => v + 1);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setOcupado(false);
    }
  }

  async function reabrir() {
    setError('');
    setAviso('');
    setOcupado(true);
    try {
      await apiReabrirCaja(fecha, motivoReapertura);
      setAviso('Caja reabierta.');
      setMotivoReapertura('');
      setVersion((v) => v + 1);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setOcupado(false);
    }
  }

  // Diferencia entre lo que se contó y lo que el sistema esperaba (se muestra mientras se escribe)
  const diferencia = resumen && contado !== '' ? Math.round(Number(contado)) - resumen.efectivoEsperado : 0;
  const sinResolver = resumen?.turnosSinResolver ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-pasto-900"><Banknote className="h-6 w-6 text-pasto-600" /> Cierre de caja</h1>

      <div className="tarjeta max-w-xs">
        <Campo etiqueta="Día a cerrar">
          <input type="date" className="campo" value={fecha} max={hoy()} onChange={(e) => cambiarFecha(e.target.value)} />
        </Campo>
      </div>

      <MensajeOk texto={aviso} />
      <MensajeError texto={error} />
      {resumen === null && !error && <Cargando texto="Calculando el resumen..." />}

      {resumen && (
        <>
          {/* ---- Resumen de cobros ---- */}
          <section className="tarjeta space-y-3">
            <h2 className="font-semibold">Resumen del día</h2>
            {Object.keys(resumen.porMedio).length === 0 ? (
              <p className="text-sm text-gray-600">No hubo movimientos de dinero este día.</p>
            ) : (
              <ul className="divide-y text-sm">
                {Object.entries(resumen.porMedio).map(([medio, v]) => (
                  <li key={medio} className="flex justify-between gap-2 py-2">
                    <span>{NOMBRE_MEDIO[medio] ?? medio}</span>
                    <span>
                      Cobrado {pesos(v.cobrado)} · Reembolsado {pesos(v.reembolsado)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <p className="rounded-lg bg-gray-50 p-2">Total cobrado<br /><strong>{pesos(resumen.totalCobrado)}</strong></p>
              <p className="rounded-lg bg-gray-50 p-2">Reembolsos<br /><strong>{pesos(resumen.totalReembolsos)}</strong></p>
              <p className="rounded-lg bg-gray-50 p-2">Neto<br /><strong>{pesos(resumen.neto)}</strong></p>
            </div>
            <p className="text-sm">Efectivo que debería haber en caja: <strong>{pesos(resumen.efectivoEsperado)}</strong></p>
          </section>

          {/* ---- Turnos que impiden cerrar ---- */}
          {sinResolver.length > 0 && (
            <section className="tarjeta space-y-2 border-amber-400">
              <h2 className="font-semibold">Turnos sin resolver ({sinResolver.length})</h2>
              <p className="text-sm text-gray-700">Hay que cobrarlos o marcarlos como ausentes antes de cerrar la caja.</p>
              <ul className="text-sm">
                {sinResolver.map((t) => (
                  <li key={t.reservaId}>
                    <Link to={`/recepcion/reserva/${t.reservaId}`} className="text-pasto-700 underline">
                      Reserva #{t.reservaId}
                    </Link>{' '}
                    · {fechaHora(t.inicio)} hs · {NOMBRE_ESTADO[t.estado] ?? t.estado}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ---- Caja ya cerrada ---- */}
          {resumen.cierre ? (
            <section className="tarjeta space-y-2 border-green-400">
              <h2 className="font-semibold">Caja cerrada</h2>
              <p className="text-sm">
                Efectivo esperado {pesos(resumen.cierre.efectivoEsperado)} · contado {pesos(resumen.cierre.efectivoContado)} · diferencia{' '}
                <strong>{pesos(resumen.cierre.diferencia)}</strong>
              </p>
              {resumen.cierre.observacion && <p className="text-sm text-gray-700">Observación: {resumen.cierre.observacion}</p>}
              {/* Solo el administrador puede reabrir un día cerrado */}
              {puedeUsar(usuario, 'ADMINISTRADOR') && (
                <div className="space-y-2 border-t pt-3">
                  <Campo etiqueta="Motivo para reabrir la caja">
                    <input className="campo" value={motivoReapertura} onChange={(e) => setMotivoReapertura(e.target.value)} />
                  </Campo>
                  <button type="button" className="btn-secundario" disabled={ocupado || motivoReapertura.trim().length < 3} onClick={reabrir}>
                    Reabrir caja
                  </button>
                </div>
              )}
            </section>
          ) : (
            /* ---- Formulario de cierre ---- */
            <form onSubmit={cerrar} className="tarjeta space-y-3">
              <h2 className="font-semibold">Cerrar la caja</h2>
              <div className="max-w-xs">
                <Campo etiqueta="Efectivo contado ($)">
                  <input className="campo" type="number" min={0} required value={contado} onChange={(e) => setContado(e.target.value)} />
                </Campo>
              </div>
              {contado !== '' && (
                <p className={`text-sm font-medium ${diferencia === 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {diferencia === 0 ? 'La caja cierra justa.' : `Diferencia de ${pesos(diferencia)}: hay que escribir una observación.`}
                </p>
              )}
              <Campo etiqueta={diferencia !== 0 ? 'Observación (obligatoria)' : 'Observación (opcional)'}>
                <input className="campo" required={diferencia !== 0} minLength={3} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
              </Campo>
              <button type="submit" className="btn-primario" disabled={ocupado || sinResolver.length > 0}>
                {ocupado ? 'Cerrando...' : 'Cerrar caja'}
              </button>
              {sinResolver.length > 0 && <p className="text-sm text-amber-800">Resolvé los turnos pendientes para poder cerrar.</p>}
            </form>
          )}
        </>
      )}
    </div>
  );
}
