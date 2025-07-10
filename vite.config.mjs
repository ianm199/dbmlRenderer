import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: './src/define-custom-element-with-diagram.js',
      name: 'DbDiagramElement',
      fileName: (format) => `db-diagram-element.${format === 'es' ? 'js' : 'umd.js'}`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['ace-builds'],
      output: {
        globals: {
          'ace-builds': 'ace'
        }
      }
    },
    sourcemap: true,
    minify: 'terser'
  },
  server: {
    port: 3000,
    open: '/test.html'
  }
})