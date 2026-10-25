import { addDays, daysBetween, patch, today as todayOf, uid, upsert, type Op } from '../ops'
import { policy } from '../policy'
import type {
  AppData,
  ExamApplication,
  ExamApplicationItem,
  ExamApplicationKind,
  ExamAttendance,
  ExamAttendanceStatus,
  ExamPaper,
  ExamSession,
  RecheckRequest,
  RecheckService,
  Student,
  UploadedFile,
  WithdrawalRequest,
} from '../types'
import { allocated, chargeStatus, net, outstanding } from './fees'
import { notify } from './notify'
import { latestResult } from './results'

type Data = AppData

const active = (item: ExamApplicationItem) => !item.withdrawnOn
export const sessionById = (id: string, data: Pick<Data, 'examSessions'>) =>
  data.examSessions.find((session) => session.id === id)
export const courseTitle = (code: string, data: Pick<Data, 'courses'>) =>
  data.courses.find((course) => course.code === code)?.title ?? code

export function applicationWindow(session: ExamSession, today = todayOf()) {
  if (!session.applicationOpens || !session.applicationCloses) return 'none' as const
  if (today < session.applicationOpens) return 'not open' as const
  return today <= session.applicationCloses ? ('open' as const) : ('closed' as const)
}

// ── exam-hall attendance ────────────────────────────────────────────────────

// The status a student sees: only once both entries exist and agree (FR-EXA-02).
export function confirmedAttendance(row: ExamAttendance): ExamAttendanceStatus | null {
  return row.entry1 && row.entry2 && row.entry1.status === row.entry2.status ? row.entry1.status : null
}

export const attendanceMismatch = (row: ExamAttendance) =>
  !!row.entry1 && !!row.entry2 && row.entry1.status !== row.entry2.status

export const recordedOn = (row: ExamAttendance) =>
  row.entry1 && row.entry2 ? [row.entry1.at, row.entry2.at].sort()[1].slice(0, 10) : null

export function enterAttendance(
  row: ExamAttendance,
  entry: 1 | 2,
  status: ExamAttendanceStatus,
  actor: string,
  now = new Date(),
): { ops: Op[]; error?: string } {
  const other = entry === 1 ? row.entry2 : row.entry1
  if (other && other.by === actor)
    return { ops: [], error: 'The second entry must be made by a different person.' }
  const value = { status, by: actor, at: now.toISOString() }
  return { ops: [patch('examAttendance', row.id, entry === 1 ? { entry1: value } : { entry2: value })] }
}

export function canDispute(row: ExamAttendance, data: Pick<Data, 'attendanceDisputes'>, today = todayOf()) {
  const recorded = recordedOn(row)
  return (
    confirmedAttendance(row) === 'Absent' &&
    !!recorded &&
    daysBetween(recorded, today) <= policy.examAttendance.disputeDays &&
    !data.attendanceDisputes.some((dispute) => dispute.attendanceId === row.id)
  )
}

export function decideDispute(
  disputeId: string,
  decision: 'Upheld' | 'Rejected',
  reason: string,
  actor: string,
  data: Data,
  now = new Date(),
): Op[] {
  const dispute = data.attendanceDisputes.find((item) => item.id === disputeId)
  const row = dispute && data.examAttendance.find((item) => item.id === dispute.attendanceId)
  if (!dispute || !row) return []
  const ops: Op[] = [
    patch('attendanceDisputes', dispute.id, {
      decision,
      decisionReason: reason,
      decidedBy: actor,
      decidedOn: todayOf(now),
    }),
  ]
  if (decision === 'Upheld') {
    const present = { status: 'Present' as const, by: `${actor} (dispute upheld)`, at: now.toISOString() }
    ops.push(patch('examAttendance', row.id, { entry1: present, entry2: present }))
  }
  ops.push(
    notify(
      dispute.studentId,
      'exams',
      `Attendance dispute ${decision.toLowerCase()}`,
      `${courseTitle(row.courseCode, data)}: ${reason}`,
      now,
    ),
  )
  return ops
}

// ── back and special exams ──────────────────────────────────────────────────

// Subjects whose counting attempt is a fail.
export function backEligible(studentId: string, data: Data) {
  const codes = new Set(
    data.courseResults.filter((row) => row.studentId === studentId).map((row) => row.courseCode),
  )
  return [...codes].filter((code) => latestResult(studentId, code, data)?.passed === false)
}

