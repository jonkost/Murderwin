import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/workshop/',
  plugins: [react()],
  server: {
    // allow importing ../seed/*.json from the repo root
    fs: { allow: ['..'] },
  },
})
