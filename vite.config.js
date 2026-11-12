import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    // three.js is one chunk of its own, fetched only as the wall comes near
    chunkSizeWarningLimit: 700,
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
