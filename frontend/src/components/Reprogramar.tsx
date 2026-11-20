import { useEffect, useState } from 'react';
import { apiDisponibilidad, apiReprogramar, CanchaConTurnos, Reserva, Turno } from '../api';
import { DIAS_ANTICIPACION, fechaCorta, hoy, mensajeError, sumarDias } from '../utils';
import Campo from './Campo';
import GrillaTurnos from './GrillaTurnos';
import { Cargando, MensajeError } from './Mensajes';

// Panel para elegir un nuevo turno del MISMO deporte y reprogramar una reserva.
// Props: la reserva a mover, qué hacer cuando termina bien y cómo cerrar el panel.
interface Props {
  reserva: Reserva;
  onListo: (mensaje: string) => void;
  onCerrar: () => void;
}

export default function Reprogramar({ reserva, onListo, onCerrar }: Props) {
  const [fecha, setFecha] = useState(hoy());
  const [canchas, setCanchas] = useState<CanchaConTurnos[] | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const deporte = reserva.cancha?.deporte; // la regla del SRS: solo se mueve a una cancha del mismo deporte

  useEffect(() => {
    if (!fecha) return;
    let cancelado = false;
    setCanchas(null);
    setError('');
    apiDisponibilidad(fecha, deporte)
      .then((r) => {
        if (!cancelado) setCanchas(r.canchas);
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeError(e));
      });
    return () => {
      cancelado = true;
    };
  }, [fecha, deporte]);

  async function elegir(cancha: CanchaConTurnos['cancha'], turno: Turno) {
    const ok = window.confirm(`¿Mover tu reserva a ${cancha.nombre}, ${fechaCorta(fecha)} a las ${turno.hora} hs?\nSolo se puede reprogramar una vez.`);
    if (!ok) return;
    setOcupado(true);
    setError('');
    try {
      await apiReprogramar(reserva.id, { canchaId: cancha.id, fecha, hora: turno.hora });
      onListo(`Reserva reprogramada: ${cancha.nombre}, ${fechaCorta(fecha)} a las ${turno.hora} hs.`);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-pasto-200 bg-pasto-50 p-3">
      <p className="text-sm font-semibold">Elegí el nuevo turno (se puede reprogramar una sola vez, sin costo)</p>
      <Campo etiqueta="Nueva fecha">
        <input type="date" className="campo max-w-xs" value={fecha} min={hoy()} max={sumarDias(hoy(), DIAS_ANTICIPACION)} onChange={(e) => setFecha(e.target.value)} />
      </Campo>
      <MensajeError texto={error} />
      {canchas === null && !error && <Cargando texto="Buscando turnos..." />}
      {canchas !== null && !ocupado && <GrillaTurnos canchas={canchas} modo="cliente" onElegir={elegir} />}
      {ocupado && <Cargando texto="Reprogramando..." />}
      <button type="button" className="btn-secundario" onClick={onCerrar}>
        Cerrar
      </button>
    </div>
  );
}
