// =====================================================================
// SIMULACIÓN DE MERCADO PAGO.
// Este es el ÚNICO archivo que hay que reemplazar para usar Mercado Pago de verdad:
//   - crearCobroSena  -> crear la preferencia de Checkout Pro y devolver su id y su URL
//   - leerWebhook     -> validar la firma del aviso y consultar el pago a la API de MP
//   - reembolsar      -> pedir el reembolso a la API de MP
// El resto del sistema (services/pagos.ts) no cambia.
// =====================================================================
import { z } from 'zod';
import { WEBHOOK_SECRET } from '../config';
import { ErrorHttp } from '../middleware/errores';

// Simula "crear el link de pago". Devuelve el id del pago y la URL donde pagaría el cliente.
export async function crearCobroSena(datos: { reservaId: number; monto: number; descripcion: string }) {
  const externoId = `SIM-${datos.reservaId}-${Date.now()}`;
  console.log(`[MP SIMULADO] Cobro creado ${externoId} por $${datos.monto} (${datos.descripcion})`);
  return { externoId, urlPago: `https://mercadopago.simulado/checkout/${externoId}` };
}

// Simula el aviso (webhook) que MP manda al sistema. Formato simulado:
// { "externoId": "SIM-1-123", "status": "approved" | "rejected" | "pending" }
export function leerWebhook(secretoRecibido: string | undefined, body: unknown) {
  if (secretoRecibido !== WEBHOOK_SECRET) throw new ErrorHttp(401, 'Webhook no autorizado');
  const datos = z
    .object({ externoId: z.string().min(1), status: z.enum(['approved', 'rejected', 'pending']) })
    .parse(body);
  return { externoId: datos.externoId, estado: datos.status };
}

// Simula un reembolso. Devuelve true si MP lo aceptó.
export async function reembolsar(externoId: string, monto: number): Promise<boolean> {
  console.log(`[MP SIMULADO] Reembolso de $${monto} del pago ${externoId}`);
  return true;
}
