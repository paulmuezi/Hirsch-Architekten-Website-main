// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  // Base public path when served in production (GitHub Pages)
  base: '/Hirsch-Architekten-Website-main/', // <-- HIER DEINEN REPO-NAMEN EINTRAGEN!
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173, // Kannst du ändern
    open: true,
  }
})