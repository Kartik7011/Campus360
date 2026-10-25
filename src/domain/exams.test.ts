import { applyOps } from '../ops'
import { seedData } from '../data'
import {
  applyForExam,
  backEligible,
  canDispute,
  classesToRecover,
  clashes,
  confirmedAttendance,
  decideDispute,
  decideSpecial,
  enterAttendance,
  hallTicketBlockers,
  itemState,
  recheckEscalated,
  recheckState,
  requestRecheck,
  requestWithdrawal,
  specialEligible,
} from './exams'
import { makePayment } from './fees'

const NOW = new Date('2026-10-26T12:00:00Z')
const student = (id: string) => seedData.students.find((item) => item.id === id)!

describe('back and special exams', () => {
  it('finds back subjects from failed results and special subjects from confirmed absences', () => {
    expect(backEligible('shreyansh', seedData).sort()).toEqual(['ECE-601', 'ECE-602'])
    expect(specialEligible('shreyansh', seedData).map((item) => item.courseCode)).toEqual(['ECE-602'])
    expect(backEligible('kartik', seedData)).toEqual([])
  })

  it('creates a back application with a fee charge per subject', () => {
    const result = applyForExam(
      {
        student: student('shreyansh'),
        sessionId: 'nov-2026-bs',
        kind: 'Back',
        courseCodes: ['ECE-601'],
        details: '',
        files: [],
      },
      seedData,
      NOW,
    )
    expect(result.error).toBeUndefined()
    const after = applyOps(seedData, result.ops)
    const item = after.examApplicationItems.find((row) => row.applicationId === result.id)!
    expect(itemState(item, after)).toBe('Fee due')
    expect(after.charges.find((row) => row.ref === item.id)).toMatchObject({
      head: 'Back exam',
      amount: 1500,
    })
  })

  it('blocks the same subject as both back and special in one session', () => {
    // ECE-602 is already in Shreyansh's applications for Nov 2026
    const back = applyForExam(
      {
        student: student('shreyansh'),
        sessionId: 'nov-2026-bs',
        kind: 'Back',
        courseCodes: ['ECE-602'],
        details: '',
        files: [],
      },
      seedData,
      NOW,
    )
    expect(back.error).toMatch(/already in your .* exam application/)
    expect(back.ops).toEqual([])
  })

  it('blocks applying twice for the same subject in the same category', () => {
    const first = applyForExam(
      {
        student: student('shreyansh'),
        sessionId: 'nov-2026-bs',
        kind: 'Back',
        courseCodes: ['ECE-601'],
        details: '',
        files: [],
      },
      seedData,
      NOW,
    )
    const after = applyOps(seedData, first.ops)
    const second = applyForExam(
      {
        student: student('shreyansh'),
        sessionId: 'nov-2026-bs',
        kind: 'Back',
        courseCodes: ['ECE-601'],
        details: '',
        files: [],
      },
      after,
      NOW,
    )
    expect(second.error).toMatch(/already/)
  })

  it('rejects subjects the student is not eligible for and closed windows', () => {
    const notFailed = applyForExam(
      {
        student: student('shreyansh'),
        sessionId: 'nov-2026-bs',
        kind: 'Back',
        courseCodes: ['ECE-603'],
        details: '',
        files: [],
      },
      seedData,
      NOW,
    )
    expect(notFailed.error).toMatch(/not eligible/)
    const late = applyForExam(
      {
        student: student('shreyansh'),
        sessionId: 'nov-2026-bs',
        kind: 'Back',
        courseCodes: ['ECE-601'],
        details: '',
        files: [],
      },
      seedData,
      new Date('2026-11-06T12:00:00Z'),
    )
    expect(late.error).toMatch(/not open/)
  })

  it('requires a document for a medical special exam and charges only after approval', () => {
    const withoutFile = {
      student: student('kartik'),
      sessionId: 'nov-2026-bs',
      kind: 'Special' as const,
      courseCodes: ['CSE-S11'],
      reason: 'Medical' as const,
      details: 'fever',
      files: [],
    }
    expect(applyForExam(withoutFile, seedData, NOW).error).toMatch(/supporting document/)
    const applied = applyForExam(
      { ...withoutFile, files: [{ name: 'cert.pdf', size: 10, path: null }] },
      seedData,
      NOW,
    )
    const after = applyOps(seedData, applied.ops)
    const item = after.examApplicationItems.find((row) => row.applicationId === applied.id)!
    expect(itemState(item, after)).toBe('Awaiting approval')
    expect(after.charges.some((row) => row.ref === item.id)).toBe(false)
    const approved = applyOps(after, decideSpecial(applied.id!, 'Approved', 'ok', 'Rakesh Kumar', after, NOW))
    expect(itemState(item, approved)).toBe('Fee due')
    const charge = approved.charges.find((row) => row.ref === item.id)!
    const paid = applyOps(
      approved,
      makePayment(
        { studentId: 'kartik', chargeIds: [charge.id], method: 'UPI', idempotencyKey: 'x' },
        approved,
        NOW,
      ).ops,
    )
    expect(itemState(item, paid)).toBe('Confirmed')
  })
})

