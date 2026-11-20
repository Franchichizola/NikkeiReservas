import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración mínima de Vite: solo agrega el soporte para React
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
