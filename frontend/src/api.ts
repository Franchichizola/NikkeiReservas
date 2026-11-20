// =====================================================================
// api.ts — TODAS las llamadas al backend viven en este archivo.
// Las pantallas nunca usan fetch directamente: llaman a las funciones "api...".
// Así, si cambia una ruta del backend, se corrige en un solo lugar.
// =====================================================================

// ---------- Tipos: la forma de los datos que devuelve el backend ----------
export type Rol = 'CLIENTE' | 'RECEPCIONISTA' | 'ENCARGADO' | 'ADMINISTRADOR';
export type Deporte = 'FUTBOL5' | 'FUTBOL7' | 'PADEL';
export type MedioPersonal = 'EFECTIVO' | 'TRANSFERENCIA' | 'QR' | 'TARJETA';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string | null;
  rol: Rol;
  activo: boolean;
}

export interface Pago {
  id: number;
  reservaId: number;
  tipo: 'SENA' | 'SALDO' | 'REEMBOLSO';
  medio: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  monto: number;
  externoId: string | null;
  creadoEn: string;
}

export interface ClienteBasico {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string | null;
}

export interface ClienteBusqueda extends ClienteBasico {
  email: string | null;
}

export interface Reserva {
  id: number;
  canchaId: number;
  clienteId: number;
  inicio: string; // fecha y hora en formato ISO (UTC)
  fin: string;
  estado: string; // RETENIDA, RESERVADA, SENADA, EN_JUEGO, FINALIZADA, AUSENTE, CANCELADA, EXPIRADA
  precio: number;
  montoSena: number;
  pagoTotalRequerido: boolean;
  reprogramada: boolean;
  retenidaHasta: string | null;
  cancha?: { id: number; nombre: string; deporte?: Deporte };
  cliente?: ClienteBasico;
  pagos?: Pago[];
}

// Un turno de la grilla. Los campos de "personal" solo vienen en la grilla de recepción.
export interface Turno {
  hora: string; // "20:00"
  inicio: string;
  fin: string;
  precio: number | null;
  estado: string; // cliente: LIBRE | OCUPADO | NO_DISPONIBLE — personal: el estado real de la reserva
  disponible?: boolean;
  reservaId?: number | null;
  cliente?: ClienteBasico | null;
}

export interface CanchaConTurnos {
  cancha: { id: number; nombre: string; deporte: Deporte; duracionMin: number };
  turnos: Turno[];
}

export interface Cancha {
  id: number;
  nombre: string;
  deporte: Deporte;
  duracionMin: number;
  activa: boolean;
}

export interface Tarifa {
  id: number;
  deporte: Deporte;
  horaDesde: number;
  horaHasta: number;
  precio: number;
}

// Parámetros de política: { senaPorcentaje: 30, horasCancelacion: 12, ... }
export type Politica = Record<string, number>;

export interface Bloqueo {
  id: number;
  canchaId: number;
  inicio: string;
  fin: string;
  motivo: string;
  cancha: { id: number; nombre: string };
}

export interface CierreCaja {
  id: number;
  fecha: string;
  totalCobrado: number;
  totalReembolsos: number;
  efectivoEsperado: number;
  efectivoContado: number;
  diferencia: number;
  observacion: string | null;
}

export interface ResumenCaja {
  fecha: string;
  porMedio: Record<string, { cobrado: number; reembolsado: number }>;
  totalCobrado: number;
  totalReembolsos: number;
  neto: number;
  efectivoEsperado: number;
  turnosSinResolver: { reservaId: number; estado: string; inicio: string }[];
  cierre: CierreCaja | null;
}

export interface Comprobante {
  codigoReserva: number;
  cancha: string;
  inicio: string;
  precioTotal: number;
  pagadoAntes: number;
  saldoCobrado: number;
  medio: string;
  emitido: string;
}

export interface DatosRegistro {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password: string;
  aceptaTerminos: boolean;
}

export interface DatosReservaManual {
  canchaId: number;
  fecha: string;
  hora: string;
  clienteId?: number;
  cliente?: { nombre: string; apellido?: string; telefono: string };
  sena?: { medio: MedioPersonal; monto: number };
}

export interface AccionBloqueo {
  reservaId: number;
  accion: 'CANCELAR' | 'REPROGRAMAR';
  fecha?: string;
  hora?: string;
}

// ---------- Configuración y token ----------
// La URL base sale del archivo .env (VITE_API_URL). Se le quita la "/" final si la tiene.
const URL_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const CLAVE_TOKEN = 'nikkei_token';

