// @vitest-environment node
// (Node's File supports text() and arrayBuffer(); jsdom's does not)
import { readFileSync } from 'node:fs'
import { extractText, MAX_RESUME_BYTES } from './resumeText'

const fixture = (name: string) =>
  new File([readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url))], name)

describe('extractText', () => {
  it('reads the text of a PDF, line by line', async () => {
    const text = await extractText(fixture('resume.pdf'))
    expect(text.split('\n')).toEqual([
      'Asha Verma',
      'Skills: ReactJS, TypeScript, SQL',
      'Built a placement dashboard used by 300 students',
    ])
  })

  it('reads the text of a DOCX', async () => {
    const text = await extractText(fixture('resume.docx'))
    expect(text).toContain('Skills: ReactJS, TypeScript, SQL')
    expect(text).toContain('Built a placement dashboard used by 300 students')
  })

  it('reads a TXT file', async () => {
    expect(await extractText(new File(['Skills: React\r\n'], 'cv.txt'))).toBe('Skills: React')
  })

  it('rejects a PDF with no text, such as a scanned image', async () => {
    await expect(extractText(fixture('scanned.pdf'))).rejects.toThrow('No text was found')
  })

  it('rejects other file types and files over 2 MB', async () => {
    await expect(extractText(new File(['x'], 'photo.png'))).rejects.toThrow('PDF, DOCX or TXT')
    await expect(extractText(new File([new Uint8Array(MAX_RESUME_BYTES + 1)], 'big.pdf'))).rejects.toThrow(
      '2 MB',
    )
  })
})
