import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The build's stamp (A5, 12 Nov 2026): compiled into the page and written beside it as build.json, so an
// open screen can tell a newer site from its own and reload itself at a quiet moment (src/lib/freshness.js).
// An ISO time, so a newer build always sorts after an older one. The dev server has none, and never reloads.
const BUILD_STAMP = new Date().toISOString()

function buildStamp() {
  return {
    name: 'murderwin-build-stamp',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'build.json', source: JSON.stringify({ stamp: BUILD_STAMP }) + '\n' })
    },
  }
}

// The phone client. One page, one route, no client-side router (Canon).
export default defineConfig(({ command }) => ({
  base: '/play/',
  plugins: [react(), buildStamp()],
  define: { __BUILD_STAMP__: JSON.stringify(command === 'build' ? BUILD_STAMP : '') },
  server: {
    // the preview imports functions/lib from the repo, so the dev server may read the repo,
    // but never the admin key, an env file, Jon's chats or anything sealed: the play-5175
    // preview listens on the house wifi
    fs: {
      allow: ['..'],
      deny: ['.env', '.env.*', '*.{crt,pem,key}', '**/.git/**', '**/service-account*.json', '**/chats/**', '**/sealed*', '**/murderwin-handoff*/**'],
    },
  },
}))