// Papers missed (confirmed Absent) in an earlier end-term session and not cleared since,
// plus papers that clash in the student's timetable.
export function specialEligible(studentId: string, data: Data) {
  const missed = data.examAttendance
    .filter((row) => row.studentId === studentId && confirmedAttendance(row) === 'Absent')
    .filter((row) => latestResult(studentId, row.courseCode, data)?.passed !== true)
    .map((row) => ({ courseCode: row.courseCode, missedSessionId: row.sessionId, basis: 'Absent' as const }))
  const clashing = data.examSessions
    .filter((session) => session.kind === 'End-term')
    .flatMap((session) =>
      clashes(studentPapers(studentId, session.id, data)).map(([, second]) => ({
        courseCode: second.courseCode,
        missedSessionId: session.id,
        basis: 'Clash' as const,
      })),
    )
  return [...missed, ...clashing]
}

export const activeItemFor = (
  studentId: string,
  sessionId: string,
  courseCode: string,
  data: Pick<Data, 'examApplicationItems'>,
) =>
  data.examApplicationItems.find(
    (item) =>
      item.studentId === studentId &&
      item.sessionId === sessionId &&
      item.courseCode === courseCode &&
      active(item),
  )

export interface ExamApplicationInput {
  student: Student
  sessionId: string
  kind: ExamApplicationKind
  courseCodes: string[]
  reason?: ExamApplication['reason']
  missedSessionId?: string | null
  details: string
  files: UploadedFile[]
}

// Validates and creates a back or special application. The same subject can never be in two active
// applications for one session, whatever their kind (FR-DUP-01/02).
export function applyForExam(
  input: ExamApplicationInput,
  data: Data,
  now = new Date(),
): { ops: Op[]; error?: string; id?: string } {
  const today = todayOf(now)
  const session = sessionById(input.sessionId, data)
  if (!session || applicationWindow(session, today) !== 'open')
    return { ops: [], error: 'Applications for this session are not open.' }
  const codes = [...new Set(input.courseCodes)]
  if (!codes.length) return { ops: [], error: 'Choose at least one subject.' }
  const eligible =
    input.kind === 'Back'
      ? backEligible(input.student.id, data)
      : specialEligible(input.student.id, data)
          .filter((item) => !input.missedSessionId || item.missedSessionId === input.missedSessionId)
          .map((item) => item.courseCode)
  for (const code of codes) {
    if (!eligible.includes(code))
      return {
        ops: [],
        error: `You are not eligible for a ${input.kind.toLowerCase()} exam in ${courseTitle(code, data)}.`,
      }
    const existing = activeItemFor(input.student.id, input.sessionId, code, data)
    if (existing)
      return {
        ops: [],
        error: `${courseTitle(code, data)} is already in your ${existing.kind.toLowerCase()} exam application for ${session.name}. A subject can be taken only once per session; withdraw the other application first if it was a mistake.`,
      }
  }
  if (input.kind === 'Special') {
    if (!input.reason) return { ops: [], error: 'Choose the reason you missed the paper.' }
    if (input.reason !== 'Timetable clash' && !input.files.length)
      return { ops: [], error: 'Attach a supporting document (medical certificate or duty letter).' }
  }
  const application: ExamApplication = {
    id: uid('examapp'),
    studentId: input.student.id,
    sessionId: input.sessionId,
    kind: input.kind,
    reason: input.kind === 'Special' ? input.reason : null,
    missedSessionId: input.kind === 'Special' ? (input.missedSessionId ?? null) : null,
    details: input.details.trim(),
    files: input.files,
    submittedOn: today,
    source: 'Campus360',
  }
  const fee = policy.examFees[input.kind]
  const ops: Op[] = [upsert('examApplications', application)]
  for (const code of codes) {
    const item: ExamApplicationItem = {
      id: uid('examitem'),
      applicationId: application.id,
      studentId: input.student.id,
      sessionId: input.sessionId,
      courseCode: code,
      kind: input.kind,
      fee,
      source: 'Campus360',
    }
    ops.push(upsert('examApplicationItems', item))
    // special-exam fees are charged only after approval
    if (input.kind === 'Back') ops.push(examFeeCharge(item, input.student, session, data, today))
  }
  return { ops, id: application.id }
}

function examFeeCharge(
  item: ExamApplicationItem,
  student: Student,
  session: ExamSession,
  data: Data,
  today: string,
): Op {
  return upsert('charges', {
    id: uid('charge'),
    studentId: student.id,
    semester: student.semester,
    head: item.kind === 'Back' ? 'Back exam' : 'Special exam',
    description: `${item.kind} exam – ${courseTitle(item.courseCode, data)} (${session.name})`,
    amount: item.fee,
    concession: 0,
    dueDate: session.applicationCloses ?? addDays(today, 7),
    createdOn: today,
    ref: item.id,
  })
}

