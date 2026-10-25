import { useState } from 'react'
import { AlertTriangle, Download, Ticket } from 'lucide-react'
import { Button, Callout, Card, DataTable, Field, FilePicker, StatusBadge, Tabs } from '../components/ui'
import {
  applicationWindow,
  applyForExam,
  backEligible,
  canDispute,
  clashes,
  confirmedAttendance,
  courseTitle,
  hallTicketBlockers,
  itemCharge,
  itemState,
  recheckEscalated,
  recheckState,
  recheckWindow,
  recordedOn,
  refundShare,
  requestRecheck,
  requestWithdrawal,
  sessionById,
  specialEligible,
  studentPapers,
} from '../domain/exams'
import { chargeStatus } from '../domain/fees'
import { addDays, rupees, today, uid, upsert } from '../ops'
import { downloadPdf, issueDocument } from '../pdf'
import { policy } from '../policy'
import { useAction, useStudent } from '../store'
import type { ExamApplication, ExamApplicationKind, ExamSession, RecheckService } from '../types'
import { formatDate } from '../utils'

type Tab = 'timetable' | 'attendance' | 'applications' | 'recheck'

export function Exams() {
  const { data, student } = useStudent()
  const [tab, setTab] = useState<Tab>('timetable')
  const disputable = data.examAttendance.filter(
    (row) => row.studentId === student.id && canDispute(row, data),
  ).length
  return (
    <div className="space-y-6">
      <Tabs
        label="Exam sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'timetable', label: 'Timetable & hall ticket' },
          { key: 'attendance', label: 'Exam attendance', badge: disputable },
          { key: 'applications', label: 'Back & special exams' },
          { key: 'recheck', label: 'Rechecking & revaluation' },
        ]}
      />
      {tab === 'timetable' && <Timetable />}
      {tab === 'attendance' && <ExamAttendanceView />}
      {tab === 'applications' && <Applications />}
      {tab === 'recheck' && <Rechecking />}
    </div>
  )
}

// ── timetable and hall ticket ───────────────────────────────────────────────

