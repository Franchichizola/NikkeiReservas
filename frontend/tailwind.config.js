/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
        tiza: '#f7faf5',
        amarilla: '#facc15',
      },
    },
  },
  plugins: [],
};
