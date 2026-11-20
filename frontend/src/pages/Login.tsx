import { FormEvent, useState } from 'react';
import { LogIn } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import Campo from '../components/Campo';
import { MensajeError } from '../components/Mensajes';
import { mensajeError, panelInicial } from '../utils';

// Pantalla 1a: inicio de sesión
export default function Login() {
  const { usuario, entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Si ya hay sesión no tiene sentido ver el login
  if (usuario) return <Navigate to={panelInicial(usuario.rol)} replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault(); // evita que el navegador recargue la página
    setError('');
    setEnviando(true);
    try {
      await entrar(email, password);
      // Al guardarse la sesión, la línea "if (usuario)" de arriba lo manda a su pantalla
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="flex items-center gap-2 mb-4 text-2xl font-bold text-pasto-900"><LogIn className="h-6 w-6 text-pasto-600" /> Iniciar sesión</h1>
      <form onSubmit={enviar} className="tarjeta space-y-4">
        <Campo etiqueta="Email">
          <input className="campo" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
        <Campo etiqueta="Contraseña">
          <input className="campo" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Campo>
        <MensajeError texto={error} />
        <button type="submit" className="btn-primario w-full" disabled={enviando}>
          {enviando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        ¿No tenés cuenta?{' '}
        <Link to="/registro" className="font-medium text-pasto-700 underline">
          Registrate
        </Link>
      </p>
    </div>
  );
}
