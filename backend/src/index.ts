// Punto de entrada: arma la app de Express y arranca el servidor
import cors from 'cors';
import express from 'express';
import { PORT } from './config';
import { manejarErrores, rutaNoEncontrada } from './middleware/errores';
import { liberarRetenidasVencidas } from './services/turnos';
import { rutasAuth } from './routes/auth';
import { rutasBloqueos } from './routes/bloqueos';
import { rutasCaja } from './routes/caja';
import { rutasCanchas } from './routes/canchas';
import { rutasDisponibilidad } from './routes/disponibilidad';
import { rutasPagos } from './routes/pagos';
import { rutasPolitica } from './routes/politica';
import { rutasRecepcion } from './routes/recepcion';
import { rutasReservas } from './routes/reservas';
import { rutasTarifas } from './routes/tarifas';
import { rutasUsuarios } from './routes/usuarios';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', rutasAuth);
app.use('/api/disponibilidad', rutasDisponibilidad);
app.use('/api/reservas', rutasReservas);
app.use('/api/pagos', rutasPagos);
app.use('/api/recepcion', rutasRecepcion);
app.use('/api/bloqueos', rutasBloqueos);
app.use('/api/caja', rutasCaja);
app.use('/api/admin/canchas', rutasCanchas);
app.use('/api/admin/tarifas', rutasTarifas);
app.use('/api/admin/politica', rutasPolitica);
app.use('/api/admin/usuarios', rutasUsuarios);

app.use(rutaNoEncontrada);
app.use(manejarErrores); // siempre al final

// Cada 30 segundos se liberan los turnos retenidos que vencieron
setInterval(() => liberarRetenidasVencidas().catch((e) => console.error('Error liberando retenidas', e)), 30000);

app.listen(PORT, () => console.log(`API de Nikkei Reservas escuchando en http://localhost:${PORT}`));

// TODO (fuera del MVP): turnos fijos semanales, reportes CSV/PDF, auditoría,
// WhatsApp/correo reales y tests automáticos.