export function decideSpecial(
  applicationId: string,
  decision: 'Approved' | 'Rejected',
  reason: string,
  actor: string,
  data: Data,
  now = new Date(),
): Op[] {
  const application = data.examApplications.find((item) => item.id === applicationId)
  const student = application && data.students.find((item) => item.id === application.studentId)
  const session = application && sessionById(application.sessionId, data)
  if (!application || !student || !session) return []
  const today = todayOf(now)
  const ops: Op[] = [
    patch('examApplications', application.id, {
      decision,
      decisionReason: reason,
      decidedBy: actor,
      decidedOn: today,
    }),
  ]
  if (decision === 'Approved')
    for (const item of data.examApplicationItems.filter(
      (row) => row.applicationId === application.id && active(row),
    ))
      ops.push(examFeeCharge(item, student, session, data, today))
  ops.push(
    notify(
      student.id,
      'exams',
      `Special exam application ${decision.toLowerCase()}`,
      decision === 'Approved'
        ? `Pay the fee by ${session.applicationCloses} to confirm your papers.`
        : reason,
      now,
    ),
  )
  return ops
}

export const itemCharge = (item: ExamApplicationItem, data: Pick<Data, 'charges'>) =>
  data.charges.find((charge) => charge.ref === item.id && !charge.cancelledOn) ??
  data.charges.find((charge) => charge.ref === item.id)

export type ItemState =
  | 'Withdrawn'
  | 'Awaiting approval'
  | 'Rejected'
  | 'Fee due'
  | 'Processing'
  | 'Confirmed'

export function itemState(item: ExamApplicationItem, data: Data): ItemState {
  if (item.withdrawnOn) return 'Withdrawn'
  const application = data.examApplications.find((row) => row.id === item.applicationId)
  if (item.kind === 'Special' && application?.decision === 'Rejected') return 'Rejected'
  if (item.kind === 'Special' && application?.decision !== 'Approved') return 'Awaiting approval'
  const charge = itemCharge(item, data)
  if (!charge) return 'Confirmed'
  const status = chargeStatus(charge, data)
  return status === 'Paid' ? 'Confirmed' : status === 'Processing' ? 'Processing' : 'Fee due'
}

// Students may ask to withdraw until hall tickets are issued; after that only the exam cell can.
export function requestWithdrawal(
  input: {
    studentId: string
    applicationId: string
    itemIds: string[]
    reason: string
    requestedBy: string
    byStaff?: boolean
  },
  data: Data,
  now = new Date(),
): { ops: Op[]; error?: string; id?: string } {
  const today = todayOf(now)
  const application = data.examApplications.find(
    (row) => row.id === input.applicationId && row.studentId === input.studentId,
  )
  const session = application && sessionById(application.sessionId, data)
  if (!application || !session) return { ops: [], error: 'Application not found.' }
  if (!input.byStaff && today >= session.hallTicketsFrom)
    return { ops: [], error: 'Hall tickets have been issued. Ask the exam cell to withdraw this paper.' }
  if (!input.reason.trim()) return { ops: [], error: 'Give a reason.' }
  const items = data.examApplicationItems.filter(
    (row) => input.itemIds.includes(row.id) && row.applicationId === application.id && active(row),
  )
  if (!items.length) return { ops: [], error: 'Choose at least one subject that is still active.' }
  const pending = data.withdrawals.some(
    (request) => !request.decision && request.itemIds.some((id) => items.some((item) => item.id === id)),
  )
  if (pending)
    return { ops: [], error: 'A withdrawal request for this subject is already waiting for a decision.' }
  const request: WithdrawalRequest = {
    id: uid('withdrawal'),
    studentId: input.studentId,
    applicationId: application.id,
    itemIds: items.map((item) => item.id),
    reason: input.reason.trim(),
    requestedOn: today,
    requestedBy: input.requestedBy,
  }
  return { ops: [upsert('withdrawals', request)], id: request.id }
}

