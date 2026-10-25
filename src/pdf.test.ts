import { seedData } from './data'
import { buildPdf, issueDocument } from './pdf'

describe('PDF documents', () => {
  it('issues a serial and builds a multi-page PDF with a long table', async () => {
    const student = seedData.students[0]
    const { doc, op } = issueDocument(
      student,
      'Grade sheet',
      'Grade sheet – Semester 6',
      '6',
      new Date('2026-10-26T12:00:00Z'),
    )
    expect(doc.serial).toMatch(/^C360-GS-[0-9A-F]{8}$/)
    expect(op).toMatchObject({ type: 'upsert', key: 'issuedDocuments' })

    const pdf = await buildPdf({
      title: doc.title,
      serial: doc.serial,
      student,
      provisional: true,
      facts: [['SGPA', '8.17']],
      tables: [
        {
          head: ['Code', 'Course'],
          widths: [40, 138],
          rows: Array.from({ length: 80 }, (_, i) => [`C-${i}`, `Course ${i}`]),
        },
      ],
    })
    const text = pdf.output()
    expect(text.startsWith('%PDF-')).toBe(true)
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1)
    expect(text).toContain(doc.serial)
    expect(text).toContain('PROVISIONAL')
  })
})
