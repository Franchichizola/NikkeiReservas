// Endpoint que imita el webhook de Mercado Pago (RF005). No usa token de usuario:
// se protege con el encabezado x-webhook-secret.
import { Router } from 'express';
import { leerWebhook } from '../services/mercadoPago';
import { procesarResultadoPago } from '../services/pagos';

export const rutasPagos = Router();

rutasPagos.post('/webhook/mercadopago', async (req, res) => {
  const { externoId, estado } = leerWebhook(req.header('x-webhook-secret'), req.body);
  res.json(await procesarResultadoPago(externoId, estado));
});
