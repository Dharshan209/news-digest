import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Avoid Rollup native dependencies
  resolve: {
    alias: {
      '@rollup/rollup-linux-x64-gnu': '@rollup/rollup-linux-x64-musl',
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      extensions: ['.js', '.cjs', '.jsx', '.mjs'],
      strictRequires: true,
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: [],
      output: {
        manualChunks: undefined,
      }
    },
    sourcemap: false,
    // Reduce concurrent processes for memory constraints
    chunkSizeWarningLimit: 1000,
    terserOptions: {
      compress: true
    }
  },
  // Avoid optional dependencies
  optimizeDeps: {
    exclude: ['@rollup/rollup-linux-x64-gnu']
  }
})