// Share of a paid fee that comes back when a paper is withdrawn.
export function refundShare(item: ExamApplicationItem, data: Data, today = todayOf()) {
  const duplicate = data.examApplicationItems.some(
    (other) =>
      other.id !== item.id &&
      active(other) &&
      other.studentId === item.studentId &&
      other.sessionId === item.sessionId &&
      other.courseCode === item.courseCode,
  )
  if (duplicate) return { share: 1, why: 'Duplicate application for the same subject: full refund.' }
  const session = sessionById(item.sessionId, data)
  if (!session) return { share: 0, why: '' }
  if (session.applicationCloses && today <= session.applicationCloses)
    return { share: policy.withdrawal.beforeDeadline, why: 'Withdrawn before the application deadline.' }
  if (today < session.hallTicketsFrom)
    return {
      share: policy.withdrawal.afterDeadline,
      why: `Withdrawn after the deadline: ${policy.withdrawal.afterDeadline * 100}% refunded.`,
    }
  return { share: 0, why: 'Withdrawn after hall tickets were issued: no refund.' }
}

// Approving withdraws the papers and reduces their fee to the part the university keeps.
// Any money that becomes credit is then adjusted or refunded by Accounts (maker–checker).
export function decideWithdrawal(
  requestId: string,
  decision: 'Approved' | 'Rejected',
  reason: string,
  actor: string,
  data: Data,
  now = new Date(),
): Op[] {
  const today = todayOf(now)
  const request = data.withdrawals.find((row) => row.id === requestId)
  if (!request || request.decision) return []
  const ops: Op[] = [
    patch('withdrawals', request.id, {
      decision,
      decisionReason: reason,
      decidedBy: actor,
      decidedOn: today,
    }),
  ]
  if (decision === 'Approved') {
    let state = data
    for (const item of data.examApplicationItems.filter(
      (row) => request.itemIds.includes(row.id) && active(row),
    )) {
      const { share, why } = refundShare(item, state, today)
      ops.push(patch('examApplicationItems', item.id, { withdrawnOn: today }))
      state = {
        ...state,
        examApplicationItems: state.examApplicationItems.map((row) =>
          row.id === item.id ? { ...row, withdrawnOn: today } : row,
        ),
      }
      const charge = itemCharge(item, data)
      if (!charge || charge.cancelledOn) continue
      const paid = allocated(charge.id, data, true) > 0
      const retained = paid ? Math.round(net(charge) * (1 - share)) : 0
      if (retained === 0) ops.push(patch('charges', charge.id, { cancelledOn: today }))
      else
        ops.push(
          patch('charges', charge.id, {
            amount: retained + charge.concession,
            description: `${charge.description} – withdrawn, ${why}`,
          }),
        )
    }
  }
  ops.push(
    notify(
      request.studentId,
      'exams',
      `Withdrawal request ${decision.toLowerCase()}`,
      decision === 'Approved'
        ? 'Any fee paid for the withdrawn paper will be adjusted against your dues or refunded.'
        : reason,
      now,
    ),
  )
  return ops
}

// ── timetable and hall ticket ───────────────────────────────────────────────

export function studentPapers(studentId: string, sessionId: string, data: Data): ExamPaper[] {
  const regular = data.examRegistrations
    .filter((row) => row.studentId === studentId && row.sessionId === sessionId)
    .map((row) => row.courseCode)
  const applied = data.examApplicationItems
    .filter(
      (item) =>
        item.studentId === studentId && item.sessionId === sessionId && itemState(item, data) === 'Confirmed',
    )
    .map((item) => item.courseCode)
  const codes = new Set([...regular, ...applied])
  return data.examPapers
    .filter((paper) => paper.sessionId === sessionId && codes.has(paper.courseCode))
    .sort((a, b) => `${a.date}${a.slot}`.localeCompare(`${b.date}${b.slot}`))
}

export function clashes(papers: ExamPaper[]): [ExamPaper, ExamPaper][] {
  const pairs: [ExamPaper, ExamPaper][] = []
  papers.forEach((paper, index) =>
    papers.slice(index + 1).forEach((other) => {
      if (paper.date === other.date && paper.slot === other.slot) pairs.push([paper, other])
    }),
  )
  return pairs
}

export const attendancePercent = (held: number, attended: number) =>
  held ? Math.round((attended / held) * 1000) / 10 : 100

// classes in a row needed to get back to the required percentage
export function classesToRecover(held: number, attended: number, required = policy.attendanceRequired) {
  const r = required / 100
  return Math.max(0, Math.ceil((r * held - attended) / (1 - r)))
}

export interface Blocker {
  reason: string
  action: string
}

