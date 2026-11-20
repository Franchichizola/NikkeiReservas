import { FormEvent, useEffect, useState } from 'react';
import { apiGuardarPolitica, apiPolitica, Politica } from '../api';
import { mensajeError } from '../utils';
import Campo from './Campo';
import { Cargando, MensajeError, MensajeOk } from './Mensajes';

// Los 8 parámetros de política que acepta el backend, con su texto y sus límites
const CAMPOS = [
  { clave: 'senaPorcentaje', etiqueta: 'Seña (% del valor del turno)', min: 1, max: 100 },
  { clave: 'horasCancelacion', etiqueta: 'Horas de anticipación para cancelar con reembolso', min: 0, max: 72 },
  { clave: 'retencionMinutos', etiqueta: 'Minutos que se retiene un turno sin pagar', min: 1, max: 60 },
  { clave: 'minutosAusencia', etiqueta: 'Minutos desde el inicio para poder marcar ausente', min: 1, max: 120 },
  { clave: 'ausenciasMax', etiqueta: 'Ausencias que obligan a pagar el total', min: 1, max: 20 },
  { clave: 'ausenciasDias', etiqueta: 'Período en que se cuentan las ausencias (días)', min: 1, max: 365 },
  { clave: 'horaApertura', etiqueta: 'Hora de apertura', min: 0, max: 23 },
  { clave: 'horaCierre', etiqueta: 'Hora de cierre', min: 1, max: 24 },
];

// Administración de los parámetros de política (seña, cancelación, ausencias, horario)
export default function AdminPolitica() {
  const [politica, setPolitica] = useState<Politica | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    apiPolitica()
      .then(setPolitica)
      .catch((e) => setError(mensajeError(e)));
  }, []);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!politica) return;
    setError('');
    setAviso('');
    setGuardando(true);
    try {
      // Se mandan solo los 8 parámetros (sin el "id" que viene del backend)
      const datos: Politica = {};
      for (const c of CAMPOS) datos[c.clave] = politica[c.clave];
      setPolitica(await apiGuardarPolitica(datos));
      setAviso('Política guardada. Los cambios valen para las nuevas reservas.');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  if (!politica) return error ? <MensajeError texto={error} /> : <Cargando />;

  return (
    <form onSubmit={guardar} className="tarjeta space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS.map((c) => (
          <Campo key={c.clave} etiqueta={c.etiqueta}>
            <input
              className="campo"
              type="number"
              required
              min={c.min}
              max={c.max}
              value={politica[c.clave]}
              onChange={(e) => setPolitica({ ...politica, [c.clave]: Number(e.target.value) })}
            />
          </Campo>
        ))}
      </div>
      <MensajeOk texto={aviso} />
      <MensajeError texto={error} />
      <button type="submit" className="btn-primario" disabled={guardando}>
        {guardando ? 'Guardando...' : 'Guardar política'}
      </button>
    </form>
  );
}
