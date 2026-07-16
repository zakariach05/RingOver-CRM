import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const BACKEND = 'http://localhost:3001'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Utilisation de regex (^) pour ne pas intercepter les routes frontend exactes
      // ex: /team (frontend) vs /team/members (backend)
      '^/auth/.*': { target: BACKEND, changeOrigin: true },
      '^/team/.*': { target: BACKEND, changeOrigin: true },
      '^/invitations/.*': { target: BACKEND, changeOrigin: true },
      '^/contacts/.*': { target: BACKEND, changeOrigin: true },
      '^/deals/.*': { target: BACKEND, changeOrigin: true },
      '^/api/.*': { target: BACKEND, changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

