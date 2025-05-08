// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/Hirsch-Architekten-Website-main/', // Oder '/' je nach Hosting
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        about: 'about.html',
        projects: 'projects.html',
        jobs: 'jobs.html',
        project_detail: 'project_detail.html', // Für dynamische Projektdetails
        member_detail: 'member_detail.html'   // NEU: Für dynamische Teammitglied-Details
      }
    }
  },
  server: {
    port: 5173,
    open: true,
  }
})