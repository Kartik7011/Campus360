import { analyzeResume, createRecheckRequest, evaluateEligibility } from './utils'
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
    const request = createRecheckRequest('kartik', ' Compiler Design ', 'cse-701', new Date('2026-10-19T10:00:00Z'))

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
