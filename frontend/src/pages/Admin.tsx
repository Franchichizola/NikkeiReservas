import { useState } from 'react';
import { Settings } from 'lucide-react';
import AdminCanchas from '../components/AdminCanchas';
import AdminPolitica from '../components/AdminPolitica';
import AdminTarifas from '../components/AdminTarifas';

// Pantalla 7: administración. Tres secciones con pestañas; cada una es un componente aparte.
const PESTANAS = [
  { id: 'canchas', texto: 'Canchas' },
  { id: 'tarifas', texto: 'Tarifas' },
  { id: 'politica', texto: 'Política' },
];

export default function Admin() {
  const [pestana, setPestana] = useState('canchas');

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-pasto-900"><Settings className="h-6 w-6 text-pasto-600" /> Administración</h1>
      <div className="flex gap-2">
        {PESTANAS.map((p) => (
          <button key={p.id} type="button" className={p.id === pestana ? 'btn-primario' : 'btn-secundario'} onClick={() => setPestana(p.id)}>
            {p.texto}
          </button>
        ))}
      </div>

      {pestana === 'canchas' && <AdminCanchas />}
      {pestana === 'tarifas' && <AdminTarifas />}
      {pestana === 'politica' && <AdminPolitica />}
    </div>
  );
}
