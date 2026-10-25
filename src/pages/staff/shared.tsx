import { useEffect, useState } from 'react'
import { Download, RefreshCw, Trash2 } from 'lucide-react'
import { Button, Callout, Card, DataTable, Field, StatusBadge } from '../../components/ui'
import {
  dashboardFigures,
  describeTarget,
  downloadText,
  ticketDueOn,
  ticketOverdue,
  toCsv,
} from '../../domain/campus'
import { notify } from '../../domain/notify'
import { patch, remove, rupees, today, uid, upsert } from '../../ops'
import { ticketOffice } from '../../policy'
import { useAction, useCampus } from '../../store'
import type { AuditEntry, Notice, NoticeCategory, Student, Ticket } from '../../types'
import { formatDate } from '../../utils'

export function useStudentName() {
  const { data } = useCampus()
  return (id: string) => data.students.find((row) => row.id === id)?.name ?? id
}

export function ExportButton({
  rows,
  filename,
  label = 'Export CSV',
}: {
  rows: Record<string, unknown>[]
  filename: string
  label?: string
}) {
  return (
    <Button
      size="sm"
      tone="secondary"
      disabled={!rows.length}
      onClick={() => downloadText(filename, toCsv(rows))}
    >
      <Download size={14} /> {label}
    </Button>
  )
}

// Students a staff member may see: their department (HoD), school (dean), mentees (mentor), or everyone.
export function useScopedStudents(): Student[] {
  const { data, staff } = useCampus()
  if (!staff) return []
  if (staff.role === 'hod') return data.students.filter((row) => row.branch === staff.department)
  if (staff.role === 'dean') return data.students.filter((row) => row.school === staff.department)
  if (staff.role === 'mentor') return data.students.filter((row) => row.mentorId === staff.id)
  return data.students
}