export function leerToken(): string | null {
  return localStorage.getItem(CLAVE_TOKEN);
}
export function guardarToken(token: string) {
  localStorage.setItem(CLAVE_TOKEN, token);
}
export function borrarToken() {
  localStorage.removeItem(CLAVE_TOKEN);
}

// ---------- Función base: todas las llamadas pasan por acá ----------
// Error con el código HTTP y los datos extra que manda el backend (ej. la lista de un 409)
export class ErrorApi extends Error {
  estado: number;
  datos: any;
  constructor(mensaje: string, estado: number, datos: any) {
    super(mensaje);
    this.estado = estado;
    this.datos = datos;
  }
}

interface Opciones {
  sinToken?: boolean; // true = no mandar el token (login, registro, webhook, rutas públicas)
  cabeceras?: Record<string, string>;
}

// <T> solo le dice a TypeScript qué forma tiene la respuesta (ej. pedir<Usuario[]>)
async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown, opciones: Opciones = {}): Promise<T> {
  const cabeceras: Record<string, string> = { ...opciones.cabeceras };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';

  // Se agrega el token JWT a todos los pedidos que lo necesitan
  const token = opciones.sinToken ? null : leerToken();
  if (token) cabeceras['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(URL_BASE + ruta, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi('No se pudo conectar con el servidor. Revisá que el backend esté encendido y que VITE_API_URL sea correcta.', 0, null);
  }

  let datos: any = null;
  try {
    datos = await res.json();
  } catch {
    // respuesta sin cuerpo: no pasa nada
  }

  if (!res.ok) {
    // Token vencido o inválido: se cierra la sesión y se vuelve al login
    if (res.status === 401 && token) {
      borrarToken();
      window.location.href = '/login';
    }
    // El backend responde { error: "mensaje" } y, si falla la validación, { detalles: [...] }
    let mensaje: string = datos?.error ?? `Error ${res.status}`;
    if (Array.isArray(datos?.detalles)) {
      mensaje += ': ' + datos.detalles.map((d: any) => `${d.campo} (${d.mensaje})`).join('. ');
    }
    throw new ErrorApi(mensaje, res.status, datos);
  }
  return datos as T;
}

// ---------- Autenticación ----------
export function apiLogin(email: string, password: string) {
  return pedir<{ token: string; usuario: Usuario }>('POST', '/api/auth/login', { email, password }, { sinToken: true });
}
export function apiRegistro(datos: DatosRegistro) {
  return pedir<{ token: string; usuario: Usuario }>('POST', '/api/auth/registro', datos, { sinToken: true });
}
export function apiMe() {
  return pedir<Usuario>('GET', '/api/auth/me');
}

// ---------- Disponibilidad (pública) ----------
export function apiDisponibilidad(fecha: string, deporte?: Deporte, canchaId?: number) {
  const filtro = (deporte ? `&deporte=${deporte}` : '') + (canchaId ? `&canchaId=${canchaId}` : '');
  return pedir<{ fecha: string; canchas: CanchaConTurnos[] }>('GET', `/api/disponibilidad?fecha=${fecha}${filtro}`, undefined, { sinToken: true });
}

// ---------- Reservas del cliente ----------
export function apiReservar(canchaId: number, fecha: string, hora: string) {
  return pedir<{ reserva: Reserva; mensaje: string }>('POST', '/api/reservas', { canchaId, fecha, hora });
}
export function apiMisReservas() {
  return pedir<Reserva[]>('GET', '/api/reservas/mias');
}
export function apiPagarSena(id: number) {
  return pedir<{ pagoId: number; externoId: string; monto: number }>('POST', `/api/reservas/${id}/pagar-sena`);
}
export function apiCancelar(id: number) {
  return pedir<{ reserva: Reserva; reembolsado: number; mensaje: string }>('POST', `/api/reservas/${id}/cancelar`);
}
export function apiReprogramar(id: number, destino: { canchaId: number; fecha: string; hora: string }) {
  return pedir<Reserva>('POST', `/api/reservas/${id}/reprogramar`, destino);
}

// ---------- Pago simulado ----------
// Imita el aviso (webhook) que Mercado Pago mandaría al backend cuando el pago se aprueba.
// Con Mercado Pago real esta función se borra: el aviso llega directo al backend.
export function apiSimularWebhook(externoId: string, status: 'approved' | 'rejected' | 'pending') {
  const secreto = import.meta.env.VITE_WEBHOOK_SECRET ?? '';
  return pedir<{ mensaje: string }>('POST', '/api/pagos/webhook/mercadopago', { externoId, status }, {
    sinToken: true,
    cabeceras: { 'x-webhook-secret': secreto },
  });
}