describe('withdrawal requests', () => {
  it('lets students ask before hall tickets are issued, and only staff after', () => {
    const input = {
      studentId: 'shreyansh',
      applicationId: 'examapp-shreyansh-special',
      itemIds: ['examitem-shreyansh-special-602'],
      reason: 'mistake',
      requestedBy: 'Shreyansh',
    }
    expect(requestWithdrawal(input, seedData, NOW).error).toBeUndefined()
    expect(requestWithdrawal(input, seedData, new Date('2026-11-12T09:00:00Z')).error).toMatch(/exam cell/)
    expect(
      requestWithdrawal({ ...input, byStaff: true }, seedData, new Date('2026-11-12T09:00:00Z')).error,
    ).toBeUndefined()
  })

  it('does not allow a second request while one is pending', () => {
    const input = {
      studentId: 'shreyansh',
      applicationId: 'examapp-shreyansh-back',
      itemIds: ['examitem-shreyansh-back-602'],
      reason: 'again',
      requestedBy: 'Shreyansh',
    }
    expect(requestWithdrawal(input, seedData, NOW).error).toMatch(/already waiting/)
  })
})

describe('exam-hall attendance', () => {
  const aditi = seedData.examAttendance.find((row) => row.id === 'examatt-aditi-may-2026-CSE-604')!
  const kartik = seedData.examAttendance.find((row) => row.id === 'examatt-kartik-oct-2026-summer-CSE-S11')!

  it('shows nothing to the student while the two entries disagree', () => {
    expect(confirmedAttendance(aditi)).toBeNull()
  })

  it('requires the second entry to be made by a different person', () => {
    const row = { ...aditi, entry2: null }
    expect(enterAttendance(row, 2, 'Present', 'Rakesh Kumar').error).toMatch(/different person/)
    expect(enterAttendance(row, 2, 'Present', 'Priya Singh').ops).toHaveLength(1)
  })

  it('allows a dispute within 7 days of recording, and an upheld dispute marks the student present', () => {
    expect(canDispute(kartik, seedData, '2026-10-29')).toBe(true)
    expect(canDispute(kartik, seedData, '2026-10-30')).toBe(false)
    const disputed = applyOps(seedData, [
      {
        type: 'upsert',
        key: 'attendanceDisputes',
        row: {
          id: 'd1',
          studentId: 'kartik',
          attendanceId: kartik.id,
          hallTicketNo: 'H1',
          seatNo: 'B-11',
          answerSheetBarcode: '',
          raisedOn: '2026-10-26',
        } as never,
      },
    ])
    expect(canDispute(kartik, disputed, '2026-10-26')).toBe(false)
    const upheld = applyOps(
      disputed,
      decideDispute('d1', 'Upheld', 'Answer sheet found', 'Priya Singh', disputed, NOW),
    )
    expect(confirmedAttendance(upheld.examAttendance.find((row) => row.id === kartik.id)!)).toBe('Present')
  })
})

describe('hall tickets and timetable', () => {
  it('lists an unpaid exam fee and attendance detention as blockers', () => {
    const dec = seedData.examSessions.find((row) => row.id === 'dec-2026')!
    expect(hallTicketBlockers(student('shreyansh'), dec, seedData).map((row) => row.reason)).toEqual([
      'Exam fee of ₹1,200 is due.',
    ])
    expect(hallTicketBlockers(student('kartik'), dec, seedData)).toEqual([])
    const aditi = hallTicketBlockers(student('aditi'), dec, seedData).map((row) => row.reason)
    expect(aditi).toEqual([
      'Exam fee of ₹1,200 is due.',
      expect.stringMatching(/Detained in Information Security: attendance 68.4%/),
    ])
  })

  it('finds papers in the same slot on the same day', () => {
    const a = {
      id: 'a',
      sessionId: 's',
      courseCode: 'X',
      date: '2026-12-01',
      slot: 'Morning' as const,
      time: '',
      venue: '',
    }
    expect(
      clashes([a, { ...a, id: 'b', courseCode: 'Y' }, { ...a, id: 'c', slot: 'Afternoon' }]),
    ).toHaveLength(1)
  })

  it('works out how many classes are needed to recover attendance', () => {
    // 26 of 38 → 75% needs 10 more classes in a row: 36/48
    expect(classesToRecover(38, 26)).toBe(10)
    expect(classesToRecover(40, 35)).toBe(0)
  })
})

describe('rechecking and revaluation', () => {
  it('opens for ten days after the result, with a fee, and one request per subject and service', () => {
    const input = {
      student: student('kartik'),
      service: 'Answer-sheet copy' as const,
      sessionId: 'may-2026',
      courseCode: 'CSE-602',
    }
    const result = requestRecheck(input, seedData, NOW)
    expect(result.error).toBeUndefined()
    const after = applyOps(seedData, result.ops)
    expect(recheckState(after.rechecks[0], after)).toBe('Fee due')
    expect(requestRecheck(input, after, NOW).error).toMatch(/already/)
    expect(requestRecheck(input, seedData, new Date('2026-10-30T12:00:00Z')).error).toMatch(/closed/)
  })

  it('escalates requests open for more than 14 days', () => {
    const aditi = seedData.rechecks.find((row) => row.id === 'recheck-4')!
    expect(recheckEscalated(aditi, '2026-10-26')).toBe(true)
    expect(recheckEscalated(seedData.rechecks[0], '2026-10-26')).toBe(false)
  })
})
