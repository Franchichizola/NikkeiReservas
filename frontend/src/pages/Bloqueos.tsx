import { useEffect, useState } from 'react';
import { Ban } from 'lucide-react';
import { AccionBloqueo, apiAfectadas, apiBloqueos, apiCrearBloqueo, apiGrilla, apiLevantarBloqueo, Bloqueo, CanchaConTurnos, Reserva } from '../api';
import Campo from '../components/Campo';
import { Cargando, MensajeError, MensajeOk } from '../components/Mensajes';
import { aIsoBuenosAires, fechaHora, hoy, mensajeError, NOMBRE_ESTADO } from '../utils';

// Qué se decidió hacer con cada reserva afectada por el bloqueo
type Decision = { accion: 'CANCELAR' | 'REPROGRAMAR'; fecha: string; hora: string };

// Pantalla 6: bloquear canchas (mantenimiento, lluvia, eventos). Desde encargado.
// Flujo: 1) completar el formulario  2) revisar las reservas afectadas y decidir  3) confirmar.
export default function Bloqueos() {
  const [bloqueos, setBloqueos] = useState<Bloqueo[] | null>(null);
  const [canchas, setCanchas] = useState<CanchaConTurnos['cancha'][]>([]);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  // Formulario
  const [elegidas, setElegidas] = useState<number[]>([]); // ids de las canchas a bloquear
  const [fechaDesde, setFechaDesde] = useState(hoy());
  const [horaDesde, setHoraDesde] = useState('09:00');
  const [fechaHasta, setFechaHasta] = useState(hoy());
  const [horaHasta, setHoraHasta] = useState('12:00');
  const [motivo, setMotivo] = useState('');

  // Paso 2: reservas afectadas y qué se decide con cada una (la clave es el id de la reserva)
  const [afectadas, setAfectadas] = useState<Reserva[] | null>(null);
  const [decisiones, setDecisiones] = useState<Record<number, Decision>>({});

  // La lista de canchas sale de la grilla de recepción (el encargado no puede usar la de administración)
  useEffect(() => {
    apiGrilla(hoy())
      .then((r) => setCanchas((r.dias[0]?.canchas ?? []).map((c) => c.cancha)))
      .catch((e) => setError(mensajeError(e)));
  }, []);

  useEffect(() => {
    apiBloqueos()
      .then(setBloqueos)
      .catch((e) => setError(mensajeError(e)));
  }, [version]);

  function marcarCancha(id: number, marcada: boolean) {
    setElegidas(marcada ? [...elegidas, id] : elegidas.filter((x) => x !== id));
  }

  function cambiarDecision(reservaId: number, cambios: Partial<Decision>) {
    setDecisiones({ ...decisiones, [reservaId]: { ...decisiones[reservaId], ...cambios } });
  }

  // Paso 1 -> 2: busca las reservas que quedarían afectadas
  async function revisar() {
    setError('');
    setAviso('');
    if (elegidas.length === 0) {
      setError('Elegí al menos una cancha.');
      return;
    }
    if (motivo.trim().length < 3) {
      setError('Escribí el motivo del bloqueo (mínimo 3 letras).');
      return;
    }
    if (`${fechaDesde}T${horaDesde}` >= `${fechaHasta}T${horaHasta}`) {
      setError('El horario "hasta" tiene que ser posterior al "desde".');
      return;
    }
    setOcupado(true);
    try {
      const lista = await apiAfectadas(elegidas, aIsoBuenosAires(fechaDesde, horaDesde), aIsoBuenosAires(fechaHasta, horaHasta));
      // Por defecto se cancelan (con reembolso total). Si se reprograma, se sugiere el horario en que termina el bloqueo.
      const inicial: Record<number, Decision> = {};
      for (const r of lista) inicial[r.id] = { accion: 'CANCELAR', fecha: fechaHasta, hora: horaHasta };
      setDecisiones(inicial);
      setAfectadas(lista);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }

  // Paso 3: crea el bloqueo con las decisiones tomadas
  async function confirmar() {
    if (!afectadas) return;
    setError('');
    setOcupado(true);
    // Las reservas "retenidas" (sin pagar) se cancelan solas, no necesitan decisión
    const acciones = afectadas
      .filter((r) => r.estado !== 'RETENIDA')
      .map((r): AccionBloqueo => {
        const d = decisiones[r.id];
        if (d.accion === 'CANCELAR') return { reservaId: r.id, accion: 'CANCELAR' };
        return { reservaId: r.id, accion: 'REPROGRAMAR', fecha: d.fecha, hora: d.hora };
      });
    try {
      const r = await apiCrearBloqueo({
        canchaIds: elegidas,
        desde: aIsoBuenosAires(fechaDesde, horaDesde),
        hasta: aIsoBuenosAires(fechaHasta, horaHasta),
        motivo: motivo.trim(),
        acciones,
      });
      setAviso(`Bloqueo creado. Reservas gestionadas: ${r.reservasGestionadas}. Se avisó a los clientes.`);
      setAfectadas(null);
      setElegidas([]);
      setMotivo('');
      setVersion((v) => v + 1);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }

  async function levantar(id: number) {
    if (!window.confirm('¿Levantar este bloqueo? Los turnos volverán a estar libres.')) return;
    setError('');
    setAviso('');
    try {
      await apiLevantarBloqueo(id);
      setAviso('Bloqueo levantado.');
      setVersion((v) => v + 1);
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  const revisando = afectadas !== null; // mientras se revisa, el formulario queda bloqueado

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-pasto-900"><Ban className="h-6 w-6 text-pasto-600" /> Bloquear canchas</h1>

      <MensajeOk texto={aviso} />
      <MensajeError texto={error} />

      {/* ---- Formulario ---- */}
      <section className="tarjeta space-y-4">
        <h2 className="font-semibold">Nuevo bloqueo</h2>
        <fieldset disabled={revisando} className="space-y-4">
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Canchas</span>
            {canchas.length === 0 && <Cargando texto="Cargando canchas..." />}
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {canchas.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={elegidas.includes(c.id)} onChange={(e) => marcarCancha(c.id, e.target.checked)} />
                  {c.nombre}
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Desde (día)">
              <input type="date" className="campo" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </Campo>
            <Campo etiqueta="Desde (hora)">
              <input type="time" className="campo" value={horaDesde} onChange={(e) => setHoraDesde(e.target.value)} />
            </Campo>
            <Campo etiqueta="Hasta (día)">
              <input type="date" className="campo" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </Campo>
            <Campo etiqueta="Hasta (hora)">
              <input type="time" className="campo" value={horaHasta} onChange={(e) => setHoraHasta(e.target.value)} />
            </Campo>
          </div>
          <Campo etiqueta="Motivo">
            <input className="campo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: mantenimiento del piso, lluvia" />
          </Campo>
        </fieldset>

        {!revisando && (
          <button type="button" className="btn-primario" disabled={ocupado} onClick={revisar}>
            {ocupado ? 'Revisando...' : 'Revisar reservas afectadas'}
          </button>
        )}
      </section>

      {/* ---- Reservas afectadas: decidir cada una ---- */}
      {afectadas !== null && (
        <section className="tarjeta space-y-4 border-amber-400">
          <h2 className="font-semibold">Reservas afectadas ({afectadas.length})</h2>
          {afectadas.length === 0 && <p className="text-sm text-gray-700">No hay reservas en ese horario. Se puede bloquear sin problemas.</p>}

          {afectadas.map((r) => (
            <div key={r.id} className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">
                #{r.id} · {r.cancha?.nombre} · {fechaHora(r.inicio)} hs · {NOMBRE_ESTADO[r.estado] ?? r.estado}
              </p>
              <p className="text-gray-600">
                {r.cliente?.nombre} {r.cliente?.apellido} · {r.cliente?.telefono ?? 'sin teléfono'}
              </p>
              {r.estado === 'RETENIDA' ? (
                <p className="mt-1 text-gray-600">Todavía no pagó la seña: se cancela automáticamente.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1">
                      <input type="radio" name={`decision-${r.id}`} checked={decisiones[r.id]?.accion === 'CANCELAR'} onChange={() => cambiarDecision(r.id, { accion: 'CANCELAR' })} />
                      Cancelar (reembolso total)
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="radio" name={`decision-${r.id}`} checked={decisiones[r.id]?.accion === 'REPROGRAMAR'} onChange={() => cambiarDecision(r.id, { accion: 'REPROGRAMAR' })} />
                      Reprogramar
                    </label>
                  </div>
                  {decisiones[r.id]?.accion === 'REPROGRAMAR' && (
                    <div className="grid max-w-md gap-3 sm:grid-cols-2">
                      <Campo etiqueta="Nuevo día">
                        <input type="date" className="campo" value={decisiones[r.id].fecha} onChange={(e) => cambiarDecision(r.id, { fecha: e.target.value })} />
                      </Campo>
                      <Campo etiqueta="Nueva hora">
                        <input type="time" className="campo" value={decisiones[r.id].hora} onChange={(e) => cambiarDecision(r.id, { hora: e.target.value })} />
                      </Campo>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-2">
            <button type="button" className="btn-peligro" disabled={ocupado} onClick={confirmar}>
              {ocupado ? 'Bloqueando...' : 'Confirmar bloqueo'}
            </button>
            <button type="button" className="btn-secundario" disabled={ocupado} onClick={() => setAfectadas(null)}>
              Cambiar datos
            </button>
          </div>
        </section>
      )}

      {/* ---- Bloqueos vigentes ---- */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Bloqueos vigentes y futuros</h2>
        {bloqueos === null && !error && <Cargando />}
        {bloqueos !== null && bloqueos.length === 0 && <p className="text-gray-600">No hay bloqueos activos.</p>}
        {bloqueos?.map((b) => (
          <div key={b.id} className="tarjeta flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <p className="font-semibold">{b.cancha.nombre}</p>
              <p>
                {fechaHora(b.inicio)} → {fechaHora(b.fin)} · {b.motivo}
              </p>
            </div>
            <button type="button" className="btn-secundario" onClick={() => levantar(b.id)}>
              Levantar
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
