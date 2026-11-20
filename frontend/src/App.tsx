// Mapa de páginas: qué pantalla se muestra en cada dirección y quién puede entrar.
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RutaProtegida from './components/RutaProtegida';
import Admin from './pages/Admin';
import Bloqueos from './pages/Bloqueos';
import Caja from './pages/Caja';
import CargaManual from './pages/CargaManual';
import Home from './pages/Home';
import Login from './pages/Login';
import MisReservas from './pages/MisReservas';
import Recepcion from './pages/Recepcion';
import Registro from './pages/Registro';
import ReservaDetalle from './pages/ReservaDetalle';
import Reservar from './pages/Reservar';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Página principal: pública, no obliga a iniciar sesión */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />

        {/* Ver canchas y turnos: pública. Para reservar el botón pide iniciar sesión (RF002) */}
        <Route path="/reservar" element={<Reservar />} />

        {/* Clientes */}
        <Route path="/mis-reservas" element={<RutaProtegida rol="CLIENTE"><MisReservas /></RutaProtegida>} />

        {/* Personal: recepcionista o superior */}
        <Route path="/recepcion" element={<RutaProtegida rol="RECEPCIONISTA"><Recepcion /></RutaProtegida>} />
        <Route path="/recepcion/nueva" element={<RutaProtegida rol="RECEPCIONISTA"><CargaManual /></RutaProtegida>} />
        <Route path="/recepcion/reserva/:id" element={<RutaProtegida rol="RECEPCIONISTA"><ReservaDetalle /></RutaProtegida>} />

        {/* Encargado o superior */}
        <Route path="/bloqueos" element={<RutaProtegida rol="ENCARGADO"><Bloqueos /></RutaProtegida>} />
        <Route path="/caja" element={<RutaProtegida rol="ENCARGADO"><Caja /></RutaProtegida>} />

        {/* Solo administrador */}
        <Route path="/admin" element={<RutaProtegida rol="ADMINISTRADOR"><Admin /></RutaProtegida>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

// TODO (fuera del MVP): turnos fijos semanales, reportes CSV/PDF, auditoría,
// PWA (instalable y offline) y tests automáticos.
