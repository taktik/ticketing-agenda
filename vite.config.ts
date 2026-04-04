import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
  },
  server: {
    port: 3001,
    open: true,
    proxy: {
      '/backend': {
        target: 'https://mouscron.taktik.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
