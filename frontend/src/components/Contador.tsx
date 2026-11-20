import { Timer } from 'lucide-react';
import { useEffect, useState } from 'react';

// Cuenta regresiva hasta una fecha (la de "retenidaHasta" que manda el backend).
// Se calcula contra la hora que dice el backend, así que no se desfasa si se recarga la página.
function segundosRestantes(hasta: string): number {
  return Math.max(0, Math.round((new Date(hasta).getTime() - Date.now()) / 1000));
}

export default function Contador({ hasta, onVencido }: { hasta: string; onVencido: () => void }) {
  const [segundos, setSegundos] = useState(segundosRestantes(hasta));

  useEffect(() => {
    // Cada segundo se vuelve a calcular lo que falta
    const reloj = setInterval(() => {
      const s = segundosRestantes(hasta);
      setSegundos(s);
      if (s === 0) {
        clearInterval(reloj);
        onVencido();
      }
    }, 1000);
    return () => clearInterval(reloj); // al salir de la pantalla se apaga el reloj
  }, [hasta]);

  const minutos = String(Math.floor(segundos / 60)).padStart(2, '0');
  const resto = String(segundos % 60).padStart(2, '0');
  // En el último minuto se pone en rojo para que se note la urgencia
  const color = segundos <= 60 ? 'text-red-600' : 'text-pasto-800';

  return (
    <div className="text-center" role="timer">
      <div className={`flex items-center justify-center gap-2 text-4xl font-bold tabular-nums ${color}`}>
        <Timer className="h-7 w-7" />
        {minutos}:{resto}
      </div>
      <div className="text-xs text-gray-500">tiempo para pagar la seña</div>
    </div>
  );
}
