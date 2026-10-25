import { useState } from 'react'
import { AlertTriangle, Upload } from 'lucide-react'
import { Button, Callout, Card, DataTable, Field, StatusBadge, Tabs } from '../../components/ui'
import { parseCsv } from '../../domain/campus'
import {
  attendanceMismatch,
  confirmedAttendance,
  courseTitle,
  decideDispute,
  decideSpecial,
  decideWithdrawal,
  enterAttendance,
  itemState,
  recheckEscalated,
  recheckState,
  requestWithdrawal,
  sessionById,
} from '../../domain/exams'
import { notify } from '../../domain/notify'
import { changeMarks, declareResults, gradeFor } from '../../domain/results'
import { applyOps, patch, today, uid, upsert, type Op } from '../../ops'
import { useAction, useCampus } from '../../store'
import type {
  CourseResult,
  DocumentRequest,
  ExamAttendanceStatus,
  MarkChangeReason,
  Student,
  UfmCase,
} from '../../types'
import { formatDate } from '../../utils'
import { ExportButton, HelpdeskQueue, NoticesManager, useStudentName } from './shared'

type Tab =
  | 'results'
  | 'attendance'
  | 'disputes'
  | 'recheck'
  | 'applications'
  | 'withdrawals'
  | 'documents'
  | 'ufm'
  | 'records'
  | 'helpdesk'
  | 'notices'

export function ExamOffice() {
  const { data } = useCampus()
  const [tab, setTab] = useState<Tab>('recheck')
  const pending = {
    disputes: data.attendanceDisputes.filter((row) => !row.decision).length,
    recheck: data.rechecks.filter((row) => recheckEscalated(row)).length,
    applications: data.examApplications.filter((row) => row.kind === 'Special' && !row.decision).length,
    withdrawals: data.withdrawals.filter((row) => !row.decision).length,
    attendance: data.examAttendance.filter(attendanceMismatch).length,
  }
  return (
    <div className="space-y-6">
      <Tabs
        label="Exam cell"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'recheck', label: 'Rechecking', badge: pending.recheck },
          { key: 'applications', label: 'Back & special', badge: pending.applications },
          { key: 'withdrawals', label: 'Withdrawals', badge: pending.withdrawals },
          { key: 'attendance', label: 'Exam attendance', badge: pending.attendance },
          { key: 'disputes', label: 'Disputes', badge: pending.disputes },
          { key: 'results', label: 'Results' },
          { key: 'documents', label: 'Documents' },
          { key: 'ufm', label: 'UFM cases' },
          { key: 'records', label: 'Student records' },
          { key: 'helpdesk', label: 'Helpdesk' },
          { key: 'notices', label: 'Notices' },
        ]}
      />
      {tab === 'results' && <ResultsDesk />}
      {tab === 'attendance' && <AttendanceDesk />}
      {tab === 'disputes' && <DisputesDesk />}
      {tab === 'recheck' && <RecheckDesk />}
      {tab === 'applications' && <ApplicationsDesk />}
      {tab === 'withdrawals' && <WithdrawalsDesk />}
      {tab === 'documents' && <DocumentsDesk />}
      {tab === 'ufm' && <UfmDesk />}
      {tab === 'records' && <RecordsDesk />}
      {tab === 'helpdesk' && <HelpdeskQueue office="exam" />}
      {tab === 'notices' && <NoticesManager />}
    </div>
  )
}

// ── results ─────────────────────────────────────────────────────────────────

