import { useState } from 'react'
import { Button, Callout, Card, DataTable, Field, StatusBadge, Tabs } from '../../components/ui'
import { applyToOpening } from '../../domain/campus'
import { notify } from '../../domain/notify'
import { patch, today, uid, upsert } from '../../ops'
import { useAction, useCampus } from '../../store'
import type { Opportunity, PlacementStage } from '../../types'
import { evaluateEligibility, formatDate, getCompanyByOpportunity } from '../../utils'
import { ExportButton, HelpdeskQueue, NoticesManager, useStudentName } from './shared'

type Tab = 'openings' | 'stages' | 'override' | 'records' | 'helpdesk' | 'notices'
const stages: PlacementStage[] = ['Applied', 'Aptitude', 'Technical', 'HR', 'Selected', 'Rejected']

export function PlacementOffice() {
  const { data } = useCampus()
  const [tab, setTab] = useState<Tab>('openings')
  return (
    <div className="space-y-6">
      <Tabs
        label="Placement cell"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'openings', label: 'Openings' },
          { key: 'stages', label: 'Applications' },
          { key: 'override', label: 'Override' },
          {
            key: 'records',
            label: 'Internships & offers',
            badge: data.careerRecords.filter((row) => !row.verified).length,
          },
          { key: 'helpdesk', label: 'Helpdesk' },
          { key: 'notices', label: 'Notices' },
        ]}
      />
      {tab === 'openings' && <Openings />}
      {tab === 'stages' && <Stages />}
      {tab === 'override' && <Override />}
      {tab === 'records' && <CareerVerification />}
      {tab === 'helpdesk' && <HelpdeskQueue office="placement" />}
      {tab === 'notices' && <NoticesManager />}
    </div>
  )
}

const emptyOpening = {
  companyId: '',
  title: '',
  location: '',
  deadline: '',
  minCgpa: '7.5',
  maxBacklogs: '0',
  branches: 'Computer Science & Engineering',
  years: '',
  requiredSkills: '',
  preferredSkills: '',
  description: '',
  package: '',
  dream: false,
}

