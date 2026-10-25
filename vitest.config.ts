import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    // tests run in Node, so use the Node-compatible builds of the in-browser file readers
    alias: [
      { find: /^pdfjs-dist$/, replacement: path('node_modules/pdfjs-dist/legacy/build/pdf.mjs') },
      {
        find: /^pdfjs-dist\/build\/pdf\.worker\.min\.mjs\?url$/,
        replacement: path('src/__fixtures__/pdfWorkerUrl.ts'),
      },
      { find: /^mammoth$/, replacement: path('node_modules/mammoth/mammoth.browser.js') },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
