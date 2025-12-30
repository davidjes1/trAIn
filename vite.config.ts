import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  define: {
    global: 'globalThis',
  },
  root: '.',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "./src/styles/variables.scss" as *;`
      }
    }
  },
  server: {
    open: true,
    port: 3000
  },
  optimizeDeps: {
    include: ['buffer']
  }
});