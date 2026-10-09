import { defineConfig } from 'vite';

export default defineConfig({
  base: '/wander/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  },
  worker: {
    format: 'es'
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});
