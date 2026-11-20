import { FormEvent, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import Campo from '../components/Campo';
import { MensajeError } from '../components/Mensajes';
import { mensajeError, panelInicial } from '../utils';

// Pantalla 1b: registro de clientes (el personal lo da de alta el administrador)
export default function Registro() {
  const { usuario, registrarse } = useAuth();
  // Un solo objeto para todo el formulario, así no hay un useState por campo
  const [datos, setDatos] = useState({ nombre: '', apellido: '', email: '', telefono: '', password: '' });
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={panelInicial(usuario.rol)} replace />;

  // Cambia un solo campo y deja el resto igual
  function cambiar(campo: string, valor: string) {
    setDatos({ ...datos, [campo]: valor });
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!acepta) {
      setError('Tenés que aceptar la política de privacidad para registrarte.');
      return;
    }
    setEnviando(true);
    try {
      await registrarse({ ...datos, aceptaTerminos: true });
      // Al guardarse la sesión, la línea "if (usuario)" de arriba lo manda a reservar
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="flex items-center gap-2 mb-4 text-2xl font-bold text-pasto-900"><UserPlus className="h-6 w-6 text-pasto-600" /> Crear cuenta</h1>
      <form onSubmit={enviar} className="tarjeta space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre">
            <input className="campo" required value={datos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
          </Campo>
          <Campo etiqueta="Apellido">
            <input className="campo" required value={datos.apellido} onChange={(e) => cambiar('apellido', e.target.value)} />
          </Campo>
        </div>
        <Campo etiqueta="Email">
          <input className="campo" type="email" required autoComplete="email" value={datos.email} onChange={(e) => cambiar('email', e.target.value)} />
        </Campo>
        <Campo etiqueta="Teléfono (WhatsApp)">
          <input className="campo" type="tel" required minLength={6} value={datos.telefono} onChange={(e) => cambiar('telefono', e.target.value)} />
        </Campo>
        <Campo etiqueta="Contraseña (mínimo 8 caracteres)">
          <input className="campo" type="password" required minLength={8} autoComplete="new-password" value={datos.password} onChange={(e) => cambiar('password', e.target.value)} />
        </Campo>
        {/* Ley 25.326: hay que aceptar el tratamiento de los datos personales */}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
          <span>Acepto la política de privacidad y el tratamiento de mis datos personales.</span>
        </label>
        <MensajeError texto={error} />
        <button type="submit" className="btn-primario w-full" disabled={enviando}>
          {enviando ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="font-medium text-pasto-700 underline">
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
