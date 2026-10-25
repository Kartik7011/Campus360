import { useState } from 'react'
import { Search } from 'lucide-react'
import { Button, Callout, Card, DataTable, Field, StatusBadge } from '../components/ui'
import { raiseTicket, ticketDueOn, ticketOverdue } from '../domain/campus'
import { patch } from '../ops'
import { faqs, policy } from '../policy'
import { useAction, useStudent } from '../store'
import type { Ticket, TicketCategory } from '../types'
import { formatDate } from '../utils'

const categories: TicketCategory[] = ['Data correction', 'Fees', 'Exams', 'Placements', 'Other']

export function Help() {
  const { data, student } = useStudent()
  const tickets = data.tickets
    .filter((row) => row.studentId === student.id)
    .sort((a, b) => b.createdOn.localeCompare(a.createdOn))
  return (
    <div className="space-y-6">
      <NewTicket />
      <Card
        title="Your requests"
        description="Each office answers within its published time; overdue requests are escalated automatically."
      >
        {tickets.length === 0 && <p className="text-sm text-slate-500">No requests yet.</p>}
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <TicketThread key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </Card>
      <NoDues />
    </div>
  )
}

function NewTicket() {
  const { student, canAct } = useStudent()
  const { error, busy, run } = useAction()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<TicketCategory>('Data correction')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sent, setSent] = useState(false)
  const matches = faqs.filter(
    (faq) =>
      !query || `${faq.q} ${faq.a}`.toLowerCase().includes(query.toLowerCase()) || faq.category === category,
  )
  return (
    <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
      <Card title="Common questions">
        <label className="relative block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="form-input pl-9"
            placeholder="Search help"
            aria-label="Search help"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="mt-4 space-y-2">
          {matches.map((faq) => (
            <details key={faq.q} className="rounded-xl border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">{faq.q}</summary>
              <p className="mt-2 text-sm leading-6 text-slate-600">{faq.a}</p>
            </details>
          ))}
        </div>
      </Card>
      {canAct && (
        <Card title="Still need help?" description="Your request goes to the office that handles it.">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              void run(
                raiseTicket(student.id, student.name, category, subject, body),
                () => (setSubject(''), setBody(''), setSent(true)),
              )
            }}
          >
            <Field label="Topic" hint={`Answered within ${policy.helpdeskSlaDays[category]} days`}>
              <select
                className="form-input"
                value={category}
                onChange={(event) => setCategory(event.target.value as TicketCategory)}
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Subject">
              <input
                className="form-input"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </Field>
            <Field label="Details">
              <textarea
                className="form-input h-28 py-2"
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </Field>
            {error && <Callout tone="error">{error}</Callout>}
            {sent && !error && <Callout tone="ok">Request sent. You’ll see replies below.</Callout>}
            <Button type="submit" disabled={busy}>
              Send request
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}

function TicketThread({ ticket }: { ticket: Ticket }) {
  const { student, canAct } = useStudent()
  const { error, busy, run } = useAction()
  const [reply, setReply] = useState('')
  const overdue = ticketOverdue(ticket)
  const send = (status?: Ticket['status']) =>
    void run(
      {
        ops: [
          patch('tickets', ticket.id, {
            messages: reply.trim()
              ? [
                  ...ticket.messages,
                  { by: student.name, role: 'student', text: reply.trim(), at: new Date().toISOString() },
                ]
              : ticket.messages,
            ...(status ? { status } : {}),
          }),
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
            {ticket.category} · opened {formatDate(ticket.createdOn)} · answer due{' '}
            {formatDate(ticketDueOn(ticket))}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge
            tone={
              ticket.status === 'Resolved' || ticket.status === 'Closed'
                ? 'green'
                : ticket.status === 'With grievance committee'
                  ? 'purple'
                  : 'amber'
            }
          >
            {ticket.status}
          </StatusBadge>
          {overdue && <StatusBadge tone="red">Escalated – overdue</StatusBadge>}
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {ticket.messages.map((message, index) => (
          <li
            key={index}
            className={`rounded-lg px-3 py-2 text-sm ${message.role === 'staff' ? 'bg-brand-50/60' : 'bg-slate-50'}`}
          >
            <p className="text-xs font-semibold text-slate-500">
              {message.by} ·{' '}
              {new Date(message.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            <p className="mt-0.5 leading-6 text-slate-700">{message.text}</p>
          </li>
        ))}
      </ul>
      {ticket.committeeOutcome && (
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-semibold">Grievance committee:</span> {ticket.committeeOutcome}
        </p>
      )}
      {canAct && ticket.status !== 'Closed' && ticket.status !== 'With grievance committee' && (
        <div className="mt-3 space-y-2">
          <textarea
            className="form-input h-20 py-2"
            placeholder="Add a reply"
            aria-label="Reply"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
          />
          {error && <Callout tone="error">{error}</Callout>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || !reply.trim()} onClick={() => send()}>
              Send reply
            </Button>
            {ticket.status === 'Resolved' && (
              <Button
                size="sm"
                tone="secondary"
                disabled={busy}
                onClick={() => send('With grievance committee')}
              >
                Not satisfied – escalate to the grievance committee
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NoDues() {
  const { data, student } = useStudent()
  const rows = data.noDues.filter((row) => row.studentId === student.id)
  if (!rows.length) return null
  const cleared = rows.filter((row) => row.status === 'Cleared').length
  return (
    <Card
      title="No-dues clearance"
      description={`${cleared} of ${rows.length} offices cleared. Final documents need every office cleared.`}
    >
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        empty=""
        columns={[
          { label: 'Office', render: (row) => <span className="font-semibold">{row.office}</span> },
          {
            label: 'Status',
            render: (row) => (
              <StatusBadge tone={row.status === 'Cleared' ? 'green' : 'amber'}>{row.status}</StatusBadge>
            ),
          },
          { label: 'Cleared on', render: (row) => (row.clearedOn ? formatDate(row.clearedOn) : '—') },
          { label: 'Remarks', render: (row) => <span className="text-xs">{row.remarks || '—'}</span> },
        ]}
      />
    </Card>
  )
}
