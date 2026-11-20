import { CanchaConTurnos, Turno } from '../api';
import { COLOR_ESTADO, NOMBRE_ESTADO, pesos } from '../utils';

// Grilla de turnos, una tarjeta por cancha. La usan dos pantallas:
// - modo "cliente":  estados LIBRE / OCUPADO / NO_DISPONIBLE (solo se puede elegir un turno libre)
// - modo "personal": estado real de cada reserva, con el nombre del cliente
interface Props {
  canchas: CanchaConTurnos[];
  modo: 'cliente' | 'personal';
  onElegir?: (cancha: CanchaConTurnos['cancha'], turno: Turno) => void;
}

// ¿Tiene sentido hacer clic en este turno?
function sePuedeElegir(turno: Turno, modo: 'cliente' | 'personal'): boolean {
  if (modo === 'cliente') return turno.estado === 'LIBRE';
  // Personal: un turno libre para cargar una reserva, o uno con reserva para ver su detalle
  return Boolean(turno.disponible) || (turno.reservaId !== null && turno.reservaId !== undefined);
}

// Estados que se explican en la leyenda de cada modo
const LEYENDA = {
  cliente: ['LIBRE', 'OCUPADO', 'NO_DISPONIBLE'],
  personal: ['LIBRE', 'RETENIDA', 'RESERVADA', 'SENADA', 'EN_JUEGO', 'FINALIZADA', 'AUSENTE', 'BLOQUEADO'],
};

export default function GrillaTurnos({ canchas, modo, onElegir }: Props) {
  if (canchas.length === 0) {
    return <p className="text-gray-600">No hay canchas para mostrar con este filtro.</p>;
  }

  return (
    <div className="space-y-4">
      {canchas.map(({ cancha, turnos }) => (
        <section key={cancha.id} className="tarjeta">
          <h3 className="mb-3 font-semibold">
            {cancha.nombre} <span className="text-sm font-normal text-gray-500">· turnos de {cancha.duracionMin} min</span>
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {turnos.map((t) => {
              const activo = sePuedeElegir(t, modo);
              const color = COLOR_ESTADO[t.estado] ?? COLOR_ESTADO.NO_DISPONIBLE;
              // En modo personal se muestra quién reservó; si no hay cliente, el estado
              const detalle = modo === 'personal' && t.cliente ? `${t.cliente.nombre} ${t.cliente.apellido}` : NOMBRE_ESTADO[t.estado] ?? t.estado;
              return (
                <button
                  key={t.hora}
                  type="button"
                  disabled={!activo}
                  onClick={() => onElegir?.(cancha, t)}
                  className={`rounded-lg border px-2 py-2 text-left disabled:cursor-default ${color} ${activo ? 'hover:brightness-95' : ''}`}
                >
                  <div className="font-semibold">{t.hora}</div>
                  <div className="truncate text-xs">{detalle}</div>
                  <div className="text-xs font-medium">{pesos(t.precio)}</div>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {/* Leyenda de colores */}
      <div className="flex flex-wrap gap-2 text-xs">
        {LEYENDA[modo].map((estado) => (
          <span key={estado} className={`rounded border px-2 py-1 ${COLOR_ESTADO[estado]}`}>
            {NOMBRE_ESTADO[estado]}
          </span>
        ))}
      </div>
    </div>
  );
}