function Openings() {
  const { data } = useCampus()
  const { error, busy, run } = useAction()
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyOpening, companyId: data.companies[0]?.id ?? '' })
  const list = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  const edit = (opportunity: Opportunity) => {
    setEditing(opportunity.id)
    setForm({
      companyId: opportunity.companyId,
      title: opportunity.title,
      location: opportunity.location,
      deadline: opportunity.deadline,
      minCgpa: String(opportunity.minCgpa ?? ''),
      maxBacklogs: String(opportunity.maxActiveBacklogs ?? ''),
      branches: opportunity.allowedBranches.join(', '),
      years: (opportunity.graduationYears ?? []).join(', '),
      requiredSkills: opportunity.requiredSkills.join(', '),
      preferredSkills: opportunity.preferredSkills.join(', '),
      description: opportunity.jobDescription,
      package: opportunity.package,
      dream: !!opportunity.dream,
    })
  }

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.description.trim() || !form.deadline)
      return void run({ ops: [], error: 'Title, deadline and description are needed.' })
    const fields = {
      companyId: form.companyId,
      title: form.title.trim(),
      location: form.location.trim() || 'Campus',
      deadline: form.deadline,
      minCgpa: form.minCgpa === '' ? null : Number(form.minCgpa),
      maxActiveBacklogs: form.maxBacklogs === '' ? null : Number(form.maxBacklogs),
      allowedBranches: list(form.branches),
      graduationYears: list(form.years).map(Number),
      requiredSkills: list(form.requiredSkills),
      preferredSkills: list(form.preferredSkills),
      jobDescription: form.description.trim(),
      package: form.package.trim() || 'To be announced',
      dream: form.dream,
    }
    const current = data.opportunities.find((row) => row.id === editing)
    if (current) {
      // a change to any eligibility rule is a new criteria version; earlier applicants keep theirs (FR-PLC-05)
      const criteriaChanged =
        JSON.stringify([
          current.minCgpa,
          current.maxActiveBacklogs,
          current.allowedBranches,
          current.graduationYears ?? [],
        ]) !==
        JSON.stringify([
          fields.minCgpa,
          fields.maxActiveBacklogs,
          fields.allowedBranches,
          fields.graduationYears,
        ])
      return void run(
        {
          ops: [
            patch('opportunities', current.id, {
              ...fields,
              criteriaVersion: (current.criteriaVersion ?? 1) + (criteriaChanged ? 1 : 0),
            }),
          ],
        },
        () => (setEditing(null), setForm({ ...emptyOpening, companyId: data.companies[0]?.id ?? '' })),
      )
    }
    void run(
      {
        ops: [
          upsert('opportunities', {
            id: uid('opp'),
            ...fields,
            workMode: 'On-site',
            posted: today(),
            jobType: 'Full-time',
            status: 'Open',
            criteriaVersion: 1,
          }),
        ],
      },
      () => setForm({ ...emptyOpening, companyId: data.companies[0]?.id ?? '' }),
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] [&>*]:min-w-0">
      <Card
        title={editing ? 'Edit opening' : 'Add an opening'}
        description="Missing criteria are shown to students as “Cannot determine”, never as a pass."
      >
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Field label="Company">
            <select
              className="form-input"
              value={form.companyId}
              onChange={(event) => setForm({ ...form, companyId: event.target.value })}
            >
              {data.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Role">
            <input
              className="form-input"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </Field>
          <Field label="Location">
            <input
              className="form-input"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
            />
          </Field>
          <Field label="Deadline">
            <input
              type="date"
              className="form-input"
              value={form.deadline}
              onChange={(event) => setForm({ ...form, deadline: event.target.value })}
            />
          </Field>
          <Field label="Minimum CGPA">
            <input
              className="form-input"
              inputMode="decimal"
              value={form.minCgpa}
              onChange={(event) => setForm({ ...form, minCgpa: event.target.value })}
            />
          </Field>
          <Field label="Max active backlogs">
            <input
              className="form-input"
              inputMode="numeric"
              value={form.maxBacklogs}
              onChange={(event) => setForm({ ...form, maxBacklogs: event.target.value })}
            />
          </Field>
          <Field label="Allowed branches (comma-separated)" wide>
            <input
              className="form-input"
              value={form.branches}
              onChange={(event) => setForm({ ...form, branches: event.target.value })}
            />
          </Field>
          <Field label="Graduation years (comma-separated, optional)">
            <input
              className="form-input"
              value={form.years}
              onChange={(event) => setForm({ ...form, years: event.target.value })}
            />
          </Field>
          <Field label="Package">
            <input
              className="form-input"
              value={form.package}
              onChange={(event) => setForm({ ...form, package: event.target.value })}
            />
          </Field>
          <Field label="Required skills" wide>
            <input
              className="form-input"
              value={form.requiredSkills}
              onChange={(event) => setForm({ ...form, requiredSkills: event.target.value })}
            />
          </Field>
          <Field label="Preferred skills" wide>
            <input
              className="form-input"
              value={form.preferredSkills}
              onChange={(event) => setForm({ ...form, preferredSkills: event.target.value })}
            />
          </Field>
          <Field label="Job description" wide>
            <textarea
              className="form-input h-28 py-2"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-indigo-600"
              checked={form.dream}
              onChange={(event) => setForm({ ...form, dream: event.target.checked })}
            />
            Dream opening (open to students who already hold an offer)
          </label>
          {error && (
            <div className="sm:col-span-2">
              <Callout tone="error">{error}</Callout>
            </div>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {editing ? 'Save changes' : 'Add opening'}
            </Button>
            {editing && (
              <Button
                tone="ghost"
                onClick={() => (
                  setEditing(null), setForm({ ...emptyOpening, companyId: data.companies[0]?.id ?? '' })
                )}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>
      <Card title="Openings">
        <DataTable
          rows={data.opportunities}
          rowKey={(row) => row.id}
          empty="No openings."
          columns={[
            {
              label: 'Opening',
              render: (row) => (
                <div>
                  <p className="font-semibold">{row.title}</p>
                  <p className="text-xs text-slate-500">
                    {getCompanyByOpportunity(row, data.companies)?.name} · deadline {formatDate(row.deadline)}
                    {row.dream ? ' · dream' : ''}
                  </p>
                </div>
              ),
            },
            {
              label: 'Criteria',
              render: (row) => (
                <span className="text-xs">
                  v{row.criteriaVersion ?? 1}: CGPA ≥ {row.minCgpa ?? '—'}, backlogs ≤{' '}
                  {row.maxActiveBacklogs ?? '—'}
                </span>
              ),
            },
            {
              label: 'Applicants',
              render: (row) => data.applications.filter((item) => item.opportunityId === row.id).length,
            },
            {
              label: '',
              render: (row) => (
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" tone="secondary" onClick={() => edit(row)}>
                    Edit
                  </Button>
                  <SharedExport opportunity={row} />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}

// Only what each student agreed to share with this company (FR-PLC-07).
function SharedExport({ opportunity }: { opportunity: Opportunity }) {
  const { data } = useCampus()
  const rows = data.applications
    .filter((row) => row.opportunityId === opportunity.id && row.stage !== 'Rejected')
    .map((row) => {
      const student = data.students.find((item) => item.id === row.studentId)!
      const shared = row.shared ?? []
      return {
        name: student.name,
        branch: student.branch,
        stage: row.stage,
        ...(shared.includes('CGPA') ? { cgpa: student.cgpa } : {}),
        ...(shared.includes('Backlogs') ? { active_backlogs: student.activeBacklogs } : {}),
        ...(shared.includes('Email') ? { email: student.email } : {}),
        ...(shared.includes('Phone') ? { phone: student.phone } : {}),
        ...(shared.includes('Resume')
          ? { resume: data.resumes.find((item) => item.studentId === student.id)?.name ?? '' }
          : {}),
      }
    })
  return <ExportButton rows={rows} filename={`${opportunity.id}-applicants.csv`} label="Export for company" />
}

function Stages() {
  const { data } = useCampus()
  const name = useStudentName()
  const { busy, run } = useAction()
  return (
    <Card title="Applications" description="Students are notified when you move them to another stage.">
      <DataTable
        rows={data.applications}
        rowKey={(row) => row.id}
        empty="No applications."
        columns={[
          { label: 'Student', render: (row) => name(row.studentId) },
          {
            label: 'Opening',
            render: (row) => {
              const opportunity = data.opportunities.find((item) => item.id === row.opportunityId)
              return (
                <div>
                  <p>{opportunity?.title}</p>
                  <p className="text-xs text-slate-500">
                    {opportunity && getCompanyByOpportunity(opportunity, data.companies)?.name} · applied{' '}
                    {formatDate(row.appliedOn)}
                    {row.overrideReason ? ` · override: ${row.overrideReason}` : ''}
                  </p>
                </div>
              )
            },
          },
          {
            label: 'Stage',
            render: (row) => (
              <select
                aria-label="Stage"
                className="form-input h-9 text-xs"
                value={row.stage}
                disabled={busy}
                onChange={(event) => {
                  const stage = event.target.value as PlacementStage
                  const title = data.opportunities.find((item) => item.id === row.opportunityId)?.title
                  void run({
                    ops: [
                      patch('applications', row.id, { stage }),
                      notify(
                        row.studentId,
                        'placements',
                        `${title}: ${stage}`,
                        'Your application moved to a new stage.',
                      ),
                    ],
                  })
                }}
              >
                {stages.map((stage) => (
                  <option key={stage}>{stage}</option>
                ))}
              </select>
            ),
          },
        ]}
      />
    </Card>
  )
}

function Override() {
  const { data } = useCampus()
  const { error, busy, run } = useAction()
  const [studentId, setStudentId] = useState(data.students[0]?.id ?? '')
  const [opportunityId, setOpportunityId] = useState(data.opportunities[0]?.id ?? '')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  const student = data.students.find((row) => row.id === studentId)
  const opportunity = data.opportunities.find((row) => row.id === opportunityId)
  const eligibility = student && opportunity ? evaluateEligibility(student, opportunity) : null
  return (
    <Card
      title="Add an application the rules would block"
      description="Only with a recorded reason; it shows on the application and in the change log."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Student">
          <select
            className="form-input"
            value={studentId}
            onChange={(event) => (setStudentId(event.target.value), setDone(false))}
          >
            {data.students.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Opening">
          <select
            className="form-input"
            value={opportunityId}
            onChange={(event) => (setOpportunityId(event.target.value), setDone(false))}
          >
            {data.opportunities.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title}
              </option>
            ))}
          </select>
        </Field>
        {eligibility && (
          <p className="text-sm sm:col-span-2">
            Rules say: <StatusBadge>{eligibility.status}</StatusBadge>{' '}
            <span className="text-xs text-slate-500">
              {eligibility.rules
                .filter((rule) => rule.status !== 'Pass')
                .map((rule) => `${rule.label}: ${rule.status}`)
                .join(', ')}
            </span>
          </p>
        )}
        <Field label="Reason" wide>
          <input className="form-input" value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        {error && (
          <div className="sm:col-span-2">
            <Callout tone="error">{error}</Callout>
          </div>
        )}
        {done && (
          <div className="sm:col-span-2">
            <Callout tone="ok">Application added.</Callout>
          </div>
        )}
        <Button
          disabled={busy || !reason.trim() || !student || !opportunity}
          onClick={() =>
            void run(
              {
                ...applyToOpening(
                  {
                    student: student!,
                    opportunity: opportunity!,
                    shared: ['Resume', 'CGPA', 'Email'],
                    overrideReason: reason.trim(),
                  },
                  data,
                ),
              },
              () => (setReason(''), setDone(true)),
            )
          }
        >
          Add application
        </Button>
      </div>
    </Card>
  )
}

function CareerVerification() {
  const { data, openFile } = useCampus()
  const name = useStudentName()
  const { busy, run } = useAction()
  return (
    <Card title="Internships & offer letters">
      <DataTable
        rows={[...data.careerRecords].sort((a, b) => Number(a.verified) - Number(b.verified))}
        rowKey={(row) => row.id}
        empty="Nothing uploaded."
        columns={[
          { label: 'Student', render: (row) => name(row.studentId) },
          { label: 'Record', render: (row) => `${row.kind}: ${row.role}, ${row.company}` },
          {
            label: 'File',
            render: (row) =>
              row.file.path ? (
                <button className="text-xs font-bold text-brand-700" onClick={() => openFile(row.file)}>
                  {row.file.name}
                </button>
              ) : (
                <span className="text-xs">{row.file.name}</span>
              ),
          },
          {
            label: '',
            render: (row) =>
              row.verified ? (
                <StatusBadge tone="green">Verified</StatusBadge>
              ) : (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run({
                      ops: [
                        patch('careerRecords', row.id, { verified: true }),
                        notify(
                          row.studentId,
                          'placements',
                          `${row.kind} verified`,
                          `${row.role}, ${row.company}`,
                        ),
                      ],
                    })
                  }
                >
                  Verify
                </Button>
              ),
          },
        ]}
      />
    </Card>
  )
}
