import { addDays, daysBetween, today as todayOf, uid, upsert, type Op } from '../ops'
import { policy } from '../policy'
import type {
  AppData,
  CriteriaSnapshot,
  Notice,
  Opportunity,
  PlacementApplication,
  SharedField,
  Student,
  Ticket,
  TicketCategory,
} from '../types'
import { evaluateEligibility } from '../utils'
import { attendancePercent, backEligible, hallTicketBlockers } from './exams'
import { balanceDue, chargeStatus } from './fees'

// ── placements ──────────────────────────────────────────────────────────────

export const criteriaOf = (opportunity: Opportunity): CriteriaSnapshot => ({
  version: opportunity.criteriaVersion ?? 1,
  minCgpa: opportunity.minCgpa,
  allowedBranches: opportunity.allowedBranches,
  maxActiveBacklogs: opportunity.maxActiveBacklogs,
  graduationYears: opportunity.graduationYears ?? [],
})

export function offerPolicyBlock(
  student: Student,
  opportunity: Opportunity,
  data: Pick<AppData, 'applications' | 'opportunities'>,
) {
  if (!policy.onePlacementOffer || opportunity.dream) return null
  const offer = data.applications.find((row) => row.studentId === student.id && row.stage === 'Selected')
  return offer
    ? 'You already hold an offer. Under the one-offer policy you can apply only to dream openings.'
    : null
}

// Students apply only when every rule passes; the placement cell can override with a reason (FR-PLC-03).
export function applyToOpening(
  input: { student: Student; opportunity: Opportunity; shared: SharedField[]; overrideReason?: string },
  data: AppData,
  now = new Date(),
): { ops: Op[]; error?: string } {
  const { student, opportunity } = input
  if (data.applications.some((row) => row.studentId === student.id && row.opportunityId === opportunity.id))
    return { ops: [], error: 'You have already applied to this opening.' }
  if (opportunity.status === 'Closed' || opportunity.deadline < todayOf(now))
    return { ops: [], error: 'Applications for this opening are closed.' }
  if (!input.overrideReason) {
    const eligibility = evaluateEligibility(student, opportunity)
    if (eligibility.status !== 'Eligible')
      return {
        ops: [],
        error: `You can't apply: ${eligibility.status.toLowerCase()}. ${eligibility.summary}`,
      }
    const blocked = offerPolicyBlock(student, opportunity, data)
    if (blocked) return { ops: [], error: blocked }
  }
  const application: PlacementApplication = {
    id: uid('application'),
    studentId: student.id,
    opportunityId: opportunity.id,
    stage: 'Applied',
    appliedOn: todayOf(now),
    note: input.overrideReason ? 'Added by the placement cell.' : 'Applied through Campus360.',
    criteria: criteriaOf(opportunity),
    shared: input.shared,
    overrideReason: input.overrideReason ?? null,
  }
  return { ops: [upsert('applications', application)] }
}

// ── notices ─────────────────────────────────────────────────────────────────

export function noticeVisibleTo(notice: Notice, student: Student) {
  const target = notice.target
  if (!target) return true
  if (target.studentIds?.length && !target.studentIds.includes(student.id)) return false
  if (target.schools?.length && !target.schools.includes(student.school)) return false
  if (target.programs?.length && !target.programs.includes(student.program)) return false
  if (target.semesters?.length && !target.semesters.includes(student.semester)) return false
  if (target.batches?.length && !target.batches.includes(student.batch)) return false
  return true
}

export function describeTarget(notice: Notice) {
  const target = notice.target
  if (!target) return 'Everyone'
  const parts = [
    target.schools?.join(', '),
    target.programs?.join(', '),
    target.semesters?.length ? `Semester ${target.semesters.join(', ')}` : '',
    target.batches?.length ? `Batch ${target.batches.join(', ')}` : '',
    target.studentIds?.length ? `${target.studentIds.length} student(s)` : '',
  ].filter(Boolean)
  return parts.join(' · ') || 'Everyone'
}

