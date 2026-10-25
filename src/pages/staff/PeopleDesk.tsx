import { useState } from 'react'
import { Button, Callout, Card, DataTable, Field, StatusBadge, Tabs } from '../../components/ui'
import { mentorWarnings } from '../../domain/campus'
import { attendancePercent, courseTitle } from '../../domain/exams'
import { notify } from '../../domain/notify'
import { patch, today, uid, upsert } from '../../ops'
import { useAction, useCampus } from '../../store'
import type { NoDuesItem } from '../../types'
import { formatDate } from '../../utils'
import { DocumentsDesk } from './ExamOffice'
import {
  ChangeLog,
  DashboardView,
  HelpdeskQueue,
  NoticesManager,
  UsersAndRoles,
  useScopedStudents,
  useStudentName,
} from './shared'

// ── mentor ──────────────────────────────────────────────────────────────────

export function MentorDesk() {
  const [tab, setTab] = useState<'mentees' | 'bookings' | 'notes'>('mentees')
  const { data, staff } = useCampus()
  return (
    <div className="space-y-6">
      <Tabs
        label="Mentor"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'mentees', label: 'Mentees' },
          {
            key: 'bookings',
            label: 'Appointments',
            badge: data.mentorBookings.filter(
              (row) => row.mentorId === staff?.id && row.status === 'Requested',
            ).length,
          },
          { key: 'notes', label: 'Notes' },
        ]}
      />
      {tab === 'mentees' && <Mentees />}
      {tab === 'bookings' && <Bookings />}
      {tab === 'notes' && <Notes />}
    </div>
  )
}

function Mentees() {
  const { data } = useCampus()
  const students = useScopedStudents()
  const warnings = mentorWarnings(students, data)
  return (
    <Card
      title="Your mentees"
      description="Early warnings: attendance below the requirement, a new backlog, a CGPA drop of more than 0.5, or a blocked hall ticket."
    >
      <DataTable
        rows={students}
        rowKey={(row) => row.id}
        empty="No mentees assigned."
        columns={[
          {
            label: 'Student',
            render: (row) => (
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="text-xs text-slate-500">
                  {row.enrolmentNo} · Sem {row.semester} · CGPA {row.cgpa?.toFixed(2) ?? '—'}
                </p>
              </div>
            ),
          },
          {
            label: 'Warnings',
            render: (row) => {
              const mine = warnings.filter((warning) => warning.studentId === row.id)
              return mine.length ? (
                <ul className="space-y-1">
                  {mine.map((warning) => (
                    <li key={warning.kind + warning.detail} className="text-xs">
                      <StatusBadge tone="red">{warning.kind}</StatusBadge> {warning.detail}
                    </li>
                  ))}
                </ul>
              ) : (
                <StatusBadge tone="green">On track</StatusBadge>
              )
            },
          },
          {
            label: 'Attendance',
            render: (row) => (
              <span className="text-xs">
                {data.courseAttendance
                  .filter((item) => item.studentId === row.id && item.semester === row.semester)
                  .map((item) => `${item.courseCode} ${attendancePercent(item.held, item.attended)}%`)
                  .join(' · ') || '—'}
              </span>
            ),
          },
        ]}
      />
    </Card>
  )
}

function Bookings() {
  const { data, staff } = useCampus()
  const name = useStudentName()
  const { busy, run } = useAction()
  const bookings = data.mentorBookings
    .filter((row) => row.mentorId === staff?.id)
    .sort((a, b) => a.date.localeCompare(b.date))
  return (
    <Card title="Appointment requests">
      <DataTable
        rows={bookings}
        rowKey={(row) => row.id}
        empty="No requests."
        columns={[
          { label: 'Student', render: (row) => name(row.studentId) },
          { label: 'When', render: (row) => `${formatDate(row.date)} · ${row.slot}` },
          { label: 'Topic', render: (row) => row.topic },
          {
            label: '',
            render: (row) =>
              row.status === 'Requested' ? (
                <div className="flex gap-1">
                  {(['Confirmed', 'Declined'] as const).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      tone={status === 'Confirmed' ? 'primary' : 'danger'}
                      disabled={busy}
                      onClick={() =>
                        void run({
                          ops: [
                            patch('mentorBookings', row.id, { status }),
                            notify(
                              row.studentId,
                              'academic',
                              `Mentor appointment ${status.toLowerCase()}`,
                              `${formatDate(row.date)} · ${row.slot}`,
                            ),
                          ],
                        })
                      }
                    >
                      {status === 'Confirmed' ? 'Confirm' : 'Decline'}
                    </Button>
                  ))}
                </div>
              ) : (
                <StatusBadge>{row.status}</StatusBadge>
              ),
          },
        ]}
      />
    </Card>
  )
}

