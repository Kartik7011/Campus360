import { useState } from 'react'
import { CalendarDays, Mail, Phone, ShieldCheck } from 'lucide-react'
import {
  Button,
  Callout,
  Card,
  DataTable,
  Field,
  FilePicker,
  InfoRow,
  InitialsAvatar,
  ProgressBar,
  StatusBadge,
} from '../components/ui'
import { nextSlotDate } from '../domain/campus'
import { attendancePercent, classesToRecover, courseTitle } from '../domain/exams'
import { today, uid, upsert } from '../ops'
import { policy } from '../policy'
import { useAction, useStudent } from '../store'
import type { CondonationRequest } from '../types'
import { formatDate } from '../utils'

export function Academic() {
  const { data, student } = useStudent()
  const creditProgress = Math.round((student.creditsCompleted / student.totalCredits) * 100)
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          The fields that decide exam eligibility, hall tickets and placement rules, straight from the
          university record.
        </p>
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 sm:self-auto">
          <ShieldCheck size={15} /> {student.source}
        </span>
      </div>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] [&>*]:min-w-0">
        <Card>
          <div className="flex items-center gap-4">
            <InitialsAvatar initials={student.initials} size="xl" />
            <div className="min-w-0">
              <p className="font-display text-xl font-semibold text-slate-950">{student.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {student.program} · Semester {student.semester} · Batch {student.batch}
              </p>
              <p className="mt-1 break-all text-sm text-brand-700">{student.email}</p>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {[
              ['Enrolment no.', student.enrolmentNo],
              ['School', student.school.replace('School of ', '')],
              ['Branch', student.branch.replace(' & Engineering', '')],
              ['Graduating', String(student.graduationYear ?? 'Unknown')],
              ['Entry', student.lateralEntry ? 'Lateral entry' : 'Regular'],
              ['APAAR / ABC ID', student.apaarId ?? 'Not linked'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Last synced{' '}
            {new Date(student.syncedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.
            Something wrong? Raise a Data correction request under Help & requests.
          </p>
        </Card>

        <Card title="Academic standing">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-indigo-50 p-5">
              <p className="text-xs font-medium text-indigo-600">CGPA</p>
              <p className="mt-2 font-display text-4xl font-bold tracking-tight text-indigo-950">
                {student.cgpa?.toFixed(2) ?? '—'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-medium text-slate-500">Attendance (overall)</p>
              <p className="mt-2 font-display text-4xl font-bold tracking-tight text-slate-950">
                {student.attendance}%
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-800">Active backlogs</p>
                <span
                  className={`font-display text-xl font-bold ${student.activeBacklogs ? 'text-amber-600' : 'text-emerald-600'}`}
                >
                  {student.activeBacklogs ?? '—'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {student.backlogSubjects?.length
                  ? `Pending: ${student.backlogSubjects.join(', ')}`
                  : 'None on record'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-800">Debarment</p>
                <StatusBadge tone={student.debarred ? 'red' : student.debarred === null ? 'purple' : 'green'}>
                  {student.debarred ? 'Debarred' : student.debarred === null ? 'Unknown' : 'Clear'}
                </StatusBadge>
              </div>
              {student.debarredReason && (
                <p className="mt-2 text-xs text-slate-500">{student.debarredReason}</p>
              )}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Credits completed</span>
            <span className="text-slate-800">
              {student.creditsCompleted} / {student.totalCredits}
            </span>
          </div>
          <ProgressBar value={creditProgress} tone="teal" className="mt-2" />
        </Card>
      </section>

      <AttendanceCard />
      <MentorCard />
      {data.ufmCases.some((row) => row.studentId === student.id) && <UfmCard />}
    </div>
  )
}

function AttendanceCard() {
  const { data, student, canAct, upload } = useStudent()
  const { error, busy, run, setError } = useAction()
  const rows = data.courseAttendance.filter(
    (row) => row.studentId === student.id && row.semester === student.semester,
  )
  const condonations = data.condonations.filter((row) => row.studentId === student.id)
  const [form, setForm] = useState<{
    courseCode: string
    reason: CondonationRequest['reason']
    details: string
    files: File[]
  } | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form) return
    if (!form.details.trim() || !form.files.length)
      return setError('Describe the reason and attach the supporting document.')
    try {
      const files = await Promise.all(form.files.map((file) => upload(file)))
      await run(
        {
          ops: [
            upsert('condonations', {
              id: uid('condonation'),
              studentId: student.id,
              courseCode: form.courseCode,
              reason: form.reason,
              details: form.details.trim(),
              files,
              requestedOn: today(),
            }),
          ],
        },
        () => setForm(null),
      )
    } catch (reason) {
      setError((reason as Error).message)
    }
  }

  return (
    <Card
      title="Attendance by course"
      description={`You need ${policy.attendanceRequired}% in each course to sit its end-term exam.`}
    >
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        empty="No attendance recorded yet this semester."
        columns={[
          {
            label: 'Course',
            render: (row) => <span className="font-semibold">{courseTitle(row.courseCode, data)}</span>,
          },
          { label: 'Attended', render: (row) => `${row.attended} of ${row.held}` },
          {
            label: 'Percentage',
            render: (row) => {
              const percent = attendancePercent(row.held, row.attended)
              return (
                <StatusBadge
                  tone={percent < policy.attendanceRequired ? 'red' : 'green'}
                >{`${percent}%`}</StatusBadge>
              )
            },
          },
          {
            label: 'What to do',
            render: (row) => {
              const needed = classesToRecover(row.held, row.attended)
              const request = condonations.find((item) => item.courseCode === row.courseCode)
              if (request)
                return (
                  <span className="text-xs">
                    Condonation {request.decision ? request.decision.toLowerCase() : 'under review'}
                    {request.decisionReason ? `: ${request.decisionReason}` : ''}
                  </span>
                )
              if (!needed) return <span className="text-xs text-slate-500">On track</span>
              return (
                <div className="space-y-1 text-xs">
                  <p>
                    Attend the next {needed} classes to reach {policy.attendanceRequired}%.
                  </p>
                  {canAct && (
                    <button
                      className="font-bold text-brand-700"
                      onClick={() =>
                        setForm({ courseCode: row.courseCode, reason: 'Medical', details: '', files: [] })
                      }
                    >
                      Apply for condonation
                    </button>
                  )}
                </div>
              )
            },
          },
        ]}
      />
      {form && (
        <form
          onSubmit={submit}
          className="mt-5 grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2"
        >
          <p className="text-sm font-semibold text-slate-900 sm:col-span-2">
            Condonation for {courseTitle(form.courseCode, data)}
          </p>
          <Field label="Reason">
            <select
              className="form-input"
              value={form.reason}
              onChange={(event) =>
                setForm({ ...form, reason: event.target.value as CondonationRequest['reason'] })
              }
            >
              <option>Medical</option>
              <option>Official university duty</option>
            </select>
          </Field>
          <Field label="Details">
            <input
              className="form-input"
              value={form.details}
              onChange={(event) => setForm({ ...form, details: event.target.value })}
              placeholder="Dates and what happened"
            />
          </Field>
          <div className="sm:col-span-2">
            <FilePicker files={form.files} onChange={(files) => setForm({ ...form, files })} />
          </div>
          {error && (
            <div className="sm:col-span-2">
              <Callout tone="error">{error}</Callout>
            </div>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              Submit to HoD
            </Button>
            <Button tone="ghost" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}

function MentorCard() {
  const { data, student, canAct } = useStudent()
  const { error, busy, run } = useAction()
  const mentor = data.mentors.find((item) => item.id === student.mentorId)
  const bookings = data.mentorBookings.filter((row) => row.studentId === student.id)
  const [slot, setSlot] = useState(mentor?.slots[0] ?? '')
  const [topic, setTopic] = useState('')
  if (!mentor) return null
  const book = (event: React.FormEvent) => {
    event.preventDefault()
    if (!topic.trim()) return void run({ ops: [], error: 'Say briefly what you want to discuss.' })
    const date = nextSlotDate(slot)
    if (bookings.some((row) => row.date === date && row.slot === slot && row.status !== 'Declined'))
      return void run({ ops: [], error: 'You already have this slot booked.' })
    void run(
      {
        ops: [
          upsert('mentorBookings', {
            id: uid('booking'),
            studentId: student.id,
            mentorId: mentor.id,
            date,
            slot,
            topic: topic.trim(),
            status: 'Requested',
          }),
        ],
      },
      () => setTopic(''),
    )
  }
  return (
    <Card title="Your mentor">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <InitialsAvatar initials={mentor.initials} size="lg" tone="teal" />
            <div>
              <p className="font-display text-lg font-semibold text-slate-900">{mentor.name}</p>
              <p className="text-sm text-slate-500">{mentor.department}</p>
            </div>
          </div>
          <InfoRow
            icon={<Mail size={16} />}
            label="Email"
            value={
              <a className="break-all text-brand-700" href={`mailto:${mentor.email}`}>
                {mentor.email}
              </a>
            }
          />
          <InfoRow icon={<Phone size={16} />} label="Phone" value={mentor.phone} />
          <InfoRow
            icon={<CalendarDays size={16} />}
            label="Office hours"
            value={mentor.officeHours}
            helper={mentor.focus}
          />
        </div>
        <div>
          {canAct && (
            <form onSubmit={book} className="grid gap-3 sm:grid-cols-2">
              <Field label="Slot">
                <select className="form-input" value={slot} onChange={(event) => setSlot(event.target.value)}>
                  {mentor.slots.map((item) => (
                    <option key={item} value={item}>
                      {item} ({formatDate(nextSlotDate(item))})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Topic">
                <input
                  className="form-input"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="e.g. Backlog plan"
                />
              </Field>
              {error && (
                <div className="sm:col-span-2">
                  <Callout tone="error">{error}</Callout>
                </div>
              )}
              <Button type="submit" disabled={busy} className="sm:col-span-2">
                Request appointment
              </Button>
            </form>
          )}
          <ul className="mt-4 space-y-2">
            {bookings.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"
              >
                <span>
                  {formatDate(row.date)} · {row.slot} – {row.topic}
                </span>
                <StatusBadge
                  tone={row.status === 'Confirmed' ? 'green' : row.status === 'Declined' ? 'red' : 'amber'}
                >
                  {row.status}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}

function UfmCard() {
  const { data, student } = useStudent()
  return (
    <Card title="Unfair-means cases" description="Status only; evidence is with the exam committee.">
      <DataTable
        rows={data.ufmCases.filter((row) => row.studentId === student.id)}
        rowKey={(row) => row.id}
        empty=""
        columns={[
          { label: 'Paper', render: (row) => courseTitle(row.courseCode, data) },
          { label: 'Status', render: (row) => <StatusBadge tone="amber">{row.status}</StatusBadge> },
          { label: 'Hearing', render: (row) => (row.hearingOn ? formatDate(row.hearingOn) : '—') },
          { label: 'Outcome', render: (row) => row.outcome ?? 'Pending' },
        ]}
      />
    </Card>
  )
}
