/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind solo genera los estilos de las clases que encuentra en estos archivos
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "pasto": los verdes de una cancha de fútbol (del más claro al más oscuro)
        pasto: {
          50: '#f1f9f2',
          100: '#dcf0df',
          200: '#b8e0bf',
          500: '#2f9e44',
          600: '#238636',
          700: '#1b6e2d',
          800: '#14532d',
          900: '#0d3b20',
        },
        // "tiza": el blanco de las líneas de la cancha; "amarilla": la tarjeta del árbitro (para detalles)
        tiza: '#f7faf5',
        amarilla: '#facc15',
      },
    },
  },
  plugins: [],
};
