import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: el build funciona en cualquier subruta (p. ej. GitHub Pages /zenity/).
  base: './',
  plugins: [react()],
  server: {
    host: true,
  },
  build: {
    rolldownOptions: {
      output: {
        // Librerías en chunks propios: se cachean entre despliegues.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'router', test: /node_modules[\\/]react-router/ },
            { name: 'motion', test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/ },
          ],
        },
      },
    },
  },
})
