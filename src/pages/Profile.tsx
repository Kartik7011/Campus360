import { useState } from 'react'
import { Download, ShieldCheck } from 'lucide-react'
import { Logo } from '../components/Layout'
import { Button, Callout, Card, Field } from '../components/ui'
import { downloadText } from '../domain/campus'
import { patch, today, uid, upsert } from '../ops'
import { useAction, useStudent } from '../store'
import type { AppData, CollectionKey, Consent } from '../types'

// Personal-data notice shown at first sign-in (Digital Personal Data Protection Act, 2023).
const purposes: [string, string][] = [
  ['Academic record, results and attendance', 'to show you your standing and decide exam eligibility'],
  ['Fees and payments', 'to show dues, take payments and issue receipts and refunds'],
  ['Exam applications and requests', 'to process rechecking, back/special exams, withdrawals and documents'],
  [
    'Placement profile and resumes',
    'to check eligibility and, only with your choice each time, share data with a company',
  ],
  ['Sign-in and activity logs', 'to keep your account secure and record who changed what'],
]

export function PrivacyNotice() {
  return (
    <div className="space-y-3 text-sm leading-6 text-slate-600">
      <p>Campus360 uses your personal data only for these purposes:</p>
      <ul className="space-y-1">
        {purposes.map(([data, purpose]) => (
          <li key={data}>
            <span className="font-semibold text-slate-800">{data}</span> – {purpose}.
          </li>
        ))}
      </ul>
      <p>
        Data is stored in the university’s Campus360 database, kept for the periods in the university
        retention schedule, and never sold. You can download a copy of your data from Profile & privacy at any
        time. Questions or complaints go to the university’s grievance officer through Help & requests (topic:
        Other).
      </p>
    </div>
  )
}

export function PrivacyConsent({ onSignOut }: { onSignOut: () => void }) {
  const { data, student } = useStudent()
  const { error, busy, run } = useAction()
  const existing = data.consents.find((row) => row.studentId === student.id)
  const accept = () =>
    void run({
      ops: [
        existing
          ? patch('consents', existing.id, { privacyAcceptedOn: today(), updatedOn: today() })
          : upsert('consents', {
              id: uid('consent'),
              studentId: student.id,
              privacyAcceptedOn: today(),
              parentAccess: false,
              parentEmail: '',
              updatedOn: today(),
            }),
      ],
    })
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <Logo />
        <h1 className="mt-6 font-display text-xl font-semibold text-slate-950">
          Before you continue, {student.name.split(' ')[0]}
        </h1>
        <div className="mt-4">
          <PrivacyNotice />
        </div>
        {error && (
          <div className="mt-4">
            <Callout tone="error">{error}</Callout>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button onClick={accept} disabled={busy}>
            <ShieldCheck size={16} /> I understand and agree
          </Button>
          <Button tone="ghost" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Profile() {
  const { data, student, canAct } = useStudent()
  const { error, busy, run } = useAction()
  const consent = data.consents.find((row) => row.studentId === student.id)
  const [parentAccess, setParentAccess] = useState(consent?.parentAccess ?? false)
  const [parentEmail, setParentEmail] = useState(consent?.parentEmail ?? '')
  const [saved, setSaved] = useState(false)

  const save = () => {
    if (parentAccess && !/^\S+@\S+\.\S+$/.test(parentEmail.trim()))
      return void run({ ops: [], error: 'Enter your parent’s email address.' })
    const changes: Partial<Consent> = { parentAccess, parentEmail: parentEmail.trim(), updatedOn: today() }
    void run(
      {
        ops: [
          consent
            ? patch('consents', consent.id, changes)
            : upsert('consents', {
                id: uid('consent'),
                studentId: student.id,
                privacyAcceptedOn: today(),
                ...changes,
              } as Consent),
        ],
      },
      () => setSaved(true),
    )
  }

  // every record about this student that this session can see (NFR-PRV-05)
  const exportData = () => {
    const mine = Object.fromEntries(
      (Object.keys(data) as (keyof AppData)[])
        .filter((key) => Array.isArray(data[key]) && key !== 'audit')
        .map((key) => [
          key,
          (data[key as CollectionKey] as { studentId?: string; id: string }[]).filter(
            (row) => row.studentId === student.id || (key === 'students' && row.id === student.id),
          ),
        ])
        .filter(([, rows]) => (rows as unknown[]).length),
    )
    downloadText(
      `campus360-data-${student.enrolmentNo}.json`,
      JSON.stringify({ exportedOn: new Date().toISOString(), ...mine }, null, 2),
      'application/json',
    )
  }

  return (
    <div className="space-y-6">
      <Card
        title="Your details"
        description={`From ${student.source}; last synced ${new Date(student.syncedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}. To correct anything, raise a Data correction request.`}
      >
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Name', student.name],
            ['Enrolment no.', student.enrolmentNo],
            ['Email', student.email],
            ['Phone', student.phone],
            ['Programme', `${student.program} ${student.branch}`],
            ['School', student.school],
            ['Batch', String(student.batch)],
            [
              'APAAR / ABC ID',
              student.apaarId ??
                'Not linked – link it on the APAAR portal and raise a Data correction request',
            ],
            ['Status', student.status],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card
        title="Parent access"
        description="A parent or guardian can see your results, attendance, exams and fees (read only). You can turn it off at any time."
      >
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-indigo-600"
              checked={parentAccess}
              disabled={!canAct}
              onChange={(event) => (setParentAccess(event.target.checked), setSaved(false))}
            />
            Allow my parent or guardian to view my records
          </label>
          {parentAccess && (
            <Field label="Parent’s email" hint="They sign in on the Parent tab with this email.">
              <input
                className="form-input sm:max-w-sm"
                type="email"
                value={parentEmail}
                disabled={!canAct}
                onChange={(event) => (setParentEmail(event.target.value), setSaved(false))}
              />
            </Field>
          )}
          {error && <Callout tone="error">{error}</Callout>}
          {saved && !error && <Callout tone="ok">Saved.</Callout>}
          {canAct && (
            <Button onClick={save} disabled={busy}>
              Save
            </Button>
          )}
        </div>
      </Card>

      <Card title="Your data">
        <PrivacyNotice />
        <p className="mt-3 text-xs text-slate-500">
          Privacy notice accepted on {consent?.privacyAcceptedOn ?? '—'}.
        </p>
        <Button tone="secondary" className="mt-4" onClick={exportData}>
          <Download size={16} /> Download my data (JSON)
        </Button>
      </Card>
    </div>
  )
}