export interface CalendarEvent {
  date: string
  title: string
  kind: 'Exam' | 'Deadline' | 'Fee' | 'Result'
}

export function academicCalendar(student: Student, data: AppData): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (const session of data.examSessions) {
    events.push({ date: session.startsOn, title: `${session.name} begins`, kind: 'Exam' })
    if (session.applicationCloses)
      events.push({
        date: session.applicationCloses,
        title: `${session.name}: applications close`,
        kind: 'Deadline',
      })
    events.push({ date: session.hallTicketsFrom, title: `${session.name}: hall tickets`, kind: 'Exam' })
    if (session.resultDeclaredOn)
      events.push({
        date: session.resultDeclaredOn,
        title: `${session.name}: results declared`,
        kind: 'Result',
      })
  }
  for (const notice of data.notices.filter((item) => item.deadline && noticeVisibleTo(item, student)))
    events.push({ date: notice.deadline!, title: notice.title, kind: 'Deadline' })
  for (const charge of data.charges.filter(
    (item) =>
      item.studentId === student.id &&
      ['Due', 'Overdue', 'Partially paid'].includes(chargeStatus(item, data)),
  ))
    events.push({ date: charge.dueDate, title: `Fee due: ${charge.description}`, kind: 'Fee' })
  return events.sort((a, b) => a.date.localeCompare(b.date))
}

// ── helpdesk ────────────────────────────────────────────────────────────────

export const ticketDueOn = (ticket: Pick<Ticket, 'createdOn' | 'category'>) =>
  addDays(ticket.createdOn, policy.helpdeskSlaDays[ticket.category])

export const ticketOverdue = (ticket: Ticket, today = todayOf()) =>
  (ticket.status === 'Open' || ticket.status === 'In progress') && today > ticketDueOn(ticket)

export function raiseTicket(
  studentId: string,
  studentName: string,
  category: TicketCategory,
  subject: string,
  body: string,
  now = new Date(),
): { ops: Op[]; error?: string } {
  if (!subject.trim() || !body.trim()) return { ops: [], error: 'Add a subject and describe the problem.' }
  return {
    ops: [
      upsert('tickets', {
        id: uid('ticket'),
        studentId,
        category,
        subject: subject.trim(),
        messages: [{ by: studentName, role: 'student', text: body.trim(), at: now.toISOString() }],
        createdOn: todayOf(now),
        status: 'Open',
      }),
    ],
  }
}

// ── mentoring ───────────────────────────────────────────────────────────────

export interface Warning {
  studentId: string
  kind: 'Attendance' | 'New backlog' | 'CGPA drop' | 'Hall ticket blocked'
  detail: string
}

export function mentorWarnings(students: Student[], data: AppData, today = todayOf()): Warning[] {
  const warnings: Warning[] = []
  for (const student of students) {
    for (const row of data.courseAttendance.filter(
      (item) => item.studentId === student.id && item.semester === student.semester,
    )) {
      const percent = attendancePercent(row.held, row.attended)
      if (percent < policy.attendanceRequired)
        warnings.push({
          studentId: student.id,
          kind: 'Attendance',
          detail: `${row.courseCode} at ${percent}%`,
        })
    }
    const latestSemester = data.semesterResults
      .filter((row) => row.studentId === student.id && row.declaredOn)
      .sort((a, b) => b.semester - a.semester)
    const [latest, previous] = latestSemester
    if (latest) {
      const newFails = data.courseResults.filter(
        (row) =>
          row.studentId === student.id &&
          row.semester === latest.semester &&
          row.status === 'Declared' &&
          row.passed === false,
      )
      if (newFails.length && backEligible(student.id, data).length)
        warnings.push({
          studentId: student.id,
          kind: 'New backlog',
          detail: newFails.map((row) => row.courseCode).join(', '),
        })
      if (
        previous &&
        latest.cgpa !== null &&
        previous.cgpa !== null &&
        previous.cgpa - latest.cgpa > policy.mentorWarnings.cgpaDrop
      )
        warnings.push({
          studentId: student.id,
          kind: 'CGPA drop',
          detail: `${previous.cgpa} → ${latest.cgpa}`,
        })
    }
    for (const session of data.examSessions.filter((item) => item.endsOn >= today)) {
      const blockers = hallTicketBlockers(student, session, data)
      if (blockers.length)
        warnings.push({
          studentId: student.id,
          kind: 'Hall ticket blocked',
          detail: `${session.name}: ${blockers[0].reason}`,
        })
    }
  }
  return warnings
}

