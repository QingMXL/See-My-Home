import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/home-layout': {
        target: 'http://127.0.0.1:4317',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api\/home-layout/, '/api/site/layout'),
      },
      '/api/home-style': {
        target: 'http://127.0.0.1:4318',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api\/home-style/, '/api/site/style'),
      },
    },
  },
})
