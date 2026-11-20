// Mensajes chicos que se repiten en todas las pantallas: cargando, error y éxito.
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function Cargando({ texto = 'Cargando...' }: { texto?: string }) {
  return (
    <div className="flex items-center gap-2 p-4 text-gray-600" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-pasto-600" />
      {texto}
    </div>
  );
}

// Si "texto" está vacío no muestra nada, así se puede dejar siempre puesto en la pantalla
export function MensajeError({ texto }: { texto: string }) {
  if (!texto) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{texto}</span>
    </div>
  );
}

export function MensajeOk({ texto }: { texto: string }) {
  if (!texto) return null;
  return (
    <div role="status" className="flex items-start gap-2 rounded-lg border border-pasto-200 bg-pasto-50 px-3 py-2 text-sm text-pasto-800">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{texto}</span>
    </div>
  );
}
