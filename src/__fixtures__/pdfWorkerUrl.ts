// Stands in for the `pdf.worker.min.mjs?url` import in tests (see vitest.config.ts).
export default new URL('../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href
