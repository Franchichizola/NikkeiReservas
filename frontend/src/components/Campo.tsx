import { ReactNode } from 'react';

// Una etiqueta con su campo de formulario abajo. Uso: <Campo etiqueta="Email"><input className="campo" /></Campo>
export default function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{etiqueta}</span>
      {children}
    </label>
  );
}
