// Notificaciones. Por ahora solo se muestran en la consola.
// TODO: reemplazar por WhatsApp Business Cloud API y correo (Resend) y recordatorios 24 h / 2 h antes.
export function notificar(destino: { nombre: string; email?: string | null; telefono?: string | null }, mensaje: string) {
  const contacto = destino.telefono ?? destino.email ?? 'sin contacto';
  console.log(`[NOTIFICACIÓN] Para ${destino.nombre} (${contacto}): ${mensaje}`);
}
