import { applyOps } from '../ops'
import { seedData } from '../data'
import { applyToOpening, mentorWarnings, noticeVisibleTo, parseCsv, ticketOverdue, toCsv } from './campus'
import { changeMarks, declareResults, gradeFor } from './results'

const NOW = new Date('2026-10-26T12:00:00Z')
const student = (id: string) => seedData.students.find((item) => item.id === id)!
const opportunity = (id: string) => seedData.opportunities.find((item) => item.id === id)!

describe('results', () => {
  it('grades on the 10-point scale', () => {
    expect(gradeFor(90)).toEqual({ grade: 'O', gradePoints: 10, passed: true })
    expect(gradeFor(39)).toEqual({ grade: 'F', gradePoints: 0, passed: false })
  })

  it('keeps the old mark, recalculates SGPA/CGPA and supersedes the issued grade sheet', () => {
    const os = seedData.courseResults.find((row) => row.id === 'result-kartik-CSE-601-may-2026')!
    const before = seedData.semesterResults.find((row) => row.id === 'sem-kartik-6')!
    const after = applyOps(seedData, changeMarks(os, 82, 'Rechecking', 'Totalling error', seedData, NOW))
    expect(after.courseResults.find((row) => row.id === os.id)).toMatchObject({ total: 82, grade: 'A+' })
    expect(after.markChanges[0]).toMatchObject({
      fromTotal: 72,
      toTotal: 82,
      fromGrade: 'A',
      toGrade: 'A+',
      reason: 'Rechecking',
    })
    expect(after.semesterResults.find((row) => row.id === 'sem-kartik-6')!.sgpa).toBeGreaterThan(before.sgpa!)
    expect(after.issuedDocuments.find((row) => row.id === 'doc-kartik-gs6')!.supersededOn).toBe('2026-10-26')
  })
})

describe('declaring results', () => {
  it('adds the new semester to SGPA and CGPA, updates the student and notifies them', () => {
    const withMarks = {
      ...seedData,
      courseResults: seedData.courseResults.map((row) =>
        row.studentId === 'kartik' && row.sessionId === 'dec-2026'
          ? { ...row, status: 'Declared' as const, total: 90, ...gradeFor(90) }
          : row,
      ),
    }
    const after = applyOps(withMarks, declareResults('dec-2026', withMarks, NOW))
    const sem7 = after.semesterResults.find((row) => row.studentId === 'kartik' && row.semester === 7)!
    const sem6 = seedData.semesterResults.find((row) => row.studentId === 'kartik' && row.semester === 6)!
    expect(sem7).toMatchObject({ sgpa: 10, status: 'Pass', declaredOn: '2026-10-26' })
    expect(sem7.cgpa!).toBeGreaterThan(sem6.cgpa!)
    expect(after.students.find((row) => row.id === 'kartik')!.cgpa).toBe(sem7.cgpa)
    expect(
      after.notifications.filter((row) => row.studentId === 'kartik' && row.title.includes('Dec 2026')),
    ).toHaveLength(1)
    expect(after.examSessions.find((row) => row.id === 'dec-2026')!.resultDeclaredOn).toBe('2026-10-26')
  })
})

describe('placements', () => {
  it('lets an eligible student apply and records the criteria in force', () => {
    const result = applyToOpening(
      { student: student('kartik'), opportunity: opportunity('opp-northstar-analyst'), shared: ['Resume'] },
      seedData,
      NOW,
    )
    expect(result.error).toBeUndefined()
    const after = applyOps(seedData, result.ops)
    expect(after.applications[0]).toMatchObject({
      stage: 'Applied',
      criteria: { version: 1, minCgpa: 7.5 },
      shared: ['Resume'],
    })
  })

  it('blocks a student who is not eligible, unless the placement cell overrides with a reason', () => {
    const input = {
      student: student('kartik'),
      opportunity: opportunity('opp-technova-frontend'),
      shared: [],
    }
    expect(applyToOpening(input, seedData, NOW).error).toMatch(/not eligible/)
    expect(
      applyToOpening({ ...input, overrideReason: 'CGPA rounding approved by TPO' }, seedData, NOW).error,
    ).toBeUndefined()
  })

  it('applies the one-offer policy except for dream openings', () => {
    // Aditi already holds an Orbit offer
    const aditi = { ...student('aditi'), cgpa: 8.5 }
    expect(
      applyToOpening(
        { student: aditi, opportunity: opportunity('opp-northstar-analyst'), shared: [] },
        seedData,
        NOW,
      ).error,
    ).toMatch(/one-offer/)
    expect(
      applyToOpening(
        { student: aditi, opportunity: opportunity('opp-technova-frontend'), shared: [] },
        seedData,
        NOW,
      ).error,
    ).toBeUndefined()
  })
})

describe('notices and helpdesk', () => {
  it('shows targeted notices only to the students they target', () => {
    const scse = seedData.notices.find((row) => row.id === 'notice-scse-lab')!
    expect(noticeVisibleTo(scse, student('kartik'))).toBe(true)
    expect(noticeVisibleTo(scse, student('shreyansh'))).toBe(false)
    const sem7 = seedData.notices.find((row) => row.id === 'notice-exam-fee')!
    expect(noticeVisibleTo(sem7, student('rohan'))).toBe(false)
  })

  it('flags tickets past their category deadline', () => {
    expect(ticketOverdue(seedData.tickets[0], '2026-10-26')).toBe(true)
    expect(ticketOverdue(seedData.tickets[0], '2026-10-23')).toBe(false)
  })
})

describe('mentor warnings', () => {
  it('flags low attendance, new backlogs and blocked hall tickets', () => {
    const kinds = mentorWarnings(seedData.students, seedData, '2026-10-26').map(
      (row) => `${row.studentId}:${row.kind}`,
    )
    expect(kinds).toEqual(
      expect.arrayContaining(['aditi:Attendance', 'shreyansh:New backlog', 'shreyansh:Hall ticket blocked']),
    )
    expect(kinds.some((row) => row.startsWith('kartik:'))).toBe(false)
  })
})

describe('CSV', () => {
  it('round-trips quotes, commas and newlines', () => {
    const rows = [{ name: 'Rao, Sunita', note: 'said "hi"\nthen left' }]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })
})