// Everything that stops this student's hall ticket for the session, with what to do about each (FR-EXM-02).
export function hallTicketBlockers(student: Student, session: ExamSession, data: Data): Blocker[] {
  const blockers: Blocker[] = []
  const itemIds = new Set(
    data.examApplicationItems.filter((item) => item.sessionId === session.id).map((item) => item.id),
  )
  const unpaid = data.charges
    .filter(
      (charge) =>
        charge.studentId === student.id &&
        (charge.ref === session.id || (charge.ref && itemIds.has(charge.ref))),
    )
    .reduce((total, charge) => total + outstanding(charge, data), 0)
  if (unpaid > 0)
    blockers.push({
      reason: `Exam fee of ₹${unpaid.toLocaleString('en-IN')} is due.`,
      action: 'Pay it on the Fees page.',
    })
  if (session.kind === 'End-term')
    for (const code of studentPapers(student.id, session.id, data).map((paper) => paper.courseCode)) {
      const row = data.courseAttendance.find(
        (item) => item.studentId === student.id && item.courseCode === code,
      )
      if (!row) continue
      const percent = attendancePercent(row.held, row.attended)
      const condoned = data.condonations.some(
        (item) => item.studentId === student.id && item.courseCode === code && item.decision === 'Approved',
      )
      if (percent < policy.attendanceRequired && !condoned)
        blockers.push({
          reason: `Detained in ${courseTitle(code, data)}: attendance ${percent}% (needs ${policy.attendanceRequired}%).`,
          action:
            'Apply for condonation on the Academic record page if you have a medical or official-duty reason.',
        })
    }
  if (student.debarred)
    blockers.push({
      reason: `Debarred${student.debarredReason ? `: ${student.debarredReason}` : ''}.`,
      action: 'Contact the exam cell.',
    })
  return blockers
}

// ── rechecking, revaluation, answer-sheet copy ──────────────────────────────

export function recheckWindow(session: ExamSession) {
  if (!session.resultDeclaredOn) return null
  return {
    opens: session.resultDeclaredOn,
    closes: addDays(session.resultDeclaredOn, policy.recheck.windowDays),
  }
}

export function requestRecheck(
  input: { student: Student; service: RecheckService; sessionId: string; courseCode: string },
  data: Data,
  now = new Date(),
): { ops: Op[]; error?: string } {
  const today = todayOf(now)
  const session = sessionById(input.sessionId, data)
  const window = session && recheckWindow(session)
  if (!session || !window || today < window.opens || today > window.closes)
    return { ops: [], error: `The ${input.service.toLowerCase()} window for this session is closed.` }
  const result = data.courseResults.find(
    (row) =>
      row.studentId === input.student.id &&
      row.sessionId === input.sessionId &&
      row.courseCode === input.courseCode &&
      row.status === 'Declared',
  )
  if (!result) return { ops: [], error: 'There is no declared result for this subject in this session.' }
  const open = data.rechecks.some(
    (row) =>
      row.studentId === input.student.id &&
      row.code === input.courseCode &&
      row.sessionId === input.sessionId &&
      row.service === input.service &&
      row.status !== 'Rejected',
  )
  if (open)
    return { ops: [], error: `You already have a ${input.service.toLowerCase()} request for this subject.` }
  const request: RecheckRequest = {
    id: uid('recheck'),
    studentId: input.student.id,
    service: input.service,
    sessionId: input.sessionId,
    subject: courseTitle(input.courseCode, data),
    code: input.courseCode,
    requestDate: today,
    status: 'Submitted',
    remarks: 'Pay the fee to send this request for review.',
    expectedBy: addDays(today, policy.recheck.slaDays),
  }
  const fee = policy.recheck.fees[input.service]
  return {
    ops: [
      upsert('rechecks', request),
      upsert('charges', {
        id: uid('charge'),
        studentId: input.student.id,
        semester: input.student.semester,
        head: input.service,
        description: `${input.service} – ${request.subject} (${session.name})`,
        amount: fee,
        concession: 0,
        dueDate: window.closes,
        createdOn: today,
        ref: request.id,
      }),
    ],
  }
}

export function recheckState(
  request: RecheckRequest,
  data: Pick<Data, 'charges' | 'payments' | 'settlements'>,
) {
  if (request.status !== 'Submitted') return request.status
  const charge = data.charges.find((item) => item.ref === request.id)
  if (!charge) return 'Fee confirmed'
  const status = chargeStatus(charge, data)
  return status === 'Paid' ? 'Fee confirmed' : status === 'Processing' ? 'Payment processing' : 'Fee due'
}

export const recheckEscalated = (request: RecheckRequest, today = todayOf()) =>
  (request.status === 'Submitted' || request.status === 'Under review') &&
  daysBetween(request.requestDate, today) > policy.recheck.slaDays
