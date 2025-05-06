// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  // Base public path when served in production.
  // WICHTIG: Ändere dies auf '/', wenn du direkt auf einer Domain (z.B. username.github.io) hostest.
  // Behalte '/repo-name/', wenn du in einem Unterordner hostest (z.B. username.github.io/repo-name/).
  // Für GitHub Pages mit dem Namen "Hirsch-Architekten-Website-main":
  base: '/Hirsch-Architekten-Website-main/', // <-- ANPASSEN, falls dein Repo anders heißt oder du woanders hostest!

  build: {
    outDir: 'dist', // Der Ausgabeordner für den Build
    rollupOptions: {
      // Definiere alle HTML-Dateien als Einstiegspunkte für den Build
      input: {
        main: 'index.html',
        about: 'about.html',
        projects: 'projects.html',
        jobs: 'jobs.html'
        // Falls du später eine project_detail.html statisch nutzt, hier hinzufügen:
        // project_detail: 'project_detail.html'
      }
    }
  },
  server: {
    port: 5173, // Du kannst diesen Port ändern, falls 5173 belegt ist
    open: true, // Öffnet den Browser automatisch beim Start
  }
})