function Timetable() {
  const { data, student } = useStudent()
  const upcoming = data.examSessions
    .filter((session) => session.endsOn >= today())
    .filter((session) => studentPapers(student.id, session.id, data).length > 0)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
  if (!upcoming.length)
    return (
      <Card>
        <p className="text-sm text-slate-500">No upcoming exams on your timetable.</p>
      </Card>
    )
  return (
    <>
      {upcoming.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </>
  )
}

function SessionCard({ session }: { session: ExamSession }) {
  const { data, student, canAct, commit } = useStudent()
  const [busy, setBusy] = useState(false)
  const papers = studentPapers(student.id, session.id, data)
  const clashing = clashes(papers)
  const blockers = hallTicketBlockers(student, session, data)
  const available = today() >= session.hallTicketsFrom
  const seatFor = (code: string) =>
    data.examRegistrations.find(
      (row) => row.studentId === student.id && row.sessionId === session.id && row.courseCode === code,
    )

  const download = async () => {
    setBusy(true)
    const { doc, op } = issueDocument(student, 'Hall ticket', `Hall ticket – ${session.name}`, session.id)
    if (await commit([op]))
      await downloadPdf(
        {
          title: doc.title,
          serial: doc.serial,
          student,
          facts: [
            ['Session', session.name],
            ['Dates', `${formatDate(session.startsOn)} – ${formatDate(session.endsOn)}`],
          ],
          tables: [
            {
              head: ['Date', 'Time', 'Code', 'Course', 'Venue', 'Seat'],
              widths: [26, 26, 22, 56, 26, 22],
              rows: papers.map((paper) => {
                const seat = seatFor(paper.courseCode)
                return [
                  formatDate(paper.date),
                  paper.time,
                  paper.courseCode,
                  courseTitle(paper.courseCode, data),
                  seat?.room ?? paper.venue,
                  seat?.seat ?? 'On notice board',
                ]
              }),
            },
          ],
          notes: [
            'Carry this hall ticket and your university ID card to every paper. Mobile phones are not allowed in the hall.',
          ],
        },
        `hall-ticket-${session.id}.pdf`,
      )
    setBusy(false)
  }

  return (
    <Card
      title={session.name}
      description={`${formatDate(session.startsOn)} – ${formatDate(session.endsOn)} · hall tickets from ${formatDate(session.hallTicketsFrom)}`}
      action={
        canAct && (
          <Button onClick={download} disabled={busy || blockers.length > 0 || !available}>
            <Ticket size={16} />{' '}
            {available ? 'Download hall ticket' : `Available ${formatDate(session.hallTicketsFrom)}`}
          </Button>
        )
      }
    >
      {blockers.length > 0 && (
        <div className="mb-4">
          <Callout tone="error">
            <p className="font-semibold">Your hall ticket is blocked:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {blockers.map((blocker) => (
                <li key={blocker.reason}>
                  {blocker.reason} {blocker.action}
                </li>
              ))}
            </ul>
          </Callout>
        </div>
      )}
      {clashing.length > 0 && (
        <div className="mb-4">
          <Callout tone="warn">
            <span className="font-semibold">Timetable clash:</span>{' '}
            {clashing
              .map(
                ([a, b]) =>
                  `${courseTitle(a.courseCode, data)} and ${courseTitle(b.courseCode, data)} on ${formatDate(a.date)} (${a.slot})`,
              )
              .join('; ')}
            . You can apply for a special exam for one of them.
          </Callout>
        </div>
      )}
      <DataTable
        rows={papers}
        rowKey={(row) => row.id}
        empty="No papers."
        columns={[
          { label: 'Date', render: (row) => `${formatDate(row.date)} · ${row.slot}` },
          { label: 'Time', render: (row) => row.time },
          {
            label: 'Course',
            render: (row) => <span className="font-semibold">{courseTitle(row.courseCode, data)}</span>,
          },
          { label: 'Venue', render: (row) => seatFor(row.courseCode)?.room ?? row.venue },
          { label: 'Seat', render: (row) => seatFor(row.courseCode)?.seat ?? 'Published later' },
        ]}
      />
    </Card>
  )
}

// ── exam-hall attendance and disputes ───────────────────────────────────────

function ExamAttendanceView() {
  const { data, student, canAct } = useStudent()
  const { error, busy, run } = useAction()
  const rows = data.examAttendance
    .filter((row) => row.studentId === student.id)
    .sort((a, b) => (recordedOn(b) ?? '').localeCompare(recordedOn(a) ?? ''))
  const [form, setForm] = useState<{
    attendanceId: string
    hallTicketNo: string
    seatNo: string
    answerSheetBarcode: string
  } | null>(null)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form) return
    if (!form.hallTicketNo.trim() || !form.seatNo.trim())
      return void run({ ops: [], error: 'Hall ticket number and seat number are needed.' })
    void run(
      {
        ops: [
          upsert('attendanceDisputes', {
            id: uid('dispute'),
            studentId: student.id,
            ...form,
            raisedOn: today(),
          }),
        ],
      },
      () => setForm(null),
    )
  }

  return (
    <Card
      title="Exam-hall attendance"
      description={`Recorded from the signed attendance sheet within ${policy.examAttendance.entryHours} hours, checked by two staff. If you were marked absent but were present, dispute it within ${policy.examAttendance.disputeDays} days.`}
    >
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        empty="No exam attendance recorded."
        columns={[
          {
            label: 'Paper',
            render: (row) => <span className="font-semibold">{courseTitle(row.courseCode, data)}</span>,
          },
          { label: 'Session', render: (row) => sessionById(row.sessionId, data)?.name ?? row.sessionId },
          {
            label: 'Status',
            render: (row) => {
              const status = confirmedAttendance(row)
              return status ? (
                <StatusBadge tone={status === 'Present' ? 'green' : 'red'}>{status}</StatusBadge>
              ) : (
                <StatusBadge tone="slate">Being verified</StatusBadge>
              )
            },
          },
          {
            label: 'Recorded',
            render: (row) =>
              recordedOn(row) && confirmedAttendance(row) ? formatDate(recordedOn(row)!) : '—',
          },
          {
            label: 'Dispute',
            render: (row) => {
              const dispute = data.attendanceDisputes.find((item) => item.attendanceId === row.id)
              if (dispute)
                return (
                  <span className="text-xs">
                    {dispute.decision
                      ? `${dispute.decision}: ${dispute.decisionReason}`
                      : `Raised ${formatDate(dispute.raisedOn)} – under review`}
                  </span>
                )
              if (canAct && canDispute(row, data))
                return (
                  <button
                    className="text-xs font-bold text-brand-700"
                    onClick={() =>
                      setForm({ attendanceId: row.id, hallTicketNo: '', seatNo: '', answerSheetBarcode: '' })
                    }
                  >
                    I was present – dispute (until{' '}
                    {formatDate(addDays(recordedOn(row)!, policy.examAttendance.disputeDays))})
                  </button>
                )
              return <span className="text-xs text-slate-400">—</span>
            },
          },
        ]}
      />
      {form && (
        <form
          onSubmit={submit}
          className="mt-5 grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-3"
        >
          <Field label="Hall ticket number">
            <input
              className="form-input"
              value={form.hallTicketNo}
              onChange={(event) => setForm({ ...form, hallTicketNo: event.target.value })}
            />
          </Field>
          <Field label="Seat number">
            <input
              className="form-input"
              value={form.seatNo}
              onChange={(event) => setForm({ ...form, seatNo: event.target.value })}
            />
          </Field>
          <Field label="Answer-sheet barcode (optional)">
            <input
              className="form-input"
              value={form.answerSheetBarcode}
              onChange={(event) => setForm({ ...form, answerSheetBarcode: event.target.value })}
            />
          </Field>
          {error && (
            <div className="sm:col-span-3">
              <Callout tone="error">{error}</Callout>
            </div>
          )}
          <div className="flex gap-2 sm:col-span-3">
            <Button type="submit" disabled={busy}>
              Raise dispute
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

// ── back and special exams ──────────────────────────────────────────────────

function Applications() {
  const { data, student, canAct } = useStudent()
  const sessions = data.examSessions.filter(
    (session) => session.kind === 'Back & special' && session.endsOn >= today(),
  )
  const mine = data.examApplications
    .filter((row) => row.studentId === student.id)
    .sort((a, b) => b.submittedOn.localeCompare(a.submittedOn))
  return (
    <>
      {canAct && sessions.map((session) => <ApplyCard key={session.id} session={session} />)}
      <Card
        title="Your applications"
        description="Each subject's state. A subject can be in only one active application per session."
      >
        {mine.length === 0 && <p className="text-sm text-slate-500">No applications.</p>}
        <div className="space-y-4">
          {mine.map((application) => (
            <ApplicationRow key={application.id} application={application} />
          ))}
        </div>
      </Card>
    </>
  )
}

function ApplyCard({ session }: { session: ExamSession }) {
  const { data, student, upload, navigate } = useStudent()
  const { error, busy, run, setError } = useAction()
  const window = applicationWindow(session)
  const [kind, setKind] = useState<ExamApplicationKind>('Back')
  const [chosen, setChosen] = useState<string[]>([])
  const [reason, setReason] = useState<ExamApplication['reason']>('Medical')
  const [details, setDetails] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [reviewing, setReviewing] = useState(false)
  const [done, setDone] = useState('')

  const taken = (code: string) =>
    data.examApplicationItems.find(
      (item) =>
        item.studentId === student.id &&
        item.sessionId === session.id &&
        item.courseCode === code &&
        !item.withdrawnOn,
    )
  const options =
    kind === 'Back'
      ? backEligible(student.id, data).map((code) => ({ code, note: 'Failed' }))
      : specialEligible(student.id, data).map((item) => ({
          code: item.courseCode,
          note: `${item.basis === 'Absent' ? 'Absent' : 'Clash'} – ${sessionById(item.missedSessionId, data)?.name ?? ''}`,
          missedSessionId: item.missedSessionId,
          basis: item.basis,
        }))
  const fee = policy.examFees[kind]

  const submit = async () => {
    const special = options.find((item) => chosen.includes(item.code)) as
      | { missedSessionId?: string }
      | undefined
    try {
      const uploaded = kind === 'Special' ? await Promise.all(files.map((file) => upload(file))) : []
      const result = applyForExam(
        {
          student,
          sessionId: session.id,
          kind,
          courseCodes: chosen,
          reason: kind === 'Special' ? reason : null,
          missedSessionId: special?.missedSessionId ?? null,
          details,
          files: uploaded,
        },
        data,
      )
      const ok = await run(result)
      setReviewing(false)
      if (ok) {
        setDone(
          kind === 'Back'
            ? 'Application submitted. Pay the fee on the Fees page to confirm your papers.'
            : 'Application submitted for approval. You will be asked to pay once it is approved.',
        )
        setChosen([])
        setFiles([])
        setDetails('')
      }
    } catch (reason) {
      setError((reason as Error).message)
    }
  }

  return (
    <Card
      title={`Apply – ${session.name}`}
      description={
        window === 'open'
          ? `Applications open until ${formatDate(session.applicationCloses!)}. Back exams are for failed subjects; special exams for papers missed with a valid reason.`
          : window === 'not open'
            ? `Applications open on ${formatDate(session.applicationOpens!)}.`
            : 'Applications are closed.'
      }
    >
      {window === 'open' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['Back', 'Special'] as const).map((item) => (
              <Button
                key={item}
                tone={kind === item ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => (setKind(item), setChosen([]), setReviewing(false))}
              >
                {item} exam ({rupees(policy.examFees[item])} per subject)
              </Button>
            ))}
          </div>
          {options.length === 0 ? (
            <p className="text-sm text-slate-500">
              You have no subjects eligible for a {kind.toLowerCase()} exam.
            </p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs font-medium text-slate-500">Subjects</legend>
              {options.map((option) => {
                const existing = taken(option.code)
                return (
                  <label
                    key={option.code}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${existing ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-slate-200'}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-indigo-600"
                      disabled={!!existing}
                      checked={chosen.includes(option.code)}
                      onChange={(event) =>
                        setChosen(
                          event.target.checked
                            ? [...chosen, option.code]
                            : chosen.filter((code) => code !== option.code),
                        )
                      }
                    />
                    <span>
                      <span className="font-semibold text-slate-800">{courseTitle(option.code, data)}</span> ·{' '}
                      {option.note}
                      {existing && (
                        <span className="block text-xs text-amber-700">
                          Already in your {existing.kind.toLowerCase()} exam application for this session.
                          Withdraw that one first if it was a mistake.
                        </span>
                      )}
                    </span>
                  </label>
                )
              })}
            </fieldset>
          )}
          {kind === 'Special' && options.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Reason">
                <select
                  className="form-input"
                  value={reason ?? ''}
                  onChange={(event) => setReason(event.target.value as ExamApplication['reason'])}
                >
                  <option>Medical</option>
                  <option>Official university duty</option>
                  <option>Timetable clash</option>
                </select>
              </Field>
              <Field label="Details">
                <input
                  className="form-input"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <FilePicker
                  files={files}
                  onChange={setFiles}
                  label="Attach medical certificate or duty letter (PDF/image, up to 5 MB)"
                />
              </div>
            </div>
          )}
          {error && <Callout tone="error">{error}</Callout>}
          {done && (
            <Callout tone="ok">
              {done}{' '}
              <button className="font-bold underline" onClick={() => navigate('fees')}>
                Go to Fees
              </button>
            </Callout>
          )}
          {reviewing ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
              <p className="text-sm font-semibold text-slate-900">Check before you submit</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {chosen.map((code) => (
                  <li key={code}>
                    {courseTitle(code, data)} – {kind} exam – {rupees(fee)}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm font-semibold">
                Total {rupees(fee * chosen.length)} {kind === 'Special' && '(charged only if approved)'}
              </p>
              <div className="mt-3 flex gap-2">
                <Button onClick={submit} disabled={busy}>
                  Confirm and submit
                </Button>
                <Button tone="ghost" onClick={() => setReviewing(false)}>
                  Change
                </Button>
              </div>
            </div>
          ) : (
            <Button disabled={!chosen.length} onClick={() => (setDone(''), setError(''), setReviewing(true))}>
              Review application
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

function ApplicationRow({ application }: { application: ExamApplication }) {
  const { data, student, canAct, actor } = useStudent()
  const { error, busy, run } = useAction()
  const items = data.examApplicationItems.filter((item) => item.applicationId === application.id)
  const session = sessionById(application.sessionId, data)
  const withdrawals = data.withdrawals.filter((row) => row.applicationId === application.id)
  const [selected, setSelected] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [open, setOpen] = useState(false)
  const canWithdraw = canAct && session && today() < session.hallTicketsFrom

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-slate-900">
          {application.kind} exam · {session?.name}
        </p>
        <p className="text-xs text-slate-500">
          Submitted {formatDate(application.submittedOn)}
          {application.source === 'ERP import' && ' · imported from the ERP'}
        </p>
      </div>
      {application.kind === 'Special' && (
        <p className="mt-1 text-xs text-slate-500">
          Reason: {application.reason}.{' '}
          {application.decision
            ? `${application.decision} by ${application.decidedBy}: ${application.decisionReason}`
            : 'Awaiting HoD / exam cell approval.'}
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {items.map((item) => {
          const state = itemState(item, data)
          const charge = itemCharge(item, data)
          return (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <label className="flex items-center gap-2">
                {open && !item.withdrawnOn && (
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-indigo-600"
                    checked={selected.includes(item.id)}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? [...selected, item.id]
                          : selected.filter((id) => id !== item.id),
                      )
                    }
                  />
                )}
                <span>
                  {courseTitle(item.courseCode, data)} · {rupees(item.fee)}
                  {charge && state === 'Withdrawn' && ` · fee ${chargeStatus(charge, data).toLowerCase()}`}
                </span>
              </label>
              <StatusBadge
                tone={
                  state === 'Confirmed'
                    ? 'green'
                    : state === 'Withdrawn' || state === 'Rejected'
                      ? 'slate'
                      : 'amber'
                }
              >
                {state}
              </StatusBadge>
            </li>
          )
        })}
      </ul>
      {withdrawals.map((request) => (
        <p key={request.id} className="mt-2 text-xs text-slate-600">
          Withdrawal requested {formatDate(request.requestedOn)}:{' '}
          {request.decision
            ? `${request.decision}${request.decisionReason ? ` – ${request.decisionReason}` : ''}`
            : 'waiting for the exam cell'}
          .
          {request.decision === 'Approved' &&
            ' Any fee paid is adjusted against your dues or refunded – see Fees.'}
        </p>
      ))}
      {canWithdraw && items.some((item) => !item.withdrawnOn) && (
        <div className="mt-3">
          {!open ? (
            <Button size="sm" tone="secondary" onClick={() => setOpen(true)}>
              Withdraw a subject
            </Button>
          ) : (
            <div className="space-y-2">
              <Field label="Reason">
                <input
                  className="form-input"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="e.g. Applied for both back and special by mistake"
                />
              </Field>
              {selected.map((id) => {
                const item = items.find((row) => row.id === id)!
                return (
                  <p key={id} className="text-xs text-slate-500">
                    {courseTitle(item.courseCode, data)}: {refundShare(item, data).why}
                  </p>
                )
              })}
              {error && <Callout tone="error">{error}</Callout>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      requestWithdrawal(
                        {
                          studentId: student.id,
                          applicationId: application.id,
                          itemIds: selected,
                          reason,
                          requestedBy: actor.name,
                        },
                        data,
                      ),
                      () => (setOpen(false), setSelected([]), setReason('')),
                    )
                  }
                >
                  Send withdrawal request
                </Button>
                <Button size="sm" tone="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {canAct && session && today() >= session.hallTicketsFrom && items.some((item) => !item.withdrawnOn) && (
        <p className="mt-2 text-xs text-slate-500">
          Hall tickets are out; to withdraw now, raise an Exams request under Help & requests.
        </p>
      )}
    </div>
  )
}

// ── rechecking, revaluation, answer-sheet copy ──────────────────────────────

function Rechecking() {
  const { data, student, canAct, navigate } = useStudent()
  const { error, busy, run } = useAction()
  const open = data.examSessions.filter((session) => {
    const window = recheckWindow(session)
    return window && today() >= window.opens && today() <= window.closes
  })
  const [sessionId, setSessionId] = useState(open[0]?.id ?? '')
  const subjects = data.courseResults.filter(
    (row) => row.studentId === student.id && row.sessionId === sessionId && row.status === 'Declared',
  )
  const [courseCode, setCourseCode] = useState('')
  const [service, setService] = useState<RecheckService>('Rechecking')
  const requests = data.rechecks
    .filter((row) => row.studentId === student.id)
    .sort((a, b) => b.requestDate.localeCompare(a.requestDate))
  const [done, setDone] = useState(false)

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr] [&>*]:min-w-0">
      <Card title="New request">
        <div className="mb-4 space-y-1 text-xs leading-5 text-slate-600">
          <p>
            <span className="font-semibold">Rechecking</span> ({rupees(policy.recheck.fees.Rechecking)}):
            totals and unmarked answers are checked.
          </p>
          <p>
            <span className="font-semibold">Revaluation</span> ({rupees(policy.recheck.fees.Revaluation)}):
            another examiner re-marks the paper; marks may go up or down.
          </p>
          <p>
            <span className="font-semibold">Answer-sheet copy</span> (
            {rupees(policy.recheck.fees['Answer-sheet copy'])}): a scanned copy, before deciding on
            revaluation.
          </p>
        </div>
        {!canAct ? null : open.length === 0 ? (
          <p className="text-sm text-slate-500">
            No rechecking window is open. Windows open for {policy.recheck.windowDays} days after results are
            declared.
          </p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              void run(requestRecheck({ student, service, sessionId, courseCode }, data), () => setDone(true))
            }}
          >
            <Field
              label="Results"
              hint={`Open until ${formatDate(recheckWindow(sessionById(sessionId, data)!)?.closes ?? today())}`}
            >
              <select
                className="form-input"
                value={sessionId}
                onChange={(event) => setSessionId(event.target.value)}
              >
                {open.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subject">
              <select
                className="form-input"
                value={courseCode}
                onChange={(event) => setCourseCode(event.target.value)}
              >
                <option value="">Choose…</option>
                {subjects.map((row) => (
                  <option key={row.id} value={row.courseCode}>
                    {courseTitle(row.courseCode, data)} – {row.total} ({row.grade})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Service">
              <select
                className="form-input"
                value={service}
                onChange={(event) => setService(event.target.value as RecheckService)}
              >
                <option>Rechecking</option>
                <option>Revaluation</option>
                <option>Answer-sheet copy</option>
              </select>
            </Field>
            {error && <Callout tone="error">{error}</Callout>}
            {done && !error && (
              <Callout tone="ok">
                Request created.{' '}
                <button type="button" className="font-bold underline" onClick={() => navigate('fees')}>
                  Pay {rupees(policy.recheck.fees[service])} on Fees
                </button>{' '}
                to send it for review.
              </Callout>
            )}
            <Button type="submit" disabled={busy || !courseCode}>
              Submit request ({rupees(policy.recheck.fees[service])})
            </Button>
          </form>
        )}
      </Card>
      <Card
        title="Your requests"
        description={`The exam cell aims to finish within ${policy.recheck.slaDays} days; older requests are escalated to the Controller of Examinations.`}
      >
        <DataTable
          rows={requests}
          rowKey={(row) => row.id}
          empty="No requests."
          columns={[
            {
              label: 'Subject',
              render: (row) => (
                <div>
                  <p className="font-semibold">{row.subject}</p>
                  <p className="text-xs text-slate-500">
                    {row.service} · {row.code}
                  </p>
                </div>
              ),
            },
            { label: 'Requested', render: (row) => formatDate(row.requestDate) },
            {
              label: 'Status',
              render: (row) => {
                const state = recheckState(row, data)
                return (
                  <div className="space-y-1">
                    <StatusBadge
                      tone={
                        state === 'Result published'
                          ? 'green'
                          : state === 'Rejected'
                            ? 'red'
                            : state === 'Fee due'
                              ? 'amber'
                              : 'blue'
                      }
                    >
                      {state}
                    </StatusBadge>
                    {recheckEscalated(row) && (
                      <p className="flex items-center gap-1 text-xs text-rose-700">
                        <AlertTriangle size={12} /> Escalated
                      </p>
                    )}
                  </div>
                )
              },
            },
            {
              label: 'Outcome',
              render: (row) => <span className="text-xs">{row.outcome ?? row.remarks}</span>,
            },
            { label: 'Expected by', render: (row) => formatDate(row.expectedBy) },
          ]}
        />
        <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
          <Download size={12} /> Changed marks appear on the Results page with their history, and older
          grade-sheet downloads are marked superseded.
        </p>
      </Card>
    </div>
  )
}
