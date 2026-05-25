import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// package.json'ni o'qib version'ni global o'zgaruvchiga inject qilamiz
const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // App version'ni UI'da o'qish uchun (__APP_VERSION__ global)
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },

  // ESBUILD — productionda console.log va debugger qoldiqlarini olib tashlash
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    pure: mode === 'production' ? ['console.log', 'console.debug', 'console.info'] : [],
  },

  // BUILD
  build: {
    chunkSizeWarningLimit: 700,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          charts: ['recharts'],
          forms: ['react-hook-form'],
          icons: ['lucide-react'],
          utils: ['axios', 'clsx', 'date-fns', 'zustand'],
          xlsx: ['xlsx'],
          toast: ['react-hot-toast'],
        },
      },
    },
  },
}))