function ResultsDesk() {
  const { data } = useCampus()
  const name = useStudentName()
  const { error, busy, run } = useAction()
  const sessions = data.examSessions
    .filter((row) => row.kind === 'End-term')
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? '')
  const session = sessionById(sessionId, data)
  const rows = data.courseResults.filter((row) => row.sessionId === sessionId)
  const provisional = rows.filter((row) => row.status === 'Provisional')
  const [editing, setEditing] = useState<CourseResult | null>(null)
  const [message, setMessage] = useState('')

  // End-term marks arrive from the ERP as CSV: enrolment_no, course_code, end_term
  const importMarks = async (file: File) => {
    const ops: Op[] = []
    let matched = 0
    for (const line of parseCsv(await file.text())) {
      const student = data.students.find((row) => row.enrolmentNo === line.enrolment_no)
      const result = provisional.find(
        (row) => row.studentId === student?.id && row.courseCode === line.course_code,
      )
      const end = Number(line.end_term)
      if (!result || !Number.isFinite(end) || end < 0 || end > 50) continue
      const components = result.components.map((item) =>
        item.name === 'End-term' ? { ...item, obtained: end } : item,
      )
      const total = components.reduce((sum, item) => sum + (item.obtained ?? 0), 0)
      ops.push(
        patch('courseResults', result.id, { components, total, ...gradeFor(total), status: 'Declared' }),
      )
      matched++
    }
    await run(
      { ops, error: ops.length ? undefined : 'No rows matched a provisional result in this session.' },
      () =>
        setMessage(`Imported end-term marks for ${matched} result(s). Declare the result to publish them.`),
    )
  }

  const declare = () => {
    if (!session) return
    const ops = declareResults(session.id, data)
    const count = ops.filter((op) => op.key === 'notifications').length
    void run({ ops }, () => setMessage(`Declared ${session.name} for ${count} student(s).`))
  }

  return (
    <Card
      title="Results"
      description="Results come from the ERP. Import end-term marks, then declare to publish; correct a declared mark with a reason and it is kept in the history."
      action={
        <select
          aria-label="Session"
          className="form-input sm:w-64"
          value={sessionId}
          onChange={(event) => setSessionId(event.target.value)}
        >
          {sessions.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
              {row.resultDeclaredOn ? ` (declared ${row.resultDeclaredOn})` : ''}
            </option>
          ))}
        </select>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
          <Upload size={14} /> Import end-term marks (CSV)
          <input
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(event) => event.target.files?.[0] && void importMarks(event.target.files[0])}
          />
        </label>
        <Button
          size="sm"
          disabled={busy || !rows.some((row) => row.status === 'Declared') || !!session?.resultDeclaredOn}
          onClick={declare}
        >
          Declare result
        </Button>
        <ExportButton
          rows={rows.map((row) => ({
            enrolment_no: data.students.find((s) => s.id === row.studentId)?.enrolmentNo,
            course_code: row.courseCode,
            total: row.total,
            grade: row.grade,
            status: row.status,
          }))}
          filename={`results-${sessionId}.csv`}
        />
      </div>
      {message && (
        <div className="mb-4">
          <Callout tone="ok">{message}</Callout>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Callout tone="error">{error}</Callout>
        </div>
      )}
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        empty="No results in this session."
        columns={[
          { label: 'Student', render: (row) => name(row.studentId) },
          { label: 'Course', render: (row) => `${row.courseCode} ${courseTitle(row.courseCode, data)}` },
          {
            label: 'Marks',
            render: (row) =>
              row.components.map((item) => item.obtained ?? '—').join(' + ') + ` = ${row.total ?? '—'}`,
          },
          { label: 'Grade', render: (row) => row.grade ?? '—' },
          {
            label: 'Status',
            render: (row) => (
              <StatusBadge tone={row.status === 'Declared' ? 'green' : 'slate'}>{row.status}</StatusBadge>
            ),
          },
          {
            label: '',
            render: (row) =>
              row.status === 'Declared' && (
                <Button size="sm" tone="secondary" onClick={() => setEditing(row)}>
                  Correct
                </Button>
              ),
          },
        ]}
      />
      {editing && <MarkCorrection result={editing} onClose={() => setEditing(null)} />}
    </Card>
  )
}

