import { FormEvent, KeyboardEvent, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiBuscarClientes, apiCargarReserva, ClienteBusqueda, DatosReservaManual, MedioPersonal } from '../api';
import Campo from '../components/Campo';
import { MensajeError } from '../components/Mensajes';
import { fechaCorta, mensajeError, MEDIOS_PERSONAL, NOMBRE_MEDIO, pesos } from '../utils';

// Pantalla 4 (parte 2): carga manual de una reserva (llamada telefónica o cliente en el mostrador).
// El turno llega por la dirección: /recepcion/nueva?canchaId=3&cancha=...&fecha=...&hora=...&precio=...
export default function CargaManual() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const canchaId = Number(params.get('canchaId'));
  const cancha = params.get('cancha') ?? '';
  const fecha = params.get('fecha') ?? '';
  const hora = params.get('hora') ?? '';
  const precio = Number(params.get('precio')) || 0;

  const [modoCliente, setModoCliente] = useState<'buscar' | 'nuevo'>('buscar');
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<ClienteBusqueda[] | null>(null);
  const [cliente, setCliente] = useState<ClienteBusqueda | null>(null); // el cliente elegido de la búsqueda
  const [nuevo, setNuevo] = useState({ nombre: '', apellido: '', telefono: '' });
  const [conSena, setConSena] = useState(false);
  const [medio, setMedio] = useState<MedioPersonal>('EFECTIVO');
  const [monto, setMonto] = useState(String(Math.round(precio * 0.3))); // sugerencia: 30 % (el backend valida el mínimo real)
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Si falta algún dato del turno, se vuelve a la grilla
  if (!canchaId || !fecha || !hora) {
    return (
      <div className="space-y-3">
        <MensajeError texto="Primero elegí un turno libre en la grilla de recepción." />
        <Link to="/recepcion" className="btn-primario">
          Ir a la grilla
        </Link>
      </div>
    );
  }

  async function buscar() {
    setError('');
    if (busqueda.trim().length < 2) {
      setError('Escribí al menos 2 letras del nombre, apellido o teléfono.');
      return;
    }
    try {
      setResultados(await apiBuscarClientes(busqueda.trim()));
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  // Enter en el buscador busca (sin enviar todo el formulario)
  function teclaEnBuscador(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscar();
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError('');

    const datos: DatosReservaManual = { canchaId, fecha, hora };
    if (modoCliente === 'buscar') {
      if (!cliente) {
        setError('Elegí un cliente de la lista, o cargá uno nuevo.');
        return;
      }
      datos.clienteId = cliente.id;
    } else {
      datos.cliente = { nombre: nuevo.nombre, apellido: nuevo.apellido || undefined, telefono: nuevo.telefono };
    }
    if (conSena) datos.sena = { medio, monto: Math.round(Number(monto)) };

    setEnviando(true);
    try {
      const reserva = await apiCargarReserva(datos);
      navigate(`/recepcion/reserva/${reserva.id}`); // se muestra el detalle de la reserva recién creada
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-pasto-900"><CalendarPlus className="h-6 w-6 text-pasto-600" /> Cargar reserva manual</h1>

      <div className="tarjeta bg-pasto-50">
        <p className="font-semibold">{cancha}</p>
        <p>
          {fechaCorta(fecha)} · {hora} hs {precio > 0 && `· ${pesos(precio)}`}
        </p>
      </div>

      <form onSubmit={guardar} className="space-y-4">
        {/* ---- Cliente ---- */}
        <section className="tarjeta space-y-3">
          <h2 className="font-semibold">Cliente</h2>
          <div className="flex gap-2">
            <button type="button" className={modoCliente === 'buscar' ? 'btn-primario' : 'btn-secundario'} onClick={() => setModoCliente('buscar')}>
              Buscar existente
            </button>
            <button type="button" className={modoCliente === 'nuevo' ? 'btn-primario' : 'btn-secundario'} onClick={() => setModoCliente('nuevo')}>
              Cliente nuevo
            </button>
          </div>

          {modoCliente === 'buscar' ? (
            <>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Campo etiqueta="Nombre, apellido o teléfono">
                    <input className="campo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} onKeyDown={teclaEnBuscador} />
                  </Campo>
                </div>
                <button type="button" className="btn-secundario" onClick={buscar}>
                  Buscar
                </button>
              </div>
              {cliente && (
                <p className="rounded-lg bg-green-50 p-2 text-sm text-green-900">
                  Cliente elegido: <strong>{cliente.nombre} {cliente.apellido}</strong> ({cliente.telefono ?? 'sin teléfono'})
                </p>
              )}
              {resultados !== null && resultados.length === 0 && <p className="text-sm text-gray-600">No se encontraron clientes. Probá con “Cliente nuevo”.</p>}
              {resultados !== null && resultados.length > 0 && (
                <ul className="divide-y rounded-lg border">
                  {resultados.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => setCliente(c)}>
                        {c.nombre} {c.apellido} · {c.telefono ?? 'sin teléfono'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo etiqueta="Nombre">
                <input className="campo" required value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
              </Campo>
              <Campo etiqueta="Apellido (opcional)">
                <input className="campo" value={nuevo.apellido} onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })} />
              </Campo>
              <Campo etiqueta="Teléfono">
                <input className="campo" type="tel" required minLength={6} value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} />
              </Campo>
            </div>
          )}
        </section>

        {/* ---- Seña (opcional) ---- */}
        <section className="tarjeta space-y-3">
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={conSena} onChange={(e) => setConSena(e.target.checked)} />
            Registrar una seña ahora
          </label>
          {conSena ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Medio de pago">
                <select className="campo" value={medio} onChange={(e) => setMedio(e.target.value as MedioPersonal)}>
                  {MEDIOS_PERSONAL.map((m) => (
                    <option key={m} value={m}>
                      {NOMBRE_MEDIO[m]}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Monto ($)">
                <input className="campo" type="number" min={1} required value={monto} onChange={(e) => setMonto(e.target.value)} />
              </Campo>
              <p className="text-xs text-gray-600 sm:col-span-2">El sistema valida que la seña no sea menor al mínimo configurado. Si el cliente tiene muchas ausencias, hay que cobrar el total.</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Sin seña, la reserva queda “Reservada” y se cobra todo al llegar.</p>
          )}
        </section>

        <MensajeError texto={error} />
        <div className="flex gap-2">
          <button type="submit" className="btn-primario" disabled={enviando}>
            {enviando ? 'Guardando...' : 'Guardar reserva'}
          </button>
          <Link to="/recepcion" className="btn-secundario">
            Volver a la grilla
          </Link>
        </div>
      </form>
    </div>
  );
}
