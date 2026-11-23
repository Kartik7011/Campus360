import { writeFileSync } from 'node:fs'
import { seedData } from '../src/data'
import type { AppData, CollectionKey } from '../src/types'

const studentId = 'kartik'
const studentEmail = 'student@campus360.example'
const parentEmail = 'parent@campus360.example'
const staffEmail = 'staff@campus360.example'
const rowsOwnedByStudent: CollectionKey[] = [
  'noticeReads', 'notifications', 'courseResults', 'semesterResults', 'markChanges', 'creditTransfers',
  'issuedDocuments', 'documentRequests', 'courseAttendance', 'condonations', 'examRegistrations',
  'examAttendance', 'examSheetScans', 'attendanceDisputes', 'ufmCases', 'rechecks', 'examApplications',
  'examApplicationItems', 'withdrawals', 'charges', 'payments', 'settlements', 'scholarships', 'tickets',
  'mentorBookings', 'mentorNotes', 'noDues', 'careerRecords', 'applications', 'resumes',
]

const data = structuredClone(seedData)
const student = data.students.find((row) => row.id === studentId)!
Object.assign(student, {
  name: 'Demo Student', initials: 'DS', email: studentEmail, phone: '0000000000', enrolmentNo: 'DEMO-0001',
  apaarId: null, cgpa: 8.1, attendance: 88, creditsCompleted: 112, totalCredits: 160, activeBacklogs: 0,
  profileNote: 'Synthetic profile created for exploring the Campus360 demo.',
})
data.students = [student]

const staff = data.staff.find((row) => row.role === 'admin')!
Object.assign(staff, { name: 'Demo Staff', email: staffEmail })
data.staff = [staff]
const mentor = data.mentors.find((row) => row.id === student.mentorId)!
Object.assign(mentor, { name: 'Demo Mentor', initials: 'DM', email: 'mentor@campus360.example', phone: '0000000000' })
data.mentors = [mentor]

for (const key of rowsOwnedByStudent) {
  const rows = data[key] as unknown as Array<{ studentId?: string }>
  Object.assign(data, { [key]: rows.filter((row) => row.studentId === studentId) })
}
data.consents = data.consents
  .filter((row) => row.studentId === studentId)
  .map((row) => ({ ...row, privacyAcceptedOn: '2026-01-01', parentAccess: true, parentEmail }))
data.audit = []
data.resumes = data.resumes.slice(0, 1).map((resume) => ({
  ...resume,
  name: 'Demo Student · Sample resume',
  text: `Demo Student\nComputer Science & Engineering | B.Tech | 2027\n${studentEmail}\n\nSKILLS\nReact, TypeScript, SQL, Git\n\nPROJECTS\nCampus service dashboard — built a sample interface to explore academic status and student support workflows.`,
}))
data.tickets = data.tickets.map((ticket) => ({
  ...ticket,
  messages: ticket.messages.map((message) => ({
    ...message,
    by: message.role === 'student' ? 'Demo Student' : 'Demo Office',
    text: message.text.replace(/Kartik Chauhan/gi, 'Demo Student').replace(/kartik\.chauhan@galgotiasuniversity\.ac\.in/gi, studentEmail),
  })),
}))

const redact = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value
      .replace(/Kartik Chauhan/gi, 'Demo Student')
      .replace(/kartik\.chauhan@galgotiasuniversity\.ac\.in/gi, studentEmail)
      .replace(/kartikchauhan0206@gmail\.com/gi, 'mentor@campus360.example')
      .replace(/\+91 98765 40182/g, '0000000000')
      .replace(/\+91 70117 56999/g, '0000000000')
  }
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)]))
  return value
}

const curatedData = redact(data) as AppData
writeFileSync(new URL('../src/publicDemoSeed.json', import.meta.url), `${JSON.stringify(curatedData, null, 2)}\n`)
console.log('Wrote the isolated public demo fixture to src/publicDemoSeed.json')
