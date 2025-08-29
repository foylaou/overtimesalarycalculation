import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/

export default defineConfig({
  base: '/overtimesalarycalculation/',
  plugins: [react(),
     tailwindcss(),
      VitePWA({
          registerType: 'autoUpdate',
          devOptions: {
              enabled: true
          },
          workbox: {
              globPatterns: ['**/*.{js,css,html,ico,png,svg}']
          }
      })
  ],
})
