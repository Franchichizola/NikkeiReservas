import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiGrilla, CanchaConTurnos, Deporte, Turno } from '../api';
import Campo from '../components/Campo';
import GrillaTurnos from '../components/GrillaTurnos';
import { Cargando, MensajeError } from '../components/Mensajes';
import { DEPORTES, fechaCorta, hoy, mensajeError, NOMBRE_DEPORTE, sumarDias } from '../utils';

// Pantalla 4: grilla diaria de recepción. Los colores muestran el estado de cada turno.
// - Clic en un turno libre  -> carga manual de una reserva
// - Clic en un turno con reserva -> detalle (check-in, cobro, ausente)
export default function Recepcion() {
  const navigate = useNavigate();
  const [fecha, setFecha] = useState(hoy());
  const [deporte, setDeporte] = useState<Deporte | ''>(''); // '' = todos los deportes
  const [canchas, setCanchas] = useState<CanchaConTurnos[] | null>(null);
  const [version, setVersion] = useState(0); // al sumarle 1 se vuelve a pedir la grilla
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fecha) return;
    let cancelado = false;
    setError('');
    apiGrilla(fecha, deporte || undefined)
      .then((r) => {
        if (!cancelado) setCanchas(r.dias[0]?.canchas ?? []);
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeError(e));
      });
    return () => {
      cancelado = true;
    };
  }, [fecha, deporte, version]);

  // Se actualiza sola cada 30 segundos para ver los cambios que hacen otras personas
  useEffect(() => {
    const reloj = setInterval(() => setVersion((v) => v + 1), 30000);
    return () => clearInterval(reloj);
  }, []);

  function cambiarFecha(nueva: string) {
    setCanchas(null);
    setFecha(nueva);
  }

  function cambiarDeporte(nuevo: Deporte | '') {
    setCanchas(null);
    setDeporte(nuevo);
  }

  function elegir(cancha: CanchaConTurnos['cancha'], turno: Turno) {
    if (turno.disponible) {
      // Turno libre: se pasan los datos por la dirección para que la pantalla de carga los lea
      const datos = `canchaId=${cancha.id}&cancha=${encodeURIComponent(cancha.nombre)}&fecha=${fecha}&hora=${turno.hora}&precio=${turno.precio ?? ''}`;
      navigate(`/recepcion/nueva?${datos}`);
    } else if (turno.reservaId) {
      navigate(`/recepcion/reserva/${turno.reservaId}`);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-pasto-900"><Users className="h-6 w-6 text-pasto-600" /> Grilla de recepción</h1>

      <div className="tarjeta flex flex-wrap items-end gap-3">
        <button type="button" className="btn-secundario" onClick={() => cambiarFecha(sumarDias(fecha, -1))} aria-label="Día anterior">
          ←
        </button>
        <Campo etiqueta="Fecha">
          <input type="date" className="campo" value={fecha} onChange={(e) => cambiarFecha(e.target.value)} />
        </Campo>
        <button type="button" className="btn-secundario" onClick={() => cambiarFecha(sumarDias(fecha, 1))} aria-label="Día siguiente">
          →
        </button>
        <button type="button" className="btn-secundario" onClick={() => cambiarFecha(hoy())}>
          Hoy
        </button>
        <Campo etiqueta="Deporte">
          <select className="campo" value={deporte} onChange={(e) => cambiarDeporte(e.target.value as Deporte | '')}>
            <option value="">Todos</option>
            {DEPORTES.map((d) => (
              <option key={d} value={d}>
                {NOMBRE_DEPORTE[d]}
              </option>
            ))}
          </select>
        </Campo>
        <button type="button" className="btn-secundario" onClick={() => setVersion((v) => v + 1)}>
          Actualizar
        </button>
      </div>

      {fecha && <p className="text-sm text-gray-600">Mostrando {fechaCorta(fecha)}. Tocá un turno libre para cargar una reserva, o uno ocupado para ver su detalle.</p>}

      <MensajeError texto={error} />
      {canchas === null && !error && <Cargando texto="Cargando la grilla..." />}
      {canchas !== null && <GrillaTurnos canchas={canchas} modo="personal" onElegir={elegir} />}
    </div>
  );
}
