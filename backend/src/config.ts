// Configuración leída del archivo .env
import 'dotenv/config';

export const PORT = Number(process.env.PORT ?? 3000);
export const JWT_SECRET = process.env.JWT_SECRET ?? 'secret123';
export const JWT_EXPIRA = process.env.JWT_EXPIRA ?? '8h';
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? 'webhook_prueba';

// RB-03: se puede reservar hasta 30 días antes
export const DIAS_ANTICIPACION = 30;
