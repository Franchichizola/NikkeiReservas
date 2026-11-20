// Funciones y listas chicas para mostrar fechas, plata y nombres en español.
import { Deporte, MedioPersonal, Pago } from './api';

// Todo el complejo trabaja en hora de Buenos Aires, sin importar dónde esté la persona
const ZONA = 'America/Argentina/Buenos_Aires';

// Reglas del SRS que el cliente necesita para mostrar avisos.
// (La política real se configura en el backend; el cliente no puede consultarla, por eso se repite acá.)
export const HORAS_CANCELACION = 12;
export const DIAS_ANTICIPACION = 30;

export const DEPORTES: Deporte[] = ['FUTBOL5', 'FUTBOL7', 'PADEL'];
export const MEDIOS_PERSONAL: MedioPersonal[] = ['EFECTIVO', 'TRANSFERENCIA', 'QR', 'TARJETA'];

// A qué pantalla manda cada rol después de iniciar sesión
export function panelInicial(rol: string): string {
  return rol === 'CLIENTE' ? '/reservar' : '/recepcion';
}

export const NOMBRE_DEPORTE: Record<string, string> = { FUTBOL5: 'Fútbol 5', FUTBOL7: 'Fútbol 7', PADEL: 'Pádel' };

export const NOMBRE_ROL: Record<string, string> = {
  CLIENTE: 'Cliente',
  RECEPCIONISTA: 'Recepcionista',
  ENCARGADO: 'Encargado/a',
  ADMINISTRADOR: 'Administrador/a',
};

export const NOMBRE_MEDIO: Record<string, string> = {
  MERCADO_PAGO: 'Mercado Pago',
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  QR: 'QR',
  TARJETA: 'Tarjeta',
};

export const NOMBRE_ESTADO: Record<string, string> = {
  LIBRE: 'Libre',
  OCUPADO: 'Ocupado',
  NO_DISPONIBLE: 'No disponible',
  RETENIDA: 'Esperando seña',
  RESERVADA: 'Reservada',
  SENADA: 'Señada',
  EN_JUEGO: 'En juego',
  FINALIZADA: 'Finalizada',
  AUSENTE: 'Ausente',
  BLOQUEADO: 'Bloqueada',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Vencida',
};

// Colores por estado (los usa la grilla y las etiquetas de las reservas)
export const COLOR_ESTADO: Record<string, string> = {
  LIBRE: 'bg-pasto-100 text-pasto-900 border-pasto-500',
  OCUPADO: 'bg-red-100 text-red-800 border-red-300',
  NO_DISPONIBLE: 'bg-gray-100 text-gray-400 border-gray-200',
  RETENIDA: 'bg-yellow-100 text-yellow-900 border-yellow-400',
  RESERVADA: 'bg-orange-100 text-orange-900 border-orange-400',
  SENADA: 'bg-blue-100 text-blue-900 border-blue-400',
  EN_JUEGO: 'bg-purple-100 text-purple-900 border-purple-400',
  FINALIZADA: 'bg-gray-200 text-gray-700 border-gray-300',
  AUSENTE: 'bg-red-200 text-red-900 border-red-400',
  BLOQUEADO: 'bg-slate-700 text-white border-slate-800',
  CANCELADA: 'bg-gray-100 text-gray-500 border-gray-300',
  EXPIRADA: 'bg-gray-100 text-gray-500 border-gray-300',
};

// Fecha de hoy en Buenos Aires, formato AAAA-MM-DD (el que usa el backend)
export function hoy(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ZONA });
}

// Suma (o resta) días a una fecha AAAA-MM-DD
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// "$ 45.000". Si no hay precio (no hay tarifa para ese horario) muestra "—"
export function pesos(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return '$ ' + n.toLocaleString('es-AR');
}

// "2026-11-25" -> "mié 25/11"
export function fechaCorta(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00Z');
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

// Fecha ISO del backend -> "20:00" en hora de Buenos Aires
export function soloHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: ZONA });
}

// Fecha ISO del backend -> "mié 25/11 20:00"
export function fechaHora(iso: string): string {
  const dia = new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: ZONA });
  return `${dia} ${soloHora(iso)}`;
}

// Horas que faltan para una fecha ISO (negativo si ya pasó)
export function horasHasta(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3600000;
}

// Arma "2026-11-25T18:00:00-03:00", el formato que pide el backend en los bloqueos
export function aIsoBuenosAires(fecha: string, hora: string): string {
  return `${fecha}T${hora}:00-03:00`;
}

// Lo que el cliente ya pagó, neto de reembolsos (misma cuenta que hace el backend)
export function totalPagado(pagos: Pago[] = []): number {
  let total = 0;
  for (const p of pagos) {
    if ((p.tipo === 'SENA' || p.tipo === 'SALDO') && p.estado === 'APROBADO') total += p.monto;
    if (p.tipo === 'REEMBOLSO' && p.estado !== 'RECHAZADO') total -= p.monto;
  }
  return total;
}

// Convierte cualquier error en un texto para mostrar en pantalla
export function mensajeError(e: unknown): string {
  return e instanceof Error ? e.message : 'Ocurrió un error inesperado';
}
