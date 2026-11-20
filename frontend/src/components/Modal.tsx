import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

// Ventana emergente (pop up): oscurece el fondo y se cierra con la X, con Esc o tocando afuera.
export default function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    function alApretarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar();
    }
    window.addEventListener('keydown', alApretarTecla);
    return () => window.removeEventListener('keydown', alApretarTecla); // al cerrarse se deja de escuchar
  }, []);

  return (
    // En el celular sube desde abajo; en pantallas grandes queda centrado
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()} // tocar adentro no lo cierra
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-4 border-amarilla bg-pasto-800 px-4 py-3 text-white">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1 hover:bg-pasto-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-4">{children}</div>
      </div>
    </div>
  );
}
