import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In production the React app and the backend live on the same origin
// (Nginx serves the React build + reverse-proxies /api and /uploads to
// the Node process). In dev, Vite proxies the same paths to the local
// backend so the React code can use relative URLs everywhere.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8090,
    proxy: {
      '/api':     'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
})
