import { analyzeResume, evaluateEligibility } from './utils'
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
})
