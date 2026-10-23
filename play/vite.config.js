import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The phone client. One page, one route, no client-side router (Canon).
export default defineConfig({
  base: '/play/',
  plugins: [react()],
  server: {
    // the preview imports functions/lib from the repo, so the dev server may read the repo,
    // but never the admin key, an env file, Jon's chats or anything sealed: the play-5175
    // preview listens on the house wifi
    fs: {
      allow: ['..'],
      deny: ['.env', '.env.*', '*.{crt,pem,key}', '**/.git/**', '**/service-account*.json', '**/chats/**', '**/sealed*', '**/murderwin-handoff*/**'],
    },
  },
})
