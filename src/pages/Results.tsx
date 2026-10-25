import { useState } from 'react'
import { Download, FileText, History } from 'lucide-react'
import { Button, Callout, Card, DataTable, Field, StatusBadge } from '../components/ui'
import { courseTitle, sessionById } from '../domain/exams'
import { attemptsFor, sgpaTrend } from '../domain/results'
import { rupees, today, uid, upsert } from '../ops'
import { downloadPdf, inr, issueDocument, type PdfTable } from '../pdf'
import { policy } from '../policy'
import { useAction, useStudent } from '../store'
import type { CourseResult, DocumentRequest, OfficialDocumentKind, SemesterResult } from '../types'
import { formatDate } from '../utils'

export function Results() {
  const { data, student } = useStudent()
  const semesters = data.semesterResults
    .filter((row) => row.studentId === student.id)
    .sort((a, b) => b.semester - a.semester)
  const provisional = data.courseResults.filter(
    (row) => row.studentId === student.id && row.status === 'Provisional',
  )
  const [selected, setSelected] = useState(
    semesters.find((row) => row.declaredOn)?.semester ?? student.semester,
  )
  const semester = semesters.find((row) => row.semester === selected)
  const transfers = data.creditTransfers.filter((row) => row.studentId === student.id)

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-6 text-slate-600">
        Marks, grades and SGPA/CGPA as declared by the Controller of Examinations. Values come from the
        university record; Campus360 shows them but does not calculate official grades.
      </p>

      <Trend />

      {provisional.length > 0 && (
        <Card
          title={`Semester ${student.semester} – internal marks`}
          description="Provisional until the end-term result is declared."
        >
          <MarksTable rows={provisional} />
        </Card>
      )}

      <Card
        title="Semester results"
        action={
          <select
            aria-label="Semester"
            value={selected}
            onChange={(event) => setSelected(Number(event.target.value))}
            className="form-input w-full sm:w-48"
          >
            {semesters.map((row) => (
              <option key={row.id} value={row.semester}>
                Semester {row.semester}
              </option>
            ))}
          </select>
        }
      >
        {semester ? (
          <SemesterView semester={semester} />
        ) : (
          <p className="text-sm text-slate-500">No result yet.</p>
        )}
      </Card>

      {transfers.length > 0 && (
        <Card
          title="Credits transferred"
          description="Courses from other programmes counted towards your degree."
        >
          <DataTable
            rows={transfers}
            rowKey={(row) => row.id}
            empty=""
            columns={[
              { label: 'Course', render: (row) => row.course },
              { label: 'Source', render: (row) => row.source },
              { label: 'Credits', render: (row) => row.credits },
              { label: 'Approved', render: (row) => formatDate(row.approvedOn) },
            ]}
          />
        </Card>
      )}

      <Documents />
    </div>
  )
}

