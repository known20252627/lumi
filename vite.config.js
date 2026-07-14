import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10 MB
      },
      manifest: {
        name: 'Lumi AI',
        short_name: 'Lumi',
        description: 'Your Personal AI Coding Assistant',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        icons: [
          { src: 'lumi.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'lumi.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, '')
      },
      '/api/groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/groq/, '')
      },
      '/api/sarvam': {
        target: 'https://api.sarvam.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sarvam/, '')
      },
      '/api/cerebras': {
        target: 'https://api.cerebras.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cerebras/, '')
      }
    }
  }
})
