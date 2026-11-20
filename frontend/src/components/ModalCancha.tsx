import { CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiDisponibilidad, apiReservar, CanchaConTurnos, Reserva, Turno } from '../api';
import { DIAS_ANTICIPACION, fechaCorta, hoy, mensajeError, pesos, sumarDias } from '../utils';
import Campo from './Campo';
import GrillaTurnos from './GrillaTurnos';
import { Cargando, MensajeError } from './Mensajes';
import Modal from './Modal';

interface Props {
  cancha: CanchaConTurnos['cancha'];
  onCerrar: () => void;
  onReservada: (reserva: Reserva) => void; // se llama cuando el turno quedó retenido
}

// Pop up que se abre al elegir una cancha: se elige la fecha, se ven sus turnos y se reserva.
export default function ModalCancha({ cancha, onCerrar, onReservada }: Props) {
  const [fecha, setFecha] = useState(hoy());
  const [grilla, setGrilla] = useState<CanchaConTurnos[] | null>(null); // null = cargando
  const [version, setVersion] = useState(0); // al sumarle 1 se vuelve a pedir la grilla
  const [elegido, setElegido] = useState<Turno | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [errorGrilla, setErrorGrilla] = useState('');

  // Los próximos 7 días como atajo; para más lejos está el calendario
  const proximosDias = Array.from({ length: 7 }, (_, i) => sumarDias(hoy(), i));

  // Pide los turnos de ESTA cancha cada vez que cambia la fecha
  useEffect(() => {
    if (!fecha) return; // el campo de fecha puede quedar vacío si la persona lo borra
    let cancelado = false;
    setErrorGrilla('');
    apiDisponibilidad(fecha, undefined, cancha.id)
      .then((r) => {
        if (!cancelado) setGrilla(r.canchas);
      })
      .catch((e) => {
        if (!cancelado) setErrorGrilla(mensajeError(e));
      });
    return () => {
      cancelado = true;
    };
  }, [fecha, version]);

  function cambiarFecha(nueva: string) {
    setGrilla(null);
    setElegido(null);
    setFecha(nueva);
  }

  // Crea la reserva: el turno queda retenido unos minutos para esta persona
  async function reservar() {
    if (!elegido) return;
    setOcupado(true);
    setError('');
    try {
      const r = await apiReservar(cancha.id, fecha, elegido.hora);
      onReservada(r.reserva);
    } catch (e) {
      setError(mensajeError(e)); // ej: "Turno no disponible", otra persona lo tomó antes
      setElegido(null);
      setGrilla(null);
      setVersion((v) => v + 1); // se actualiza la grilla para que se vea ocupado
      setOcupado(false);
    }
  }

  return (
    <Modal titulo={cancha.nombre} onCerrar={onCerrar}>
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
          <CalendarDays className="h-4 w-4 text-pasto-600" /> Elegí la fecha
        </p>
        <div className="flex flex-wrap gap-2">
          {proximosDias.map((d) => (
            <button key={d} type="button" onClick={() => cambiarFecha(d)} className={d === fecha ? 'btn-primario' : 'btn-secundario'}>
              {d === hoy() ? 'Hoy' : fechaCorta(d)}
            </button>
          ))}
        </div>
        <div className="mt-3 max-w-xs">
          <Campo etiqueta="¿Otro día? (hasta 30 días)">
            <input
              type="date"
              className="campo"
              value={fecha}
              min={hoy()}
              max={sumarDias(hoy(), DIAS_ANTICIPACION)}
              onChange={(e) => cambiarFecha(e.target.value)}
            />
          </Campo>
        </div>
      </div>

      <MensajeError texto={error} />
      <MensajeError texto={errorGrilla} />

      {/* Confirmación del turno elegido */}
      {elegido && (
        <div className="tarjeta border-pasto-500 bg-pasto-50">
          <p className="font-semibold">
            {cancha.nombre} · {fechaCorta(fecha)} · {elegido.hora} hs · {pesos(elegido.precio)}
          </p>
          <p className="mb-3 text-sm text-gray-700">Al reservar, el turno queda retenido unos minutos para que pagues la seña.</p>
          <div className="flex gap-2">
            <button type="button" className="btn-primario" disabled={ocupado} onClick={reservar}>
              {ocupado ? 'Reservando...' : 'Reservar este turno'}
            </button>
            <button type="button" className="btn-secundario" onClick={() => setElegido(null)}>
              Elegir otro
            </button>
          </div>
        </div>
      )}

      {grilla === null && !errorGrilla && <Cargando texto="Buscando turnos..." />}
      {grilla !== null && <GrillaTurnos canchas={grilla} modo="cliente" onElegir={(_cancha, turno) => setElegido(turno)} />}
    </Modal>
  );
}