export function DashboardView() {
  const { data } = useCampus()
  const students = useScopedStudents()
  const figures = dashboardFigures(students, data)
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Students', String(figures.students)],
          ['With backlogs', String(figures.withBacklogs)],
          ['Placement rate', `${figures.placementRate}%`],
          ['At-risk students', String(figures.atRisk)],
          ['Rechecking requests', String(figures.rechecks)],
          ['Median turnaround', figures.medianTurnaround === null ? '—' : `${figures.medianTurnaround} days`],
          ['Fees billed', rupees(figures.feeBilled)],
          ['Fees collected', rupees(figures.feeCollected)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-1 font-display text-xl font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      <Card
        title="Pass rate by course"
        description="Declared results only."
        action={
          <ExportButton rows={figures.passRates} filename="pass-rates.csv" label="Export for NAAC/NIRF" />
        }
      >
        <ul className="space-y-3">
          {figures.passRates
            .sort((a, b) => a.rate - b.rate)
            .map((row) => (
              <li key={row.code}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-800">
                    {data.courses.find((course) => course.code === row.code)?.title ?? row.code}
                  </span>
                  <span className="text-slate-600">
                    {row.rate}% of {row.total}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${row.rate < 60 ? 'bg-amber-500' : 'bg-brand-500'}`}
                    style={{ width: `${row.rate}%` }}
                  />
                </div>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  )
}

const categories: NoticeCategory[] = ['Academic', 'Exams', 'Fees', 'Placement', 'Rechecking']

export function NoticesManager() {
  const { data, actor } = useCampus()
  const { error, busy, run } = useAction()
  const blank = {
    title: '',
    summary: '',
    category: 'Academic' as NoticeCategory,
    priority: 'Medium' as Notice['priority'],
    deadline: '',
    audience: '',
    mandatory: false,
    school: '',
    program: '',
    semester: '',
    batch: '',
  }
  const [form, setForm] = useState(blank)
  const schools = [...new Set(data.students.map((row) => row.school))]
  const programs = [...new Set(data.students.map((row) => row.program))]

  const publish = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.summary.trim())
      return void run({ ops: [], error: 'Add a title and summary.' })
    const target = {
      ...(form.school ? { schools: [form.school] } : {}),
      ...(form.program ? { programs: [form.program] } : {}),
      ...(form.semester ? { semesters: [Number(form.semester)] } : {}),
      ...(form.batch ? { batches: [Number(form.batch)] } : {}),
    }
    const notice: Notice = {
      id: uid('notice'),
      title: form.title.trim(),
      summary: form.summary.trim(),
      category: form.category,
      priority: form.priority,
      date: today(),
      deadline: form.deadline || undefined,
      audience: form.audience.trim() || describeTarget({ target } as Notice),
      source: actor.name,
      target: Object.keys(target).length ? target : null,
      mandatory: form.mandatory,
    }
    void run({ ops: [upsert('notices', notice)] }, () => setForm(blank))
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] [&>*]:min-w-0">
      <Card
        title="Publish a notice"
        description="Target a school, programme, semester or batch; leave blank for everyone."
      >
        <form onSubmit={publish} className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" wide>
            <input
              className="form-input"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </Field>
          <Field label="Summary" wide>
            <textarea
              className="form-input h-24 py-2"
              value={form.summary}
              onChange={(event) => setForm({ ...form, summary: event.target.value })}
            />
          </Field>
          <Field label="Category">
            <select
              className="form-input"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value as NoticeCategory })}
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              className="form-input"
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value as Notice['priority'] })}
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </Field>
          <Field label="School">
            <select
              className="form-input"
              value={form.school}
              onChange={(event) => setForm({ ...form, school: event.target.value })}
            >
              <option value="">All schools</option>
              {schools.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Programme">
            <select
              className="form-input"
              value={form.program}
              onChange={(event) => setForm({ ...form, program: event.target.value })}
            >
              <option value="">All programmes</option>
              {programs.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Semester">
            <input
              className="form-input"
              inputMode="numeric"
              placeholder="Any"
              value={form.semester}
              onChange={(event) => setForm({ ...form, semester: event.target.value.replace(/\D/g, '') })}
            />
          </Field>
          <Field label="Batch (admission year)">
            <input
              className="form-input"
              inputMode="numeric"
              placeholder="Any"
              value={form.batch}
              onChange={(event) => setForm({ ...form, batch: event.target.value.replace(/\D/g, '') })}
            />
          </Field>
          <Field label="Deadline (optional)">
            <input
              type="date"
              className="form-input"
              value={form.deadline}
              onChange={(event) => setForm({ ...form, deadline: event.target.value })}
            />
          </Field>
          <Field label="Audience label (optional)">
            <input
              className="form-input"
              value={form.audience}
              onChange={(event) => setForm({ ...form, audience: event.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-indigo-600"
              checked={form.mandatory}
              onChange={(event) => setForm({ ...form, mandatory: event.target.checked })}
            />
            Students must acknowledge reading it
          </label>
          <p className="text-xs text-slate-500 sm:col-span-2">
            Notices appear in the app. Email, SMS and push delivery need the university’s messaging providers
            to be connected.
          </p>
          {error && (
            <div className="sm:col-span-2">
              <Callout tone="error">{error}</Callout>
            </div>
          )}
          <Button type="submit" disabled={busy}>
            Publish
          </Button>
        </form>
      </Card>
      <Card title="Published notices">
        <DataTable
          rows={[...data.notices].sort((a, b) => b.date.localeCompare(a.date))}
          rowKey={(row) => row.id}
          empty="No notices."
          columns={[
            {
              label: 'Notice',
              render: (row) => (
                <div>
                  <p className="font-semibold">{row.title}</p>
                  <p className="text-xs text-slate-500">
                    {row.category} · {formatDate(row.date)} · {describeTarget(row)}
                  </p>
                </div>
              ),
            },
            {
              label: 'Read',
              render: (row) =>
                row.mandatory ? (
                  <span className="text-xs">
                    {data.noticeReads.filter((read) => read.noticeId === row.id).length} acknowledged
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Not required</span>
                ),
            },
            {
              label: '',
              render: (row) => (
                <Button
                  size="sm"
                  tone="danger"
                  disabled={busy}
                  onClick={() => void run({ ops: [remove('notices', row.id)] })}
                >
                  <Trash2 size={14} /> Remove
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}

// Tickets for this office's categories, overdue ones first (FR-HLP-01/02).
export function HelpdeskQueue({ office }: { office: string }) {
  const { data } = useCampus()
  const name = useStudentName()
  const tickets = data.tickets
    .filter(
      (row) =>
        ticketOffice[row.category] === office ||
        (office === 'registrar' && row.status === 'With grievance committee'),
    )
    .sort(
      (a, b) => Number(ticketOverdue(b)) - Number(ticketOverdue(a)) || a.createdOn.localeCompare(b.createdOn),
    )
  return (
    <Card
      title="Helpdesk"
      description="Requests routed to this office. Overdue ones are escalated and listed first."
    >
      {tickets.length === 0 && <p className="text-sm text-slate-500">No requests.</p>}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <StaffTicket
            key={ticket.id}
            ticket={ticket}
            studentName={name(ticket.studentId)}
            committee={office === 'registrar'}
          />
        ))}
      </div>
    </Card>
  )
}

function StaffTicket({
  ticket,
  studentName,
  committee,
}: {
  ticket: Ticket
  studentName: string
  committee: boolean
}) {
  const { actor } = useCampus()
  const { error, busy, run } = useAction()
  const [reply, setReply] = useState('')
  const answer = (status: Ticket['status'], extra: Partial<Ticket> = {}) =>
    void run(
      {
        ops: [
          patch('tickets', ticket.id, {
            messages: reply.trim()
              ? [
                  ...ticket.messages,
                  { by: actor.name, role: 'staff', text: reply.trim(), at: new Date().toISOString() },
                ]
              : ticket.messages,
            status,
            ...(status === 'Resolved' ? { resolvedOn: today() } : {}),
            ...extra,
          }),
          notify(
            ticket.studentId,
            'help',
            `Update on “${ticket.subject}”`,
            reply.trim() || `Status: ${status}`,
          ),
        ],
      },
      () => setReply(''),
    )
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-slate-900">{ticket.subject}</p>
          <p className="text-xs text-slate-500">
            {studentName} · {ticket.category} · opened {formatDate(ticket.createdOn)} · due{' '}
            {formatDate(ticketDueOn(ticket))}
          </p>
        </div>
        <div className="flex gap-1.5">
          <StatusBadge>{ticket.status}</StatusBadge>
          {ticketOverdue(ticket) && <StatusBadge tone="red">Overdue</StatusBadge>}
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {ticket.messages.map((message, index) => (
          <li
            key={index}
            className={`rounded-lg px-3 py-2 text-sm ${message.role === 'staff' ? 'bg-brand-50/60' : 'bg-slate-50'}`}
          >
            <p className="text-xs font-semibold text-slate-500">{message.by}</p>
            <p className="leading-6 text-slate-700">{message.text}</p>
          </li>
        ))}
      </ul>
      {ticket.status !== 'Closed' && (
        <div className="mt-3 space-y-2">
          <textarea
            className="form-input h-20 py-2"
            aria-label="Reply"
            placeholder={committee ? 'Committee decision' : 'Reply to the student'}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
          />
          {error && <Callout tone="error">{error}</Callout>}
          <div className="flex flex-wrap gap-2">
            {committee && ticket.status === 'With grievance committee' ? (
              <Button
                size="sm"
                disabled={busy || !reply.trim()}
                onClick={() => answer('Closed', { committeeOutcome: reply.trim() })}
              >
                Record committee decision and close
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  tone="secondary"
                  disabled={busy || !reply.trim()}
                  onClick={() => answer('In progress')}
                >
                  Reply
                </Button>
                <Button size="sm" disabled={busy} onClick={() => answer('Resolved')}>
                  Reply and resolve
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ChangeLog() {
  const { loadAuditLog } = useCampus()
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const refresh = () => {
    setEntries(null)
    setError('')
    loadAuditLog()
      .then(setEntries)
      .catch((reason: Error) => setError(reason.message))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [])
  const shown = (entries ?? []).filter(
    (entry) =>
      !filter ||
      `${entry.tableName} ${entry.actorEmail} ${entry.rowId}`.toLowerCase().includes(filter.toLowerCase()),
  )
  return (
    <Card
      title="Change log"
      description="Who changed what and when, with old and new values. Written by the database; it can't be edited."
      action={
        <div className="flex gap-2">
          <input
            className="form-input h-9 w-40"
            placeholder="Filter"
            aria-label="Filter changes"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <Button size="sm" tone="secondary" onClick={refresh}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      }
    >
      {error ? (
        <Callout tone="error">Couldn’t load the change log. {error}</Callout>
      ) : !entries ? (
        <div className="space-y-3" aria-label="Loading">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {shown.length === 0 && <li className="py-3 text-sm text-slate-500">No changes yet.</li>}
          {shown.map((entry) => (
            <li key={entry.id} className="py-3">
              <p className="text-sm font-semibold text-slate-800">
                <span className="capitalize">{entry.action}</span> · {entry.tableName.replace(/_/g, ' ')}{' '}
                <span className="font-normal text-slate-500">{entry.rowId}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {entry.actorEmail ?? 'System'} ·{' '}
                {new Date(entry.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                {entry.action === 'update' && changedFields(entry) && ` · changed ${changedFields(entry)}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// e.g. "status, remarks" for an update that changed those two fields
export function changedFields(entry: Pick<AuditEntry, 'old' | 'new'>) {
  const { old, new: next } = entry
  if (!old || !next) return ''
  return Object.keys(next)
    .filter((key) => JSON.stringify(old[key]) !== JSON.stringify(next[key]))
    .map((key) =>
      key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase(),
    )
    .join(', ')
}

export function UsersAndRoles() {
  const { data } = useCampus()
  return (
    <Card
      title="Staff accounts"
      description="Each person signs in as themselves. A role is linked when their university account is first created; staff must set up two-step sign-in."
      action={
        <ExportButton
          rows={data.staff.map(({ name, email, role, department }) => ({ name, email, role, department }))}
          filename="staff.csv"
        />
      }
    >
      <DataTable
        rows={data.staff}
        rowKey={(row) => row.id}
        empty="No staff."
        columns={[
          { label: 'Name', render: (row) => <span className="font-semibold">{row.name}</span> },
          { label: 'Email', render: (row) => <span className="break-all">{row.email}</span> },
          { label: 'Role', render: (row) => <StatusBadge tone="blue">{row.role}</StatusBadge> },
          { label: 'Scope', render: (row) => row.department || 'University-wide' },
        ]}
      />
      <p className="mt-4 text-xs text-slate-500">
        The IT administrator manages accounts and notices but cannot change academic or fee records.
      </p>
    </Card>
  )
}
