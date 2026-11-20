import { FormEvent, useEffect, useState } from 'react';
import { apiCrearTarifa, apiEditarTarifa, apiTarifas, Deporte, Tarifa } from '../api';
import { DEPORTES, mensajeError, NOMBRE_DEPORTE, pesos } from '../utils';
import Campo from './Campo';
import { Cargando, MensajeError, MensajeOk } from './Mensajes';

// Administración de tarifas: precio por deporte y franja horaria (las franjas de un deporte no se pueden superponer)
export default function AdminTarifas() {
  const [tarifas, setTarifas] = useState<Tarifa[] | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  // Alta (los números se guardan como texto mientras se escriben)
  const [nueva, setNueva] = useState({ deporte: 'FUTBOL5' as Deporte, horaDesde: '9', horaHasta: '18', precio: '' });

  // Edición de una fila
  const [editando, setEditando] = useState<number | null>(null);
  const [borrador, setBorrador] = useState({ horaDesde: '', horaHasta: '', precio: '' });

  useEffect(() => {
    apiTarifas()
      .then(setTarifas)
      .catch((e) => setError(mensajeError(e)));
  }, [version]);

  async function guardarCambio(accion: () => Promise<unknown>, mensajeOk: string) {
    setError('');
    setAviso('');
    try {
      await accion();
      setAviso(mensajeOk);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(mensajeError(e)); // ej: "La franja se superpone con la tarifa 3"
    }
  }

  async function crear(e: FormEvent) {
    e.preventDefault();
    await guardarCambio(async () => {
      await apiCrearTarifa({
        deporte: nueva.deporte,
        horaDesde: Number(nueva.horaDesde),
        horaHasta: Number(nueva.horaHasta),
        precio: Number(nueva.precio),
      });
      setNueva({ ...nueva, precio: '' });
    }, 'Tarifa creada.');
  }

  function empezarEdicion(t: Tarifa) {
    setEditando(t.id);
    setBorrador({ horaDesde: String(t.horaDesde), horaHasta: String(t.horaHasta), precio: String(t.precio) });
  }

  async function guardarEdicion(id: number) {
    await guardarCambio(async () => {
      await apiEditarTarifa(id, { horaDesde: Number(borrador.horaDesde), horaHasta: Number(borrador.horaHasta), precio: Number(borrador.precio) });
      setEditando(null);
    }, 'Tarifa actualizada. Las reservas ya hechas conservan su precio.');
  }

  return (
    <div className="space-y-4">
      <MensajeOk texto={aviso} />
      <MensajeError texto={error} />

      <form onSubmit={crear} className="tarjeta grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <Campo etiqueta="Deporte">
          <select className="campo" value={nueva.deporte} onChange={(e) => setNueva({ ...nueva, deporte: e.target.value as Deporte })}>
            {DEPORTES.map((d) => (
              <option key={d} value={d}>
                {NOMBRE_DEPORTE[d]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Desde (hora)">
          <input className="campo" type="number" min={0} max={23} required value={nueva.horaDesde} onChange={(e) => setNueva({ ...nueva, horaDesde: e.target.value })} />
        </Campo>
        <Campo etiqueta="Hasta (hora)">
          <input className="campo" type="number" min={1} max={24} required value={nueva.horaHasta} onChange={(e) => setNueva({ ...nueva, horaHasta: e.target.value })} />
        </Campo>
        <Campo etiqueta="Precio por turno ($)">
          <input className="campo" type="number" min={1} required value={nueva.precio} onChange={(e) => setNueva({ ...nueva, precio: e.target.value })} />
        </Campo>
        <button type="submit" className="btn-primario">
          Agregar tarifa
        </button>
      </form>

      {tarifas === null && !error && <Cargando />}
      <div className="space-y-2">
        {tarifas?.map((t) => (
          <div key={t.id} className="tarjeta flex flex-wrap items-center justify-between gap-3">
            {editando === t.id ? (
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <Campo etiqueta="Desde (hora)">
                  <input className="campo" type="number" min={0} max={23} value={borrador.horaDesde} onChange={(e) => setBorrador({ ...borrador, horaDesde: e.target.value })} />
                </Campo>
                <Campo etiqueta="Hasta (hora)">
                  <input className="campo" type="number" min={1} max={24} value={borrador.horaHasta} onChange={(e) => setBorrador({ ...borrador, horaHasta: e.target.value })} />
                </Campo>
                <Campo etiqueta="Precio ($)">
                  <input className="campo" type="number" min={1} value={borrador.precio} onChange={(e) => setBorrador({ ...borrador, precio: e.target.value })} />
                </Campo>
              </div>
            ) : (
              <div>
                <p className="font-semibold">{NOMBRE_DEPORTE[t.deporte]}</p>
                <p className="text-sm text-gray-600">
                  De {t.horaDesde} a {t.horaHasta} hs · {pesos(t.precio)} por turno
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {editando === t.id ? (
                <>
                  <button type="button" className="btn-primario" onClick={() => guardarEdicion(t.id)}>
                    Guardar
                  </button>
                  <button type="button" className="btn-secundario" onClick={() => setEditando(null)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <button type="button" className="btn-secundario" onClick={() => empezarEdicion(t)}>
                  Editar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* TODO (fuera del MVP): tarifas programadas con fecha de vigencia futura */}
    </div>
  );
}