// next date for a weekly slot like "Tue 14:00", at least tomorrow
export function nextSlotDate(slot: string, today = todayOf()) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const target = days.indexOf(slot.slice(0, 3))
  for (let offset = 1; offset <= 7; offset++) {
    const date = addDays(today, offset)
    if (new Date(`${date}T12:00:00Z`).getUTCDay() === target) return date
  }
  return addDays(today, 7)
}

// ── dashboards ──────────────────────────────────────────────────────────────

export function dashboardFigures(students: Student[], data: AppData, today = todayOf()) {
  const ids = new Set(students.map((student) => student.id))
  const declared = data.courseResults.filter((row) => ids.has(row.studentId) && row.status === 'Declared')
  const byCourse = new Map<string, { passed: number; total: number }>()
  for (const row of declared) {
    const entry = byCourse.get(row.courseCode) ?? { passed: 0, total: 0 }
    entry.total++
    if (row.passed) entry.passed++
    byCourse.set(row.courseCode, entry)
  }
  const rechecks = data.rechecks.filter((row) => ids.has(row.studentId))
  const turnaround = rechecks
    .filter((row) => row.status === 'Result published' && row.closedOn)
    .map((row) => daysBetween(row.requestDate, row.closedOn!))
    .sort((a, b) => a - b)
  const placed = new Set(
    data.applications
      .filter((row) => ids.has(row.studentId) && row.stage === 'Selected')
      .map((row) => row.studentId),
  )
  const charges = data.charges.filter((row) => ids.has(row.studentId) && !row.cancelledOn)
  const billed = charges.reduce((total, row) => total + row.amount - row.concession, 0)
  const due = students.reduce((total, student) => total + balanceDue(student.id, data), 0)
  return {
    students: students.length,
    passRates: [...byCourse.entries()].map(([code, value]) => ({
      code,
      rate: Math.round((value.passed / value.total) * 100),
      total: value.total,
    })),
    withBacklogs: students.filter((student) => backEligible(student.id, data).length).length,
    rechecks: rechecks.length,
    medianTurnaround: turnaround.length ? turnaround[Math.floor(turnaround.length / 2)] : null,
    placementRate: students.length ? Math.round((placed.size / students.length) * 100) : 0,
    feeCollected: billed - due,
    feeBilled: billed,
    atRisk: new Set(mentorWarnings(students, data, today).map((warning) => warning.studentId)).size,
  }
}

// ── CSV ─────────────────────────────────────────────────────────────────────

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const cell = (value: unknown) => {
    const text =
      value === null || value === undefined
        ? ''
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [headers.join(','), ...rows.map((row) => headers.map((header) => cell(row[header])).join(','))].join(
    '\n',
  )
}

// minimal RFC 4180 parser: quoted fields, escaped quotes, commas and newlines inside quotes
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') (field += '"'), i++
      else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') row.push(field), (field = '')
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field), rows.push(row), (row = []), (field = '')
    } else field += char
  }
  if (field || row.length) row.push(field), rows.push(row)
  const [headers, ...body] = rows.filter((line) => line.some((value) => value.trim()))
  return headers
    ? body.map((line) =>
        Object.fromEntries(headers.map((header, index) => [header.trim(), (line[index] ?? '').trim()])),
      )
    : []
}

export function downloadText(filename: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  link.click()
  URL.revokeObjectURL(url)
}
