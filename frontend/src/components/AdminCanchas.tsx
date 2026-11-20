import { FormEvent, useEffect, useState } from 'react';
import { apiCanchas, apiCrearCancha, apiEditarCancha, Cancha, Deporte } from '../api';
import { DEPORTES, mensajeError, NOMBRE_DEPORTE } from '../utils';
import Campo from './Campo';
import { Cargando, MensajeError, MensajeOk } from './Mensajes';

// Administración de canchas: alta, cambio de nombre/duración y activar/desactivar (no se borran)
export default function AdminCanchas() {
  const [canchas, setCanchas] = useState<Cancha[] | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  // Alta
  const [nombre, setNombre] = useState('');
  const [deporte, setDeporte] = useState<Deporte>('FUTBOL5');
  const [duracion, setDuracion] = useState(''); // vacío = el backend usa 60 min (fútbol) o 90 min (pádel)

  // Edición de una fila
  const [editando, setEditando] = useState<number | null>(null);
  const [borrador, setBorrador] = useState({ nombre: '', duracionMin: '' });

  useEffect(() => {
    apiCanchas()
      .then(setCanchas)
      .catch((e) => setError(mensajeError(e)));
  }, [version]);

  // Ejecuta un cambio, muestra el resultado y recarga la lista
  async function guardarCambio(accion: () => Promise<unknown>, mensajeOk: string) {
    setError('');
    setAviso('');
    try {
      await accion();
      setAviso(mensajeOk);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(mensajeError(e)); // ej: "La cancha tiene reservas futuras, usá un bloqueo"
    }
  }

  async function crear(e: FormEvent) {
    e.preventDefault();
    await guardarCambio(async () => {
      await apiCrearCancha({ nombre, deporte, duracionMin: duracion ? Number(duracion) : undefined });
      setNombre('');
      setDuracion('');
    }, 'Cancha creada.');
  }

  function empezarEdicion(c: Cancha) {
    setEditando(c.id);
    setBorrador({ nombre: c.nombre, duracionMin: String(c.duracionMin) });
  }

  async function guardarEdicion(id: number) {
    await guardarCambio(async () => {
      await apiEditarCancha(id, { nombre: borrador.nombre, duracionMin: Number(borrador.duracionMin) });
      setEditando(null);
    }, 'Cancha actualizada.');
  }

  return (
    <div className="space-y-4">
      <MensajeOk texto={aviso} />
      <MensajeError texto={error} />

      <form onSubmit={crear} className="tarjeta grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <Campo etiqueta="Nombre de la nueva cancha">
          <input className="campo" required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo etiqueta="Deporte">
          <select className="campo" value={deporte} onChange={(e) => setDeporte(e.target.value as Deporte)}>
            {DEPORTES.map((d) => (
              <option key={d} value={d}>
                {NOMBRE_DEPORTE[d]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Duración del turno (min, opcional)">
          <input className="campo" type="number" min={30} max={180} value={duracion} onChange={(e) => setDuracion(e.target.value)} />
        </Campo>
        <button type="submit" className="btn-primario">
          Agregar cancha
        </button>
      </form>

      {canchas === null && !error && <Cargando />}
      <div className="space-y-2">
        {canchas?.map((c) => (
          <div key={c.id} className="tarjeta flex flex-wrap items-center justify-between gap-3">
            {editando === c.id ? (
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <Campo etiqueta="Nombre">
                  <input className="campo" value={borrador.nombre} onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })} />
                </Campo>
                <Campo etiqueta="Duración (min)">
                  <input className="campo" type="number" min={30} max={180} value={borrador.duracionMin} onChange={(e) => setBorrador({ ...borrador, duracionMin: e.target.value })} />
                </Campo>
              </div>
            ) : (
              <div>
                <p className="font-semibold">{c.nombre}</p>
                <p className="text-sm text-gray-600">
                  {NOMBRE_DEPORTE[c.deporte]} · turnos de {c.duracionMin} min · {c.activa ? 'Activa' : 'Desactivada'}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {editando === c.id ? (
                <>
                  <button type="button" className="btn-primario" onClick={() => guardarEdicion(c.id)}>
                    Guardar
                  </button>
                  <button type="button" className="btn-secundario" onClick={() => setEditando(null)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-secundario" onClick={() => empezarEdicion(c)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={() => guardarCambio(() => apiEditarCancha(c.id, { activa: !c.activa }), c.activa ? 'Cancha desactivada.' : 'Cancha activada.')}
                  >
                    {c.activa ? 'Desactivar' : 'Activar'}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