function MarkCorrection({
  result,
  onClose,
  reason: fixedReason,
  onDone,
}: {
  result: CourseResult
  onClose: () => void
  reason?: MarkChangeReason
  onDone?: (ops: Op[]) => Op[]
}) {
  const { data } = useCampus()
  const { error, busy, run } = useAction()
  const [total, setTotal] = useState(String(result.total ?? ''))
  const [reason, setReason] = useState<MarkChangeReason>(fixedReason ?? 'Correction')
  const [note, setNote] = useState('')
  const save = () => {
    const value = Number(total)
    if (!Number.isInteger(value) || value < 0 || value > 100)
      return void run({ ops: [], error: 'Enter a whole number from 0 to 100.' })
    if (!note.trim()) return void run({ ops: [], error: 'Record why the mark changes.' })
    const ops = changeMarks(result, value, reason, note.trim(), data)
    const all = [
      ...ops,
      ...(ops.length
        ? [
            notify(
              result.studentId,
              'results',
              `Marks changed: ${courseTitle(result.courseCode, data)}`,
              `${result.total} → ${value} (${reason}). ${note.trim()}`,
            ),
          ]
        : []),
    ]
    void run({ ops: onDone ? onDone(all) : all }, onClose)
  }
  return (
    <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-4">
      <p className="text-sm font-semibold sm:col-span-4">
        {courseTitle(result.courseCode, data)}: currently {result.total} ({result.grade})
      </p>
      <Field label="New total">
        <input
          className="form-input"
          inputMode="numeric"
          value={total}
          onChange={(event) => setTotal(event.target.value)}
        />
      </Field>
      <Field label="Reason">
        <select
          className="form-input"
          disabled={!!fixedReason}
          value={reason}
          onChange={(event) => setReason(event.target.value as MarkChangeReason)}
        >
          {(['Rechecking', 'Revaluation', 'Moderation', 'Grace marks', 'Correction'] as const).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>
      <Field label="Note (shown to the student)" wide>
        <input className="form-input" value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
      {error && (
        <div className="sm:col-span-4">
          <Callout tone="error">{error}</Callout>
        </div>
      )}
      <div className="flex gap-2 sm:col-span-4">
        <Button size="sm" disabled={busy} onClick={save}>
          Save
        </Button>
        <Button size="sm" tone="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ── exam-hall attendance ────────────────────────────────────────────────────

const statuses: ExamAttendanceStatus[] = ['Present', 'Absent', 'Unfair means', 'Debarred']

function AttendanceDesk() {
  const { data, actor, upload, openFile } = useCampus()
  const name = useStudentName()
  const { error, busy, run, setError } = useAction()
  const papers = [...data.examPapers].sort((a, b) => b.date.localeCompare(a.date))
  const [paperId, setPaperId] = useState(papers.find((row) => row.date <= today())?.id ?? papers[0]?.id ?? '')
  const [entry, setEntry] = useState<1 | 2>(1)
  const paper = data.examPapers.find((row) => row.id === paperId)
  const registered = paper
    ? data.students.filter(
        (student) =>
          data.examRegistrations.some(
            (row) =>
              row.studentId === student.id &&
              row.sessionId === paper.sessionId &&
              row.courseCode === paper.courseCode,
          ) ||
          data.examApplicationItems.some(
            (item) =>
              item.studentId === student.id &&
              item.sessionId === paper.sessionId &&
              item.courseCode === paper.courseCode &&
              itemState(item, data) === 'Confirmed',
          ),
      )
    : []
  const scan =
    paper &&
    data.examSheetScans.find(
      (row) => row.sessionId === paper.sessionId && row.courseCode === paper.courseCode,
    )
  const mismatches = data.examAttendance.filter(attendanceMismatch)

  const record = (student: Student, status: ExamAttendanceStatus) => {
    if (!paper) return
    const existing = data.examAttendance.find(
      (row) =>
        row.studentId === student.id &&
        row.sessionId === paper.sessionId &&
        row.courseCode === paper.courseCode,
    )
    const row = existing ?? {
      id: `examatt-${student.id}-${paper.sessionId}-${paper.courseCode}`,
      studentId: student.id,
      sessionId: paper.sessionId,
      courseCode: paper.courseCode,
    }
    const result = enterAttendance(row, entry, status, actor.name)
    if (result.error) return setError(result.error)
    const updated = {
      ...row,
      [entry === 1 ? 'entry1' : 'entry2']: { status, by: actor.name, at: new Date().toISOString() },
    }
    const agreed = confirmedAttendance(updated)
    void run({
      ops: [
        ...(existing ? result.ops : [upsert('examAttendance', updated)]),
        ...(agreed
          ? [
              notify(
                student.id,
                'exams',
                'Exam attendance recorded',
                `${courseTitle(paper.courseCode, data)} on ${formatDate(paper.date)}: ${agreed}.${agreed === 'Absent' ? ' If you were present, dispute it within 7 days.' : ''}`,
              ),
            ]
          : []),
      ],
    })
  }

  // enrolment_no, status – keyed as the chosen entry
  const importCsv = async (file: File) => {
    if (!paper) return
    for (const line of parseCsv(await file.text())) {
      const student = registered.find((row) => row.enrolmentNo === line.enrolment_no)
      const status = statuses.find((item) => item.toLowerCase() === line.status?.toLowerCase())
      if (student && status) record(student, status)
    }
  }

  const uploadScan = async (file: File) => {
    if (!paper) return
    try {
      const stored = await upload(file, 'exam-sheets')
      await run({
        ops: [
          upsert('examSheetScans', {
            id: uid('scan'),
            sessionId: paper.sessionId,
            courseCode: paper.courseCode,
            file: stored,
            uploadedBy: actor.name,
            uploadedOn: today(),
          }),
        ],
      })
    } catch (reason) {
      setError((reason as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      {mismatches.length > 0 && (
        <Callout tone="warn">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} /> {mismatches.length} entry mismatch(es) – hidden from students until
            fixed:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {mismatches.map((row) => (
              <li key={row.id}>
                {name(row.studentId)}, {courseTitle(row.courseCode, data)} (
                {sessionById(row.sessionId, data)?.name}): {row.entry1?.by} keyed {row.entry1?.status},{' '}
                {row.entry2?.by} keyed {row.entry2?.status}
              </li>
            ))}
          </ul>
        </Callout>
      )}
      <Card
        title="Key in the signed sheet"
        description="Within 48 hours of each paper. Two different staff each key every sheet; the student sees the status only when both entries agree."
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Paper">
            <select
              className="form-input"
              value={paperId}
              onChange={(event) => setPaperId(event.target.value)}
            >
              {papers.map((row) => (
                <option key={row.id} value={row.id}>
                  {formatDate(row.date)} · {row.courseCode} {courseTitle(row.courseCode, data)} ·{' '}
                  {sessionById(row.sessionId, data)?.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="I am keying">
            <select
              className="form-input"
              value={entry}
              onChange={(event) => setEntry(Number(event.target.value) as 1 | 2)}
            >
              <option value={1}>Entry 1</option>
              <option value={2}>Entry 2 (check)</option>
            </select>
          </Field>
        </div>
        <div className="my-4 flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            <Upload size={14} /> Import entry (CSV: enrolment_no, status)
            <input
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={(event) => event.target.files?.[0] && void importCsv(event.target.files[0])}
            />
          </label>
          <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            <Upload size={14} /> {scan ? 'Replace sheet scan' : 'Upload sheet scan'}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="sr-only"
              onChange={(event) => event.target.files?.[0] && void uploadScan(event.target.files[0])}
            />
          </label>
          {scan && (
            <button
              className="text-xs font-bold text-brand-700"
              onClick={() => openFile(scan.file)}
              disabled={!scan.file.path}
            >
              Scan: {scan.file.name} ({scan.uploadedBy}, {formatDate(scan.uploadedOn)})
            </button>
          )}
        </div>
        {error && (
          <div className="mb-4">
            <Callout tone="error">{error}</Callout>
          </div>
        )}
        <DataTable
          rows={registered}
          rowKey={(row) => row.id}
          empty="No students registered for this paper."
          columns={[
            {
              label: 'Student',
              render: (row) => (
                <div>
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.enrolmentNo}</p>
                </div>
              ),
            },
            {
              label: 'Entries',
              render: (student) => {
                const row =
                  paper &&
                  data.examAttendance.find(
                    (item) =>
                      item.studentId === student.id &&
                      item.sessionId === paper.sessionId &&
                      item.courseCode === paper.courseCode,
                  )
                return (
                  <div className="text-xs">
                    <p>1: {row?.entry1 ? `${row.entry1.status} (${row.entry1.by})` : '—'}</p>
                    <p>2: {row?.entry2 ? `${row.entry2.status} (${row.entry2.by})` : '—'}</p>
                    {row && attendanceMismatch(row) && <StatusBadge tone="red">Mismatch</StatusBadge>}
                  </div>
                )
              },
            },
            {
              label: `Entry ${entry}`,
              render: (student) => (
                <div className="flex flex-wrap gap-1">
                  {statuses.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      tone="secondary"
                      disabled={busy}
                      onClick={() => record(student, status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}

function DisputesDesk() {
  const { data, actor, openFile } = useCampus()
  const name = useStudentName()
  const { error, busy, run } = useAction()
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const disputes = [...data.attendanceDisputes].sort(
    (a, b) => Number(!!a.decision) - Number(!!b.decision) || a.raisedOn.localeCompare(b.raisedOn),
  )
  return (
    <Card
      title="Attendance disputes"
      description="Check the signed sheet scan and the answer-sheet register before deciding."
    >
      {error && (
        <div className="mb-4">
          <Callout tone="error">{error}</Callout>
        </div>
      )}
      <DataTable
        rows={disputes}
        rowKey={(row) => row.id}
        empty="No disputes."
        columns={[
          {
            label: 'Student & paper',
            render: (row) => {
              const attendance = data.examAttendance.find((item) => item.id === row.attendanceId)
              const scan =
                attendance &&
                data.examSheetScans.find(
                  (item) =>
                    item.sessionId === attendance.sessionId && item.courseCode === attendance.courseCode,
                )
              return (
                <div>
                  <p className="font-semibold">{name(row.studentId)}</p>
                  <p className="text-xs text-slate-500">
                    {attendance &&
                      `${courseTitle(attendance.courseCode, data)} · ${sessionById(attendance.sessionId, data)?.name}`}{' '}
                    · raised {formatDate(row.raisedOn)}
                  </p>
                  {scan ? (
                    <button className="text-xs font-bold text-brand-700" onClick={() => openFile(scan.file)}>
                      Sheet scan: {scan.file.name}
                    </button>
                  ) : (
                    <p className="text-xs text-amber-700">No sheet scan uploaded</p>
                  )}
                </div>
              )
            },
          },
          {
            label: 'Evidence',
            render: (row) => (
              <span className="text-xs">
                Hall ticket {row.hallTicketNo}, seat {row.seatNo}
                {row.answerSheetBarcode && `, answer sheet ${row.answerSheetBarcode}`}
              </span>
            ),
          },
          {
            label: 'Decision',
            render: (row) =>
              row.decision ? (
                <span className="text-xs">
                  {row.decision}: {row.decisionReason} ({row.decidedBy})
                </span>
              ) : (
                <div className="space-y-2">
                  <input
                    className="form-input h-9 text-xs"
                    placeholder="Reason"
                    aria-label="Reason"
                    value={reasons[row.id] ?? ''}
                    onChange={(event) => setReasons({ ...reasons, [row.id]: event.target.value })}
                  />
                  <div className="flex gap-1">
                    {(['Upheld', 'Rejected'] as const).map((decision) => (
                      <Button
                        key={decision}
                        size="sm"
                        tone={decision === 'Upheld' ? 'primary' : 'danger'}
                        disabled={busy || !reasons[row.id]?.trim()}
                        onClick={() =>
                          void run({
                            ops: decideDispute(row.id, decision, reasons[row.id].trim(), actor.name, data),
                          })
                        }
                      >
                        {decision === 'Upheld' ? 'Uphold – mark present' : 'Reject'}
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

// ── rechecking queue ────────────────────────────────────────────────────────

function RecheckDesk() {
  const { data } = useCampus()
  const name = useStudentName()
  const { error, busy, run } = useAction()
  const [publishing, setPublishing] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<Record<string, string>>({})
  const queue = [...data.rechecks].sort(
    (a, b) =>
      Number(recheckEscalated(b)) - Number(recheckEscalated(a)) ||
      Number(['Result published', 'Rejected'].includes(a.status)) -
        Number(['Result published', 'Rejected'].includes(b.status)) ||
      a.requestDate.localeCompare(b.requestDate),
  )
  return (
    <Card
      title="Rechecking, revaluation and answer-sheet copies"
      description="Escalated requests (open more than 14 days) are listed first and shown to the Controller of Examinations."
    >
      {error && (
        <div className="mb-4">
          <Callout tone="error">{error}</Callout>
        </div>
      )}
      <DataTable
        rows={queue}
        rowKey={(row) => row.id}
        empty="No requests."
        columns={[
          {
            label: 'Request',
            render: (row) => (
              <div>
                <p className="font-semibold">{name(row.studentId)}</p>
                <p className="text-xs text-slate-500">
                  {row.service} · {row.subject} ({row.code}) · {formatDate(row.requestDate)}
                </p>
              </div>
            ),
          },
          {
            label: 'State',
            render: (row) => (
              <div className="space-y-1">
                <StatusBadge>{recheckState(row, data)}</StatusBadge>
                {recheckEscalated(row) && <StatusBadge tone="red">Escalated</StatusBadge>}
              </div>
            ),
          },
          {
            label: 'Action',
            render: (row) => {
              const state = recheckState(row, data)
              if (row.status === 'Result published' || row.status === 'Rejected')
                return <span className="text-xs">{row.outcome ?? row.remarks}</span>
              return (
                <div className="space-y-2">
                  {state === 'Fee confirmed' && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void run({
                          ops: [
                            patch('rechecks', row.id, {
                              status: 'Under review',
                              remarks: 'Sent to the evaluator.',
                            }),
                            notify(row.studentId, 'exams', `${row.service} under review`, row.subject),
                          ],
                        })
                      }
                    >
                      Start review
                    </Button>
                  )}
                  {row.status === 'Under review' && (
                    <Button size="sm" disabled={busy} onClick={() => setPublishing(row.id)}>
                      Publish result
                    </Button>
                  )}
                  <div className="flex gap-1">
                    <input
                      className="form-input h-9 text-xs"
                      placeholder="Rejection reason"
                      aria-label="Rejection reason"
                      value={rejecting[row.id] ?? ''}
                      onChange={(event) => setRejecting({ ...rejecting, [row.id]: event.target.value })}
                    />
                    <Button
                      size="sm"
                      tone="danger"
                      disabled={busy || !rejecting[row.id]?.trim()}
                      onClick={() =>
                        void run({
                          ops: [
                            patch('rechecks', row.id, {
                              status: 'Rejected',
                              remarks: rejecting[row.id].trim(),
                              closedOn: today(),
                            }),
                            notify(
                              row.studentId,
                              'exams',
                              `${row.service} request rejected`,
                              rejecting[row.id].trim(),
                            ),
                          ],
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )
            },
          },
        ]}
      />
      {publishing && <PublishOutcome requestId={publishing} onClose={() => setPublishing(null)} />}
    </Card>
  )
}

function PublishOutcome({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const { data } = useCampus()
  const { busy, run } = useAction()
  const request = data.rechecks.find((row) => row.id === requestId)!
  const result = data.courseResults.find(
    (row) =>
      row.studentId === request.studentId &&
      row.sessionId === request.sessionId &&
      row.courseCode === request.code,
  )
  const close = (outcome: string): Op[] => [
    patch('rechecks', request.id, {
      status: 'Result published',
      outcome,
      remarks: outcome,
      closedOn: today(),
    }),
  ]
  if (request.service === 'Answer-sheet copy' || !result)
    return (
      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-4">
        <p className="text-sm">
          Mark the {request.service.toLowerCase()} for {request.subject} as done:
        </p>
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            void run(
              {
                ops: [
                  ...close('Scanned copy sent to the student’s university email.'),
                  notify(request.studentId, 'exams', 'Answer-sheet copy sent', request.subject),
                ],
              },
              onClose,
            )
          }
        >
          Copy sent
        </Button>
        <Button size="sm" tone="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    )
  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-4">
        <p className="text-sm">{request.subject}: no change?</p>
        <Button
          size="sm"
          tone="secondary"
          disabled={busy}
          onClick={() =>
            void run(
              {
                ops: [
                  ...close(`Marks unchanged (${result.total}, ${result.grade}).`),
                  notify(
                    request.studentId,
                    'results',
                    `${request.service} result published`,
                    `${request.subject}: marks unchanged.`,
                  ),
                ],
              },
              onClose,
            )
          }
        >
          Publish “marks unchanged”
        </Button>
      </div>
      <MarkCorrection
        result={result}
        reason={request.service === 'Revaluation' ? 'Revaluation' : 'Rechecking'}
        onClose={onClose}
        onDone={(ops) => {
          const change = ops.find((op) => op.type === 'upsert' && op.key === 'markChanges')
          const to =
            change && change.type === 'upsert'
              ? (change.row as unknown as { toTotal: number; toGrade: string })
              : null
          return [
            ...ops,
            ...close(to ? `${result.total} → ${to.toTotal} (${to.toGrade})` : 'Marks unchanged.'),
          ]
        }}
      />
    </div>
  )
}

// ── back & special exams, withdrawals ───────────────────────────────────────

function ApplicationsDesk() {
  const { data, actor } = useCampus()
  const name = useStudentName()
  const { error, busy, run } = useAction()
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const sessions = data.examSessions.filter((row) => row.kind === 'Back & special')
  const pending = data.examApplications.filter((row) => row.kind === 'Special' && !row.decision)
  const { openFile } = useCampus()
  return (
    <div className="space-y-6">
      <Card
        title="Special exam approvals"
        description="Check the reason and documents. The fee is charged only after approval."
      >
        {error && (
          <div className="mb-4">
            <Callout tone="error">{error}</Callout>
          </div>
        )}
        <DataTable
          rows={pending}
          rowKey={(row) => row.id}
          empty="Nothing waiting."
          columns={[
            { label: 'Student', render: (row) => name(row.studentId) },
            {
              label: 'Papers',
              render: (row) =>
                data.examApplicationItems
                  .filter((item) => item.applicationId === row.id)
                  .map((item) => courseTitle(item.courseCode, data))
                  .join(', '),
            },
            {
              label: 'Reason',
              render: (row) => (
                <div className="text-xs">
                  <p>
                    {row.reason} – missed in {sessionById(row.missedSessionId ?? '', data)?.name}
                  </p>
                  <p>{row.details}</p>
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
              render: (row) => (
                <div className="space-y-2">
                  <input
                    className="form-input h-9 text-xs"
                    placeholder="Reason"
                    aria-label="Decision reason"
                    value={reasons[row.id] ?? ''}
                    onChange={(event) => setReasons({ ...reasons, [row.id]: event.target.value })}
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      disabled={busy || !reasons[row.id]?.trim()}
                      onClick={() =>
                        void run({
                          ops: decideSpecial(row.id, 'Approved', reasons[row.id].trim(), actor.name, data),
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      tone="danger"
                      disabled={busy || !reasons[row.id]?.trim()}
                      onClick={() =>
                        void run({
                          ops: decideSpecial(row.id, 'Rejected', reasons[row.id].trim(), actor.name, data),
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Card>
      {sessions.map((session) => {
        const items = data.examApplicationItems.filter((item) => item.sessionId === session.id)
        return (
          <Card
            key={session.id}
            title={`${session.name} – all subjects`}
            action={
              <ExportButton
                rows={items.map((item) => ({
                  enrolment_no: data.students.find((s) => s.id === item.studentId)?.enrolmentNo,
                  course_code: item.courseCode,
                  kind: item.kind,
                  state: itemState(item, data),
                  source: item.source,
                }))}
                filename={`${session.id}-applications.csv`}
              />
            }
          >
            <DataTable
              rows={items}
              rowKey={(row) => row.id}
              empty="No applications."
              columns={[
                { label: 'Student', render: (row) => name(row.studentId) },
                { label: 'Subject', render: (row) => courseTitle(row.courseCode, data) },
                {
                  label: 'Kind',
                  render: (row) => `${row.kind}${row.source === 'ERP import' ? ' (ERP)' : ''}`,
                },
                { label: 'State', render: (row) => <StatusBadge>{itemState(row, data)}</StatusBadge> },
              ]}
            />
          </Card>
        )
      })}
    </div>
  )
}

function WithdrawalsDesk() {
  const { data, actor } = useCampus()
  const name = useStudentName()
  const { error, busy, run } = useAction()
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [staffItem, setStaffItem] = useState('')
  const [staffReason, setStaffReason] = useState('')
  const requests = [...data.withdrawals].sort(
    (a, b) => Number(!!a.decision) - Number(!!b.decision) || a.requestedOn.localeCompare(b.requestedOn),
  )
  const activeItems = data.examApplicationItems.filter((item) => !item.withdrawnOn)

  const staffWithdraw = () => {
    const item = activeItems.find((row) => row.id === staffItem)
    if (!item) return
    const request = requestWithdrawal(
      {
        studentId: item.studentId,
        applicationId: item.applicationId,
        itemIds: [item.id],
        reason: staffReason,
        requestedBy: actor.name,
        byStaff: true,
      },
      data,
    )
    if (request.error || !request.id) return void run(request)
    const decided = decideWithdrawal(
      request.id,
      'Approved',
      staffReason,
      actor.name,
      applyOps(data, request.ops),
    )
    void run({ ops: [...request.ops, ...decided] }, () => (setStaffItem(''), setStaffReason('')))
  }

  return (
    <div className="space-y-6">
      <Card
        title="Withdrawal requests"
        description="Approving withdraws the paper and reduces its fee to the part kept under the refund policy (duplicates are refunded in full). Accounts then settles any credit."
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
            {
              label: 'Student',
              render: (row) => (
                <div>
                  <p className="font-semibold">{name(row.studentId)}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(row.requestedOn)} by {row.requestedBy}
                  </p>
                </div>
              ),
            },
            {
              label: 'Subjects',
              render: (row) =>
                row.itemIds
                  .map((id) => data.examApplicationItems.find((item) => item.id === id))
                  .map((item) => item && `${courseTitle(item.courseCode, data)} (${item.kind})`)
                  .join(', '),
            },
            { label: 'Reason', render: (row) => <span className="text-xs">{row.reason}</span> },
            {
              label: 'Decision',
              render: (row) =>
                row.decision ? (
                  <span className="text-xs">
                    {row.decision} by {row.decidedBy}
                    {row.decisionReason ? `: ${row.decisionReason}` : ''}
                  </span>
                ) : (
                  <div className="space-y-2">
                    <input
                      className="form-input h-9 text-xs"
                      placeholder="Note to the student"
                      aria-label="Decision note"
                      value={reasons[row.id] ?? ''}
                      onChange={(event) => setReasons({ ...reasons, [row.id]: event.target.value })}
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void run({
                            ops: decideWithdrawal(
                              row.id,
                              'Approved',
                              reasons[row.id]?.trim() ?? '',
                              actor.name,
                              data,
                            ),
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        tone="danger"
                        disabled={busy || !reasons[row.id]?.trim()}
                        onClick={() =>
                          void run({
                            ops: decideWithdrawal(
                              row.id,
                              'Rejected',
                              reasons[row.id].trim(),
                              actor.name,
                              data,
                            ),
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ),
            },
          ]}
        />
      </Card>
      <Card
        title="Withdraw a paper on a student’s behalf"
        description="After hall tickets are issued only the exam cell can withdraw a paper."
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Paper">
            <select
              className="form-input"
              value={staffItem}
              onChange={(event) => setStaffItem(event.target.value)}
            >
              <option value="">Choose…</option>
              {activeItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {name(item.studentId)} – {courseTitle(item.courseCode, data)} ({item.kind},{' '}
                  {sessionById(item.sessionId, data)?.name})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reason">
            <input
              className="form-input"
              value={staffReason}
              onChange={(event) => setStaffReason(event.target.value)}
            />
          </Field>
          <Button disabled={busy || !staffItem || !staffReason.trim()} onClick={staffWithdraw}>
            Withdraw
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ── documents, UFM, records ─────────────────────────────────────────────────

export function DocumentsDesk() {
  const { data } = useCampus()
  const name = useStudentName()
  const { busy, run } = useAction()
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const requests = [...data.documentRequests].sort((a, b) => a.requestedOn.localeCompare(b.requestedOn))
  const statuses: DocumentRequest['status'][] = [
    'Requested',
    'Processing',
    'Ready',
    'Dispatched',
    'Collected',
    'Rejected',
  ]
  return (
    <Card title="Official document requests">
      <DataTable
        rows={requests}
        rowKey={(row) => row.id}
        empty="No requests."
        columns={[
          { label: 'Student', render: (row) => name(row.studentId) },
          {
            label: 'Document',
            render: (row) => (
              <div>
                <p>
                  {row.kind} × {row.copies}
                </p>
                <p className="text-xs text-slate-500">
                  {row.delivery}
                  {row.address ? ` to ${row.address}` : ''} · {row.purpose}
                </p>
              </div>
            ),
          },
          {
            label: 'Fee',
            render: (row) => {
              const charge = data.charges.find((item) => item.ref === row.id)
              return charge ? (
                <StatusBadge>
                  {data.payments.some(
                    (payment) =>
                      payment.status === 'Success' &&
                      payment.allocations.some((a) => a.chargeId === charge.id),
                  )
                    ? 'Paid'
                    : 'Unpaid'}
                </StatusBadge>
              ) : (
                'Free'
              )
            },
          },
          {
            label: 'Status',
            render: (row) => (
              <div className="space-y-2">
                <select
                  aria-label="Status"
                  className="form-input h-9 text-xs"
                  value={row.status}
                  disabled={busy}
                  onChange={(event) =>
                    void run({
                      ops: [
                        patch('documentRequests', row.id, {
                          status: event.target.value as DocumentRequest['status'],
                          remarks: remarks[row.id] ?? row.remarks,
                        }),
                        notify(
                          row.studentId,
                          'results',
                          `${row.kind}: ${event.target.value}`,
                          remarks[row.id] ?? row.remarks,
                        ),
                      ],
                    })
                  }
                >
                  {statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
                <input
                  className="form-input h-9 text-xs"
                  aria-label="Remarks"
                  placeholder="Remarks (saved with the next status change)"
                  value={remarks[row.id] ?? row.remarks}
                  onChange={(event) => setRemarks({ ...remarks, [row.id]: event.target.value })}
                />
              </div>
            ),
          },
        ]}
      />
    </Card>
  )
}

function UfmDesk() {
  const { data } = useCampus()
  const name = useStudentName()
  const { busy, run } = useAction()
  return (
    <Card
      title="Unfair-means cases"
      description="Students see the status and hearing date, never the evidence."
    >
      <DataTable
        rows={data.ufmCases}
        rowKey={(row) => row.id}
        empty="No cases."
        columns={[
          { label: 'Student', render: (row) => name(row.studentId) },
          {
            label: 'Paper',
            render: (row) =>
              `${courseTitle(row.courseCode, data)} · ${sessionById(row.sessionId, data)?.name}`,
          },
          {
            label: 'Status',
            render: (row) => (
              <select
                aria-label="Status"
                className="form-input h-9 text-xs"
                value={row.status}
                disabled={busy}
                onChange={(event) =>
                  void run({
                    ops: [patch('ufmCases', row.id, { status: event.target.value as UfmCase['status'] })],
                  })
                }
              >
                <option>Reported</option>
                <option>Hearing scheduled</option>
                <option>Decided</option>
              </select>
            ),
          },
          {
            label: 'Hearing',
            render: (row) => (
              <input
                type="date"
                aria-label="Hearing date"
                className="form-input h-9 text-xs"
                value={row.hearingOn ?? ''}
                onChange={(event) =>
                  void run({ ops: [patch('ufmCases', row.id, { hearingOn: event.target.value || null })] })
                }
              />
            ),
          },
          {
            label: 'Outcome',
            render: (row) => (
              <input
                key={row.outcome ?? ''}
                className="form-input h-9 text-xs"
                aria-label="Outcome"
                defaultValue={row.outcome ?? ''}
                onBlur={(event) =>
                  event.target.value !== (row.outcome ?? '') &&
                  void run({
                    ops: [
                      patch('ufmCases', row.id, { outcome: event.target.value || null }),
                      notify(row.studentId, 'academic', 'Unfair-means case updated', event.target.value),
                    ],
                  })
                }
              />
            ),
          },
        ]}
      />
    </Card>
  )
}

// shortcut: stands in for corrections made in the ERP; with a real ERP these fields sync from it
function RecordsDesk() {
  const { data } = useCampus()
  const { error, busy, run } = useAction()
  const [studentId, setStudentId] = useState(data.students[0]?.id ?? '')
  const student = data.students.find((row) => row.id === studentId)
  const [form, setForm] = useState<Partial<Student>>({})
  const value = <K extends keyof Student>(key: K) => (form[key] ?? student?.[key]) as Student[K]
  if (!student) return null
  const save = () =>
    void run({ ops: [patch('students', student.id, { ...form, syncedAt: new Date().toISOString() })] }, () =>
      setForm({}),
    )
  return (
    <Card
      title="Student records (ERP corrections)"
      description="Changes here stand in for corrections made in the ERP and are logged."
    >
      <Field label="Student">
        <select
          className="form-input sm:max-w-sm"
          value={studentId}
          onChange={(event) => (setStudentId(event.target.value), setForm({}))}
        >
          {data.students.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name} ({row.enrolmentNo})
            </option>
          ))}
        </select>
      </Field>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Phone">
          <input
            className="form-input"
            value={value('phone')}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </Field>
        <Field label="APAAR / ABC ID">
          <input
            className="form-input"
            value={value('apaarId') ?? ''}
            onChange={(event) => setForm({ ...form, apaarId: event.target.value || null })}
          />
        </Field>
        <Field label="Active backlogs">
          <input
            className="form-input"
            inputMode="numeric"
            value={value('activeBacklogs') ?? ''}
            onChange={(event) =>
              setForm({
                ...form,
                activeBacklogs: event.target.value === '' ? null : Number(event.target.value),
              })
            }
          />
        </Field>
        <Field label="Debarred">
          <select
            className="form-input"
            value={String(value('debarred'))}
            onChange={(event) =>
              setForm({
                ...form,
                debarred: event.target.value === 'null' ? null : event.target.value === 'true',
              })
            }
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
            <option value="null">Unknown</option>
          </select>
        </Field>
        <Field label="Debarment reason">
          <input
            className="form-input"
            value={value('debarredReason') ?? ''}
            onChange={(event) => setForm({ ...form, debarredReason: event.target.value || null })}
          />
        </Field>
        <Field label="Status">
          <select
            className="form-input"
            value={value('status')}
            onChange={(event) => setForm({ ...form, status: event.target.value as Student['status'] })}
          >
            <option>Enrolled</option>
            <option>Graduated</option>
          </select>
        </Field>
      </div>
      {error && (
        <div className="mt-3">
          <Callout tone="error">{error}</Callout>
        </div>
      )}
      <Button className="mt-4" disabled={busy || !Object.keys(form).length} onClick={save}>
        Save correction
      </Button>
    </Card>
  )
}
