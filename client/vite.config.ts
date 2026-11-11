import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // En développement, Vite relaie /api vers NestJS : le navigateur ne voit
    // qu'une seule origine (localhost:5173), les cookies circulent simplement.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
