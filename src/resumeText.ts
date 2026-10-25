export const MAX_RESUME_BYTES = 2 * 1024 * 1024
export const RESUME_ACCEPT = '.pdf,.docx,.txt'

// Thrown with a message that can be shown to the student as is.
export class ResumeFileError extends Error {}

// Reads a resume file into plain text in the browser. The PDF and DOCX readers are loaded only when needed.
export async function extractText(file: File): Promise<string> {
  const extension = file.name.toLowerCase().split('.').pop()
  if (extension !== 'pdf' && extension !== 'docx' && extension !== 'txt')
    throw new ResumeFileError('Upload a PDF, DOCX or TXT file.')
  if (file.size > MAX_RESUME_BYTES) throw new ResumeFileError('The file is larger than 2 MB.')

  let text: string
  try {
    if (extension === 'txt') text = await file.text()
    else if (extension === 'docx') text = await docxText(await file.arrayBuffer())
    else text = await pdfText(await file.arrayBuffer())
  } catch {
    throw new ResumeFileError('This file could not be read. It may be damaged or password-protected.')
  }
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!text)
    throw new ResumeFileError(
      'No text was found in this file. If it is a scanned image, export it as a text PDF or paste the text.',
    )
  return text
}

async function docxText(data: ArrayBuffer) {
  const mammoth = await import('mammoth')
  return (await mammoth.extractRawText({ arrayBuffer: data })).value
}

async function pdfText(data: ArrayBuffer) {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const pdf = await pdfjs.getDocument({ data }).promise
  const pages: string[] = []
  for (let number = 1; number <= pdf.numPages; number++) {
    const content = await (await pdf.getPage(number)).getTextContent()
    // pdf.js returns text runs; hasEOL marks where the original line ended
    pages.push(
      content.items.map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : '') : '')).join(''),
    )
  }
  return pages.join('\n')
}
