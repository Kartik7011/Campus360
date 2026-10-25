import { findSkillEvidence, resumePhrases } from './semantic'

describe('resumePhrases', () => {
  it('splits list lines into items and long lines into short spans', () => {
    const phrases = resumePhrases('Skills: ReactJS, Node.js\nBuilt dashboards with ReactJS')
    expect(phrases).toEqual(
      expect.arrayContaining(['ReactJS', 'Node.js', 'Built dashboards with ReactJS', 'with ReactJS']),
    )
  })
})

describe('findSkillEvidence', () => {
  it('returns the closest phrase for each skill', async () => {
    // fake 2-d embedding: "react…" points one way, everything else the other
    const embed = async (texts: string[]) => texts.map((text) => (/react/i.test(text) ? [1, 0] : [0, 1]))
    const evidence = await findSkillEvidence('Skills: ReactJS\nSQL', ['React'], embed)
    expect(evidence.React).toEqual({ line: 'ReactJS', similarity: 1 })
  })
})