function Notes() {
  const { data, staff } = useCampus()
  const students = useScopedStudents()
  const name = useStudentName()
  const { error, busy, run } = useAction()
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [text, setText] = useState('')
  const notes = data.mentorNotes
    .filter((row) => students.some((student) => student.id === row.studentId))
    .sort((a, b) => b.createdOn.localeCompare(a.createdOn))
  return (
    <Card
      title="Advising notes"
      description="Visible to mentors and the HoD only, never to students or parents."
    >
      {staff?.role === 'mentor' && (
        <form
          className="mb-5 grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            if (!text.trim()) return
            void run(
              {
                ops: [
                  upsert('mentorNotes', {
                    id: uid('note'),
                    studentId,
                    mentorId: staff.id,
                    text: text.trim(),
                    createdOn: today(),
                  }),
                ],
              },
              () => setText(''),
            )
          }}
        >
          <Field label="Student">
            <select
              className="form-input"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
            >
              {students.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note">
            <input className="form-input" value={text} onChange={(event) => setText(event.target.value)} />
          </Field>
          <Button type="submit" disabled={busy}>
            Add
          </Button>
        </form>
      )}
      {error && <Callout tone="error">{error}</Callout>}
      <ul className="divide-y divide-slate-100">
        {notes.length === 0 && <li className="py-3 text-sm text-slate-500">No notes.</li>}
        {notes.map((note) => (
          <li key={note.id} className="py-3">
            <p className="text-xs font-semibold text-slate-500">
              {name(note.studentId)} · {formatDate(note.createdOn)} ·{' '}
              {data.mentors.find((mentor) => mentor.id === note.mentorId)?.name}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{note.text}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ── head of department ──────────────────────────────────────────────────────

export function HodDesk() {
  const { data } = useCampus()
  const [tab, setTab] = useState<'dashboard' | 'condonation' | 'notes'>('condonation')
  return (
    <div className="space-y-6">
      <Tabs
        label="Head of Department"
        value={tab}
        onChange={setTab}
        tabs={[
          {
            key: 'condonation',
            label: 'Condonation',
            badge: data.condonations.filter((row) => !row.decision).length,
          },
          { key: 'dashboard', label: 'Department dashboard' },
          { key: 'notes', label: 'Mentor notes' },
        ]}
      />
      {tab === 'dashboard' && <DashboardView />}
      {tab === 'condonation' && <Condonation />}
      {tab === 'notes' && <Notes />}
    </div>
  )
}

function Condonation() {
  const { data, actor, openFile } = useCampus()
  const students = useScopedStudents()
  const name = useStudentName()
  const { error, busy, run } = useAction()
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const requests = data.condonations.filter((row) => students.some((student) => student.id === row.studentId))
  return (
    <Card
      title="Attendance condonation"
      description="Approving lifts the attendance detention for that course's end-term exam."
    >
      {error && (
        <div className="mb-4">
          <Callout tone="error">{error}</Callout>
        </div>
      )}
      <DataTable
        rows={requests}
        rowKey={(row) => row.id}
        empty="No requests."
        columns={[
          { label: 'Student', render: (row) => name(row.studentId) },
          {
            label: 'Course',
            render: (row) => {
              const attendance = data.courseAttendance.find(
                (item) => item.studentId === row.studentId && item.courseCode === row.courseCode,
              )
              return `${courseTitle(row.courseCode, data)}${attendance ? ` – ${attendancePercent(attendance.held, attendance.attended)}%` : ''}`
            },
          },
          {
            label: 'Reason',
            render: (row) => (
              <div className="text-xs">
                <p>
                  {row.reason}: {row.details}
                </p>
                {row.files.map((file) => (
                  <button
                    key={file.name}
                    className="block font-bold text-brand-700"
                    disabled={!file.path}
                    onClick={() => openFile(file)}
                  >
                    {file.name}
                  </button>
                ))}
              </div>
            ),
          },
          {
            label: 'Decision',
            render: (row) =>
              row.decision ? (
                <span className="text-xs">
                  {row.decision}: {row.decisionReason}
                </span>
              ) : (
                <div className="space-y-2">
                  <input
                    className="form-input h-9 text-xs"
                    placeholder="Reason"
                    aria-label="Decision reason"
                    value={reasons[row.id] ?? ''}
                    onChange={(event) => setReasons({ ...reasons, [row.id]: event.target.value })}
                  />
                  <div className="flex gap-1">
                    {(['Approved', 'Rejected'] as const).map((decision) => (
                      <Button
                        key={decision}
                        size="sm"
                        tone={decision === 'Approved' ? 'primary' : 'danger'}
                        disabled={busy || !reasons[row.id]?.trim()}
                        onClick={() =>
                          void run({
                            ops: [
                              patch('condonations', row.id, {
                                decision,
                                decisionReason: reasons[row.id].trim(),
                                decidedBy: actor.name,
                                decidedOn: today(),
                              }),
                              notify(
                                row.studentId,
                                'academic',
                                `Condonation ${decision.toLowerCase()}`,
                                `${courseTitle(row.courseCode, data)}: ${reasons[row.id].trim()}`,
                              ),
                            ],
                          })
                        }
                      >
                        {decision === 'Approved' ? 'Approve' : 'Reject'}
                      </Button>
                    ))}
                  </div>
                </div>
              ),
          },
        ]}
      />
    </Card>
  )
}

// ── registrar and IT administrator ──────────────────────────────────────────

export function RegistrarDesk() {
  const [tab, setTab] = useState<'dashboard' | 'grievance' | 'documents' | 'nodues' | 'log'>('dashboard')
  return (
    <div className="space-y-6">
      <Tabs
        label="Registrar"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'grievance', label: 'Grievance committee' },
          { key: 'documents', label: 'Documents' },
          { key: 'nodues', label: 'No-dues' },
          { key: 'log', label: 'Change log' },
        ]}
      />
      {tab === 'dashboard' && <DashboardView />}
      {tab === 'grievance' && <HelpdeskQueue office="registrar" />}
      {tab === 'documents' && <DocumentsDesk />}
      {tab === 'nodues' && <NoDuesDesk />}
      {tab === 'log' && <ChangeLog />}
    </div>
  )
}

function NoDuesDesk() {
  const { data } = useCampus()
  const name = useStudentName()
  const { busy, run } = useAction()
  const set = (row: NoDuesItem, status: NoDuesItem['status']) =>
    void run({
      ops: [
        patch('noDues', row.id, { status, clearedOn: status === 'Cleared' ? today() : null }),
        notify(row.studentId, 'help', `No-dues: ${row.office} ${status.toLowerCase()}`, row.remarks),
      ],
    })
  return (
    <Card title="No-dues clearance">
      <DataTable
        rows={data.noDues}
        rowKey={(row) => row.id}
        empty="No clearance in progress."
        columns={[
          { label: 'Student', render: (row) => name(row.studentId) },
          { label: 'Office', render: (row) => row.office },
          {
            label: 'Status',
            render: (row) => (
              <StatusBadge tone={row.status === 'Cleared' ? 'green' : 'amber'}>{row.status}</StatusBadge>
            ),
          },
          { label: 'Remarks', render: (row) => <span className="text-xs">{row.remarks || '—'}</span> },
          {
            label: '',
            render: (row) => (
              <Button
                size="sm"
                tone="secondary"
                disabled={busy}
                onClick={() => set(row, row.status === 'Cleared' ? 'Pending' : 'Cleared')}
              >
                {row.status === 'Cleared' ? 'Reopen' : 'Clear'}
              </Button>
            ),
          },
        ]}
      />
    </Card>
  )
}

export function AdminDesk() {
  const [tab, setTab] = useState<'users' | 'notices' | 'log'>('users')
  return (
    <div className="space-y-6">
      <Tabs
        label="IT administrator"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'users', label: 'Staff accounts' },
          { key: 'notices', label: 'Notices' },
          { key: 'log', label: 'Change log' },
        ]}
      />
      {tab === 'users' && <UsersAndRoles />}
      {tab === 'notices' && <NoticesManager />}
      {tab === 'log' && <ChangeLog />}
    </div>
  )
}