function Trend() {
  const { data, student } = useStudent()
  const trend = sgpaTrend(student.id, data.semesterResults)
  if (trend.length < 2) return null
  return (
    <Card title="SGPA by semester">
      <div
        className="flex h-36 items-end gap-2 sm:gap-4"
        role="img"
        aria-label={trend.map((row) => `Semester ${row.semester}: ${row.sgpa}`).join(', ')}
      >
        {trend.map((row) => (
          <div key={row.semester} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-xs font-semibold text-slate-700">{row.sgpa.toFixed(2)}</span>
            <div
              className="w-full max-w-[48px] rounded-t-md bg-brand-500"
              style={{ height: `${(row.sgpa / 10) * 100}px` }}
            />
            <span className="text-[11px] text-slate-500">S{row.semester}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SemesterView({ semester }: { semester: SemesterResult }) {
  const { data, student, canAct, commit } = useStudent()
  const rows = data.courseResults.filter(
    (row) => row.studentId === student.id && row.semester === semester.semester && row.status === 'Declared',
  )
  const session = sessionById(semester.sessionId, data)
  const [busy, setBusy] = useState(false)

  if (semester.status === 'Withheld')
    return (
      <Callout tone="warn">
        <span className="font-semibold">Result withheld.</span>{' '}
        {semester.withheldReason ?? 'Contact the exam cell.'}
      </Callout>
    )

  const download = async () => {
    setBusy(true)
    const { doc, op } = issueDocument(
      student,
      'Grade sheet',
      `Grade sheet – Semester ${semester.semester}`,
      String(semester.semester),
    )
    if (await commit([op]))
      await downloadPdf(
        {
          title: doc.title,
          serial: doc.serial,
          student,
          provisional: true,
          facts: [
            ['Semester', String(semester.semester)],
            ['Session', session?.name ?? semester.sessionId],
            ['SGPA', semester.sgpa?.toFixed(2) ?? '—'],
            ['CGPA', semester.cgpa?.toFixed(2) ?? '—'],
            ['Result', semester.status],
            ['Declared', semester.declaredOn ? formatDate(semester.declaredOn) : '—'],
          ],
          tables: [gradeTable(rows, data)],
        },
        `grade-sheet-sem-${semester.semester}.pdf`,
      )
    setBusy(false)
  }

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['SGPA', semester.sgpa?.toFixed(2) ?? '—'],
          ['CGPA', semester.cgpa?.toFixed(2) ?? '—'],
          ['Credits', `${semester.creditsEarned} / ${semester.creditsRegistered}`],
          ['Result', semester.status],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-1 font-display text-lg font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      {rows.length ? (
        <MarksTable rows={rows} />
      ) : (
        <p className="text-sm text-slate-500">
          Course-wise marks for this semester are kept in the ERP and are not in the sample data.
        </p>
      )}
      {semester.declaredOn && rows.length > 0 && canAct && (
        <Button onClick={download} disabled={busy}>
          <Download size={16} /> {busy ? 'Preparing…' : 'Download grade sheet (PDF)'}
        </Button>
      )}
    </div>
  )
}

const gradeTable = (rows: CourseResult[], data: ReturnType<typeof useStudent>['data']): PdfTable => ({
  head: ['Code', 'Course', 'Credits', 'Attempt', 'Marks', 'Grade'],
  widths: [22, 70, 18, 28, 20, 20],
  rows: rows.map((row) => [
    row.courseCode,
    courseTitle(row.courseCode, data),
    String(data.courses.find((course) => course.code === row.courseCode)?.credits ?? ''),
    `${row.attempt} (${sessionById(row.sessionId, data)?.name.replace(/^.*– /, '') ?? ''})`,
    String(row.total ?? '—'),
    row.grade ?? '—',
  ]),
})

function MarksTable({ rows }: { rows: CourseResult[] }) {
  const { data, student } = useStudent()
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.id}
      empty="No marks yet."
      columns={[
        {
          label: 'Course',
          render: (row) => {
            const attempts = attemptsFor(student.id, row.courseCode, data).filter(
              (item) => item.status === 'Declared',
            )
            return (
              <div>
                <p className="font-semibold text-slate-900">{courseTitle(row.courseCode, data)}</p>
                <p className="text-xs text-slate-500">
                  {row.courseCode} ·{' '}
                  {data.courses.find((course) => course.code === row.courseCode)?.credits ?? '—'} credits ·{' '}
                  {row.attempt} attempt
                </p>
                {attempts.length > 1 && (
                  <p className="mt-1 text-xs text-slate-500">
                    All attempts:{' '}
                    {attempts
                      .map(
                        (item) =>
                          `${item.attempt} ${sessionById(item.sessionId, data)?.name ?? ''} – ${item.grade}`,
                      )
                      .join('; ')}
                  </p>
                )}
              </div>
            )
          },
        },
        {
          label: 'Components',
          render: (row) => (
            <ul className="space-y-0.5 text-xs">
              {row.components.map((component) => (
                <li key={component.name}>
                  {component.name}:{' '}
                  <span className="font-semibold">
                    {component.obtained ?? (row.status === 'Declared' ? 'Absent' : '—')}
                  </span>{' '}
                  / {component.max}
                </li>
              ))}
            </ul>
          ),
        },
        { label: 'Total', render: (row) => <span className="font-semibold">{row.total ?? '—'}</span> },
        {
          label: 'Grade',
          render: (row) =>
            row.grade ? (
              <StatusBadge
                tone={row.passed ? 'green' : 'red'}
              >{`${row.grade} (${row.gradePoints})`}</StatusBadge>
            ) : (
              <StatusBadge tone="slate">Provisional</StatusBadge>
            ),
        },
        {
          label: 'Changes',
          render: (row) => {
            const changes = data.markChanges.filter((change) => change.resultId === row.id)
            return changes.length ? (
              <ul className="space-y-1 text-xs">
                {changes.map((change) => (
                  <li key={change.id} className="flex items-start gap-1">
                    <History size={13} className="mt-0.5 shrink-0 text-slate-400" />
                    <span>
                      {change.reason}: {change.fromTotal} ({change.fromGrade}) → {change.toTotal} (
                      {change.toGrade}), {formatDate(change.changedOn)}. {change.note}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-xs text-slate-400">None</span>
            )
          },
        },
      ]}
    />
  )
}

const kinds: OfficialDocumentKind[] = [
  'Transcript',
  'Signed grade sheet',
  'Degree certificate',
  'Migration certificate',
  'Bonafide certificate',
  'Character certificate',
]

function Documents() {
  const { data, student, canAct, commit } = useStudent()
  const { error, busy, run } = useAction()
  const [form, setForm] = useState({
    kind: 'Transcript' as OfficialDocumentKind,
    copies: 1,
    delivery: 'Collect' as DocumentRequest['delivery'],
    address: '',
    purpose: '',
  })
  const [downloading, setDownloading] = useState(false)
  const requests = data.documentRequests.filter((row) => row.studentId === student.id)
  const issued = data.issuedDocuments
    .filter((row) => row.studentId === student.id)
    .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn))
  const noDuesPending = data.noDues.some((row) => row.studentId === student.id && row.status === 'Pending')
  const declared = data.courseResults.filter(
    (row) => row.studentId === student.id && row.status === 'Declared',
  )
  const fee = policy.documentFees[form.kind] * form.copies

  const consolidated = async () => {
    setDownloading(true)
    const { doc, op } = issueDocument(
      student,
      'Consolidated marks statement',
      'Consolidated marks statement',
      'all',
    )
    const semesters = data.semesterResults
      .filter((row) => row.studentId === student.id && row.declaredOn)
      .sort((a, b) => a.semester - b.semester)
    if (await commit([op]))
      await downloadPdf(
        {
          title: doc.title,
          serial: doc.serial,
          student,
          provisional: true,
          facts: [
            ['CGPA', student.cgpa?.toFixed(2) ?? '—'],
            ['Credits', `${student.creditsCompleted} / ${student.totalCredits}`],
          ],
          tables: [
            {
              title: 'Semester summary',
              head: ['Semester', 'SGPA', 'CGPA', 'Credits', 'Result'],
              widths: [30, 30, 30, 40, 48],
              rows: semesters.map((row) => [
                String(row.semester),
                row.sgpa?.toFixed(2) ?? '—',
                row.cgpa?.toFixed(2) ?? '—',
                `${row.creditsEarned}/${row.creditsRegistered}`,
                row.status,
              ]),
            },
            { ...gradeTable(declared, data), title: 'Course results on record' },
          ],
        },
        'consolidated-marks.pdf',
      )
    setDownloading(false)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (form.delivery === 'Post' && !form.address.trim())
      return void run({ ops: [], error: 'Add the postal address.' })
    if (form.kind === 'Degree certificate' && noDuesPending)
      return void run({
        ops: [],
        error:
          'The degree certificate needs no-dues clearance from every office first (see Help & requests).',
      })
    const request: DocumentRequest = {
      id: uid('docreq'),
      studentId: student.id,
      ...form,
      requestedOn: today(),
      status: 'Requested',
      remarks: fee ? 'Pay the fee on the Fees page.' : '',
    }
    void run(
      {
        ops: [
          upsert('documentRequests', request),
          ...(fee
            ? [
                upsert('charges', {
                  id: uid('charge'),
                  studentId: student.id,
                  semester: student.semester,
                  head: 'Document',
                  description: `${form.kind} × ${form.copies}`,
                  amount: fee,
                  concession: 0,
                  dueDate: today(),
                  createdOn: today(),
                  ref: request.id,
                }),
              ]
            : []),
        ],
      },
      () => setForm({ ...form, address: '', purpose: '' }),
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card
        title="Official documents"
        description="Request signed documents from the exam cell or Registrar and track them here."
      >
        {canAct && (
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <Field label="Document">
              <select
                className="form-input"
                value={form.kind}
                onChange={(event) => setForm({ ...form, kind: event.target.value as OfficialDocumentKind })}
              >
                {kinds.map((kind) => (
                  <option key={kind}>{kind}</option>
                ))}
              </select>
            </Field>
            <Field label="Copies">
              <input
                type="number"
                min={1}
                max={10}
                className="form-input"
                value={form.copies}
                onChange={(event) =>
                  setForm({ ...form, copies: Math.max(1, Math.min(10, Number(event.target.value))) })
                }
              />
            </Field>
            <Field label="Delivery">
              <select
                className="form-input"
                value={form.delivery}
                onChange={(event) =>
                  setForm({ ...form, delivery: event.target.value as DocumentRequest['delivery'] })
                }
              >
                <option>Collect</option>
                <option>Post</option>
                <option>Email</option>
              </select>
            </Field>
            <Field label="Purpose">
              <input
                className="form-input"
                value={form.purpose}
                onChange={(event) => setForm({ ...form, purpose: event.target.value })}
                placeholder="e.g. Higher studies"
              />
            </Field>
            {form.delivery === 'Post' && (
              <Field label="Postal address" wide>
                <textarea
                  className="form-input h-20 py-2"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                />
              </Field>
            )}
            <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">Fee: {fee ? rupees(fee) : 'free'}</p>
              <Button type="submit" disabled={busy}>
                Request document
              </Button>
            </div>
            {error && (
              <div className="sm:col-span-2">
                <Callout tone="error">{error}</Callout>
              </div>
            )}
          </form>
        )}
        <div className="mt-5">
          <DataTable
            rows={requests}
            rowKey={(row) => row.id}
            empty="No document requests."
            columns={[
              { label: 'Document', render: (row) => `${row.kind} × ${row.copies}` },
              { label: 'Requested', render: (row) => formatDate(row.requestedOn) },
              {
                label: 'Status',
                render: (row) => (
                  <StatusBadge
                    tone={
                      row.status === 'Rejected'
                        ? 'red'
                        : ['Ready', 'Dispatched', 'Collected'].includes(row.status)
                          ? 'green'
                          : 'amber'
                    }
                  >
                    {row.status}
                  </StatusBadge>
                ),
              },
              { label: 'Remarks', render: (row) => <span className="text-xs">{row.remarks || '—'}</span> },
            ]}
          />
        </div>
      </Card>

      <Card
        title="Downloads"
        description="Provisional copies with a QR code anyone can scan to check them against the university record."
      >
        {canAct && (
          <Button tone="secondary" onClick={consolidated} disabled={downloading || !declared.length}>
            <FileText size={16} /> {downloading ? 'Preparing…' : 'Consolidated marks statement (PDF)'}
          </Button>
        )}
        <ul className="mt-4 divide-y divide-slate-100">
          {issued.length === 0 && <li className="py-3 text-sm text-slate-500">Nothing downloaded yet.</li>}
          {issued.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">{doc.title}</p>
                <p className="text-xs text-slate-500">
                  {doc.serial} · {formatDate(doc.issuedOn)}
                </p>
              </div>
              <StatusBadge tone={doc.supersededOn ? 'amber' : 'green'}>
                {doc.supersededOn ? `Superseded ${formatDate(doc.supersededOn)}` : 'Valid'}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
