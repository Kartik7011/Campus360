import { analyzeResume, createRecheckRequest, evaluateEligibility, SEMANTIC_THRESHOLD } from './utils'
import { seedData } from './data'

describe('eligibility and resume analysis', () => {
  it('returns a transparent not eligible result when a published rule fails', () => {
    const student = seedData.students[0]
    const opportunity = seedData.opportunities.find((item) => item.id === 'opp-technova-frontend')!
    const result = evaluateEligibility(student, opportunity)

    expect(result.status).toBe('Not Eligible')
    expect(result.rules.find((rule) => rule.label === 'CGPA')?.status).toBe('Fail')
    expect(result.rules.find((rule) => rule.label === 'Active backlogs')?.status).toBe('Pass')
    expect(result.rules).toHaveLength(5)
  })

  it('fails the backlog rule when a student has more active backlogs than allowed', () => {
    const student = seedData.students.find((item) => item.id === 'shreyansh')!
    const opportunity = seedData.opportunities.find((item) => item.id === 'opp-northstar-analyst')!
    const result = evaluateEligibility(student, opportunity)

    expect(result.status).toBe('Not Eligible')
    expect(result.rules.find((rule) => rule.label === 'Active backlogs')?.status).toBe('Fail')
  })

  it('returns a deterministic resume match with category explanations', () => {
    const student = seedData.students[0]
    const opportunity = seedData.opportunities.find((item) => item.id === 'opp-technova-frontend')!
    const resume = seedData.resumes.find((item) => item.id === 'resume-kartik-product')!
    const result = analyzeResume(resume.text, opportunity, student)

    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.categories).toHaveLength(7)
    expect(result.matchedSkills).toContain('React')
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('returns cannot determine when a record field is missing and nothing fails', () => {
    const student = { ...seedData.students[0], cgpa: 9.5, debarred: null }
    const opportunity = seedData.opportunities.find((item) => item.id === 'opp-technova-frontend')!
    const result = evaluateEligibility(student, opportunity)

    expect(result.status).toBe('Cannot Determine')
    expect(result.rules.find((rule) => rule.label === 'Debarment status')?.status).toBe('Unknown')
  })
})

describe('rechecking requests', () => {
  it('creates a submitted request due two weeks later', () => {
    const request = createRecheckRequest(
      'kartik',
      ' Compiler Design ',
      'cse-701',
      new Date('2026-10-19T10:00:00Z'),
    )

    expect(request).toMatchObject({
      studentId: 'kartik',
      subject: 'Compiler Design',
      code: 'CSE-701',
      status: 'Submitted',
      requestDate: '2026-10-19',
      expectedBy: '2026-11-02',
    })
  })

  it('rejects a request without a subject or code', () => {
    expect(createRecheckRequest('kartik', '', 'CSE-701')).toBeNull()
    expect(createRecheckRequest('kartik', 'Compiler Design', '  ')).toBeNull()
  })
})

describe('semantic skill evidence (v2)', () => {
  const student = seedData.students[0]
  const opportunity = {
    ...seedData.opportunities[0],
    requiredSkills: ['React', 'Testing'],
    preferredSkills: [],
  }
  const resume = 'Skills: ReactJS\nWrote unit tests for every page'

  it('credits a skill written differently when the evidence clears the threshold, and keeps the evidence', () => {
    const v1 = analyzeResume(resume, opportunity, student)
    const v2 = analyzeResume(resume, opportunity, student, {
      React: { line: 'ReactJS', similarity: 0.87 },
      Testing: { line: 'tests', similarity: 0.91 },
    })

    expect(v1.scoringVersion).toBe('v1-keyword')
    expect(v1.missingSkills).toEqual(['Testing'])
    expect(v2.scoringVersion).toBe('v2-semantic')
    expect(v2.missingSkills).toEqual([])
    // React was already an exact match, so only Testing is credited semantically
    expect(v2.semanticMatches).toEqual([{ skill: 'Testing', line: 'tests', similarity: 0.91 }])
    expect(v2.score).toBeGreaterThan(v1.score)
  })

  it('does not credit evidence below the threshold', () => {
    const result = analyzeResume(resume, opportunity, student, {
      Testing: { line: 'tests', similarity: SEMANTIC_THRESHOLD - 0.01 },
    })
    expect(result.missingSkills).toEqual(['Testing'])
    expect(result.semanticMatches).toEqual([])
  })
})
