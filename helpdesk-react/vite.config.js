import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In production the React app and the backend live on the same origin
// (Nginx serves the React build + reverse-proxies /api and /uploads to
// the Node process). In dev, Vite proxies the same paths to the local
// backend so the React code can use relative URLs everywhere.
export default defineConfig({
  plugins: [react()],
  // Output built JS/CSS to dist/static/ instead of the default dist/assets/.
  // /assets is one of our SPA routes (My Assets page) and on the server it
  // collided with this folder, making Nginx return 403 instead of serving
  // index.html for the SPA fallback.
  build: {
    assetsDir: 'static',
  },
  server: {
    port: 8090,
    proxy: {
      '/api':     'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
})