// ---------- Recepción ----------
export function apiGrilla(fecha: string, deporte?: Deporte) {
  const filtro = deporte ? `&deporte=${deporte}` : '';
  return pedir<{ dias: { fecha: string; canchas: CanchaConTurnos[] }[] }>('GET', `/api/recepcion/grilla?fecha=${fecha}&dias=1${filtro}`);
}
export function apiBuscarClientes(texto: string) {
  return pedir<ClienteBusqueda[]>('GET', `/api/recepcion/clientes?q=${encodeURIComponent(texto)}`);
}
export function apiCargarReserva(datos: DatosReservaManual) {
  return pedir<Reserva>('POST', '/api/recepcion/reservas', datos);
}
export function apiDetalleReserva(id: number) {
  return pedir<Reserva>('GET', `/api/recepcion/reservas/${id}`);
}
export function apiCheckin(id: number) {
  return pedir<Reserva>('POST', `/api/recepcion/reservas/${id}/checkin`);
}
export function apiCobrarSaldo(id: number, medio: MedioPersonal) {
  return pedir<{ comprobante: Comprobante }>('POST', `/api/recepcion/reservas/${id}/cobrar-saldo`, { medio });
}
export function apiAusente(id: number) {
  return pedir<{ mensaje: string; ausenciasEnPeriodo: number; exigePagoTotal: boolean }>('POST', `/api/recepcion/reservas/${id}/ausente`);
}
export function apiCancelarRecepcion(id: number, exceptuar: boolean, motivo: string) {
  return pedir<{ reembolsado: number; mensaje: string }>('POST', `/api/recepcion/reservas/${id}/cancelar`, {
    exceptuar,
    motivo: motivo || undefined,
  });
}

// ---------- Bloqueos (encargado) ----------
export function apiBloqueos() {
  return pedir<Bloqueo[]>('GET', '/api/bloqueos');
}
export function apiAfectadas(canchaIds: number[], desde: string, hasta: string) {
  const q = `canchaIds=${canchaIds.join(',')}&desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
  return pedir<Reserva[]>('GET', `/api/bloqueos/afectadas?${q}`);
}
export function apiCrearBloqueo(datos: { canchaIds: number[]; desde: string; hasta: string; motivo: string; acciones: AccionBloqueo[] }) {
  return pedir<{ reservasGestionadas: number }>('POST', '/api/bloqueos', datos);
}
export function apiLevantarBloqueo(id: number) {
  return pedir<{ mensaje: string }>('DELETE', `/api/bloqueos/${id}`);
}

// ---------- Caja (encargado) ----------
export function apiResumenCaja(fecha: string) {
  return pedir<ResumenCaja>('GET', `/api/caja/resumen?fecha=${fecha}`);
}
export function apiCerrarCaja(fecha: string, efectivoContado: number, observacion: string) {
  return pedir<CierreCaja>('POST', '/api/caja/cierre', { fecha, efectivoContado, observacion: observacion || undefined });
}
export function apiReabrirCaja(fecha: string, motivo: string) {
  return pedir<{ mensaje: string }>('POST', '/api/caja/reabrir', { fecha, motivo });
}

// ---------- Administración (solo administrador) ----------
export function apiCanchas() {
  return pedir<Cancha[]>('GET', '/api/admin/canchas');
}
export function apiCrearCancha(datos: { nombre: string; deporte: Deporte; duracionMin?: number }) {
  return pedir<Cancha>('POST', '/api/admin/canchas', datos);
}
export function apiEditarCancha(id: number, datos: { nombre?: string; duracionMin?: number; activa?: boolean }) {
  return pedir<Cancha>('PATCH', `/api/admin/canchas/${id}`, datos);
}
export function apiTarifas() {
  return pedir<Tarifa[]>('GET', '/api/admin/tarifas');
}
export function apiCrearTarifa(datos: Omit<Tarifa, 'id'>) {
  return pedir<Tarifa>('POST', '/api/admin/tarifas', datos);
}
export function apiEditarTarifa(id: number, datos: Omit<Tarifa, 'id' | 'deporte'>) {
  return pedir<Tarifa>('PATCH', `/api/admin/tarifas/${id}`, datos);
}
export function apiPolitica() {
  return pedir<Politica>('GET', '/api/admin/politica');
}
export function apiGuardarPolitica(datos: Politica) {
  return pedir<Politica>('PATCH', '/api/admin/politica', datos);
}

// TODO (fuera del MVP): turnos fijos semanales, reportes CSV/PDF, auditoría, PWA y tests.
// TODO: pantalla de usuarios del personal (el backend ya tiene /api/admin/usuarios).
