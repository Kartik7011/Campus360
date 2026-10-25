import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, XCircle } from 'lucide-react'
import { api } from '../api'
import { Logo } from '../components/Layout'
import type { AppData } from '../types'
import { formatDate } from '../utils'

type Result = {
  serial: string
  kind: string
  title: string
  issuedOn: string
  supersededOn: string | null
  holder: string
  enrolmentNo: string
  program: string
  figures: Record<string, unknown> | null
}

// Same answer as the database's verify_document(), for browser-only mode.
function verifyLocally(serial: string, data: AppData): Result | null {
  const doc = data.issuedDocuments.find((row) => row.serial === serial)
  const student = doc && data.students.find((row) => row.id === doc.studentId)
  if (!doc || !student) return null
  const semester = data.semesterResults.find(
    (row) => row.studentId === student.id && String(row.semester) === doc.ref,
  )
  const payment = data.payments.find((row) => row.id === doc.ref)
  return {
    serial: doc.serial,
    kind: doc.kind,
    title: doc.title,
    issuedOn: doc.issuedOn,
    supersededOn: doc.supersededOn ?? null,
    holder: student.name,
    enrolmentNo: student.enrolmentNo,
    program: `${student.program} ${student.branch}`,
    figures:
      doc.kind === 'Grade sheet' && semester
        ? { SGPA: semester.sgpa, CGPA: semester.cgpa, Result: semester.status }
        : doc.kind === 'Consolidated marks statement'
          ? { CGPA: student.cgpa }
          : doc.kind === 'Fee receipt' && payment
            ? { Receipt: payment.receiptNo, Amount: payment.amount, Status: payment.status }
            : null,
  }
}

export function Verify({ serial, data }: { serial: string; data: AppData | null }) {
  const [state, setState] = useState<{ loading: boolean; result: Result | null; error: string }>({
    loading: true,
    result: null,
    error: '',
  })
  useEffect(() => {
    if (data) return setState({ loading: false, result: verifyLocally(serial, data), error: '' })
    api
      .verify(serial)
      .then((result) => setState({ loading: false, result: result as Result | null, error: '' }))
      .catch((error: Error) => setState({ loading: false, result: null, error: error.message }))
  }, [serial, data])

  const { loading, result, error } = state
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <Logo />
        <h1 className="mt-6 font-display text-xl font-semibold text-slate-950">Document verification</h1>
        <p className="mt-1 break-all text-sm text-slate-500">Serial {serial}</p>
        {loading ? (
          <p className="mt-6 text-sm text-slate-500" role="status">
            Checking…
          </p>
        ) : error ? (
          <p className="mt-6 flex items-start gap-2 text-sm text-rose-700" role="alert">
            <CircleAlert size={18} className="shrink-0" /> Couldn’t check right now: {error}
          </p>
        ) : !result ? (
          <p className="mt-6 flex items-start gap-2 text-sm font-medium text-rose-700" role="alert">
            <XCircle size={18} className="shrink-0" /> No document with this serial was issued. Treat the
            document as not genuine.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            <p
              className={`flex items-start gap-2 text-sm font-semibold ${result.supersededOn ? 'text-amber-700' : 'text-emerald-700'}`}
              role="status"
            >
              {result.supersededOn ? (
                <CircleAlert size={18} className="shrink-0" />
              ) : (
                <CheckCircle2 size={18} className="shrink-0" />
              )}
              {result.supersededOn
                ? `Genuine, but superseded on ${formatDate(result.supersededOn)}: the result changed after this copy was issued. Ask for the current one.`
                : 'Genuine and current.'}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Document', result.title],
                ['Issued', formatDate(result.issuedOn)],
                ['Holder', result.holder],
                ['Enrolment no.', result.enrolmentNo],
                ['Programme', result.program],
                ...Object.entries(result.figures ?? {}).map(([label, value]) => [
                  label,
                  String(value ?? '—'),
                ]),
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs leading-5 text-slate-500">
              Figures above come from the university record now, not from the document. If they differ from
              the document you were given, it has been altered.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
