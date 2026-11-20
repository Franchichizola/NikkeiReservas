// Manejo de fechas. Buenos Aires es UTC-3 todo el año (no tiene horario de verano),
// así que usamos ese desfase fijo. En la BD todo se guarda en UTC.
const OFFSET_HORAS = 3;

// "2026-11-25" + "18:30" -> Date
export function aFecha(fecha: string, hora = '00:00'): Date {
  return new Date(`${fecha}T${hora}:00-03:00`);
}

// Date -> "2026-11-25" (día en Buenos Aires)
export function fechaLocal(d: Date): string {
  return new Date(d.getTime() - OFFSET_HORAS * 3600000).toISOString().slice(0, 10);
}

export function sumarMinutos(d: Date, minutos: number): Date {
  return new Date(d.getTime() + minutos * 60000);
}

// Rango [inicio, fin) de un día en Buenos Aires
export function rangoDelDia(fecha: string) {
  const inicio = aFecha(fecha);
  return { inicio, fin: sumarMinutos(inicio, 1440) };
}
