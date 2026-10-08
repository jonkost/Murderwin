import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The phone client. One page, one route, no client-side router (Canon).
export default defineConfig({
  base: '/play/',
  plugins: [react()],
  server: {
    fs: { allow: ['..'] },
  },
})
