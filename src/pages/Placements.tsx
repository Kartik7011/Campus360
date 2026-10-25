import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  FileCheck2,
  MapPin,
  ShieldCheck,
  Info,
} from 'lucide-react'
import type { CareerRecord, Company, Opportunity, PlacementStage, SharedField, Student } from '../types'
import { deadlineLabel, evaluateEligibility, formatDate, getCompanyByOpportunity } from '../utils'
import {
  Button,
  Callout,
  Card,
  DataTable,
  Field,
  FilePicker,
  RuleIcon,
  SectionHeading,
  StatusBadge,
} from '../components/ui'
import { applyToOpening, criteriaOf, offerPolicyBlock } from '../domain/campus'
import { today, uid, upsert } from '../ops'
import { useAction, useStudent } from '../store'
import { useFlipList } from '../useFlipList'

type PlacementFilter = 'All' | 'Eligible' | 'Needs review' | 'Not eligible'

const stageOrder: PlacementStage[] = ['Applied', 'Aptitude', 'Technical', 'HR', 'Selected']

const shareable: SharedField[] = ['Resume', 'CGPA', 'Backlogs', 'Email', 'Phone']

export function Placements({ onSelectOpportunity }: { onSelectOpportunity: (id: string) => void }) {
  const { data, student, navigate: onNavigate } = useStudent()
  const { companies, opportunities, applications } = data
  const [filter, setFilter] = useState<PlacementFilter>('All')
  const listRef = useFlipList<HTMLElement>(filter)
  const [expandedId, setExpandedId] = useState<string | null>(opportunities[0]?.id ?? null)
  const studentApplications = applications.filter((application) => application.studentId === student.id)
  const visibleOpportunities = useMemo(
    () =>
      opportunities.filter((opportunity) => {
        const status = evaluateEligibility(student, opportunity).status
        return (
          filter === 'All' || (filter === 'Needs review' ? status === 'Cannot Determine' : status === filter)
        )
      }),
    [filter, opportunities, student],
  )
  const eligibleCount = opportunities.filter(
    (opportunity) => evaluateEligibility(student, opportunity).status === 'Eligible',
  ).length
  const reviewCount = opportunities.filter(
    (opportunity) => evaluateEligibility(student, opportunity).status === 'Cannot Determine',
  ).length

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Every eligibility result below is rule-based, transparent, and separate from any official hiring
            decision.
          </p>
        </div>
        <button
          onClick={() => onNavigate('resume')}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-ink px-4 py-3 text-xs font-bold text-white shadow-card transition hover:bg-slate-800 sm:self-auto"
        >
          <FileCheck2 size={16} /> Check resume match
        </button>
      </div>

      <section className="grid [&>*]:min-w-0 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-emerald-700">Eligible now</p>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-emerald-950">{eligibleCount}</p>
          <p className="mt-1 text-xs text-emerald-800/70">All visible rules pass</p>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-violet-700">Needs review</p>
            <ShieldCheck size={18} className="text-violet-500" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-violet-950">{reviewCount}</p>
          <p className="mt-1 text-xs text-violet-800/70">Some data cannot be confirmed</p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-indigo-700">Open opportunities</p>
            <BriefcaseBusiness size={18} className="text-indigo-500" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-indigo-950">
            {opportunities.filter((item) => item.status !== 'Closed').length}
          </p>
          <p className="mt-1 text-xs text-indigo-800/70">Check the deadline before applying</p>
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <Info size={17} />
          </div>
          <div>
            <p className="text-sm font-bold text-indigo-950">How to read this checker</p>
            <p className="mt-1 text-xs leading-5 text-indigo-900/75">
              Green means your current record satisfies the published rule. Purple means Campus360 cannot
              determine the result because data is missing. Red means at least one published rule is not
              satisfied. The placement cell remains the official authority.
            </p>
          </div>
        </div>
      </section>

      <section ref={listRef} className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <SectionHeading title="Open positions" />
          <div className="scrollbar-thin flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            {(['All', 'Eligible', 'Needs review', 'Not eligible'] as PlacementFilter[]).map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${filter === item ? 'bg-ink text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        {visibleOpportunities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No opportunities match this eligibility filter.
          </div>
        ) : (
          visibleOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              company={getCompanyByOpportunity(opportunity, companies)!}
              student={student}
              expanded={expandedId === opportunity.id}
              onToggle={() =>
                setExpandedId((current) => (current === opportunity.id ? null : opportunity.id))
              }
              onResume={() => {
                onSelectOpportunity(opportunity.id)
                onNavigate('resume')
              }}
            />
          ))
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
        <SectionHeading
          title="Application progress"
          description="A simple view of where each active application currently sits."
        />
        <div className="mt-6 space-y-5">
          {studentApplications.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No applications to track yet.</p>
          ) : (
            studentApplications.map((application) => {
              const opportunity = opportunities.find((item) => item.id === application.opportunityId)
              const company = opportunity ? getCompanyByOpportunity(opportunity, companies) : undefined
              const changed =
                application.criteria &&
                JSON.stringify(application.criteria) !== JSON.stringify(criteriaOf(opportunity!))
              return opportunity && company ? (
                <div key={application.id} className="rounded-2xl border border-slate-100 p-4 sm:p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white"
                        style={{ backgroundColor: company.accent }}
                      >
                        {company.initials}
                      </div>
                      <div>
                        <p className="font-display font-bold text-slate-900">{opportunity.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {company.name} · Applied {formatDate(application.appliedOn)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      tone={
                        application.stage === 'Selected'
                          ? 'green'
                          : application.stage === 'Rejected'
                            ? 'red'
                            : 'blue'
                      }
                    >
                      {application.stage}
                    </StatusBadge>
                  </div>
                  <StageTracker stage={application.stage} />
                  <p className="mt-3 text-xs leading-5 text-slate-500">{application.note}</p>
                  {application.criteria && (
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Criteria when you applied (version {application.criteria.version}): CGPA ≥{' '}
                      {application.criteria.minCgpa ?? '—'}, backlogs ≤{' '}
                      {application.criteria.maxActiveBacklogs ?? '—'}.
                      {changed &&
                        ' The company has changed its criteria since; your application stands under the version above.'}
                    </p>
                  )}
                  {application.shared && application.shared.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Shared with the company: {application.shared.join(', ')}
                    </p>
                  )}
                </div>
              ) : null
            })
          )}
        </div>
      </section>

      <CareerRecords />
    </div>
  )
}

function ApplyButton({ opportunity }: { opportunity: Opportunity }) {
  const { data, student, canAct } = useStudent()
  const { error, busy, run } = useAction()
  const [open, setOpen] = useState(false)
  const [shared, setShared] = useState<SharedField[]>(['Resume', 'CGPA', 'Email'])
  const applied = data.applications.some(
    (row) => row.studentId === student.id && row.opportunityId === opportunity.id,
  )
  if (!canAct) return null
  if (applied) return <StatusBadge tone="green">Applied</StatusBadge>
  const eligible = evaluateEligibility(student, opportunity).status === 'Eligible'
  const blocked = offerPolicyBlock(student, opportunity, data)
  if (!eligible || blocked)
    return (
      <span className="text-xs text-slate-500">{blocked ?? 'You can apply once every rule passes.'}</span>
    )
  return open ? (
    <div className="w-full space-y-2 rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-semibold text-slate-700">Share with {opportunity.title} recruiters:</p>
      <div className="flex flex-wrap gap-3">
        {shareable.map((field) => (
          <label key={field} className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              className="h-4 w-4 accent-indigo-600"
              checked={shared.includes(field)}
              onChange={(event) =>
                setShared(event.target.checked ? [...shared, field] : shared.filter((item) => item !== field))
              }
            />
            {field}
          </label>
        ))}
      </div>
      {error && <Callout tone="error">{error}</Callout>}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            void run(applyToOpening({ student, opportunity, shared }, data), () => setOpen(false))
          }
        >
          Confirm application
        </Button>
        <Button size="sm" tone="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  ) : (
    <Button size="sm" onClick={() => setOpen(true)}>
      Apply
    </Button>
  )
}

function CareerRecords() {
  const { data, student, canAct, upload, openFile } = useStudent()
  const { error, busy, run, setError } = useAction()
  const [form, setForm] = useState({
    kind: 'Internship' as CareerRecord['kind'],
    company: '',
    role: '',
    from: '',
    to: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const records = data.careerRecords.filter((row) => row.studentId === student.id)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.company.trim() || !form.role.trim() || !form.from || files.length !== 1)
      return setError('Fill in the company, role and start date, and attach one certificate or letter.')
    try {
      const file = await upload(files[0])
      await run(
        {
          ops: [
            upsert('careerRecords', {
              id: uid('career'),
              studentId: student.id,
              ...form,
              to: form.to || null,
              file,
              verified: false,
            }),
          ],
        },
        () => (setForm({ kind: 'Internship', company: '', role: '', from: '', to: '' }), setFiles([])),
      )
    } catch (reason) {
      setError((reason as Error).message)
    }
  }
  return (
    <Card
      title="Internships & offer letters"
      description="Upload certificates and offer letters; the placement cell verifies them."
    >
      <DataTable
        rows={records}
        rowKey={(row) => row.id}
        empty="Nothing uploaded yet."
        columns={[
          {
            label: 'Record',
            render: (row) => (
              <div>
                <p className="font-semibold">
                  {row.role}, {row.company}
                </p>
                <p className="text-xs text-slate-500">{row.kind}</p>
              </div>
            ),
          },
          {
            label: 'Dates',
            render: (row) => `${formatDate(row.from)}${row.to ? ` – ${formatDate(row.to)}` : ''}`,
          },
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
            label: 'Status',
            render: (row) => (
              <StatusBadge tone={row.verified ? 'green' : 'amber'}>
                {row.verified ? 'Verified' : 'Awaiting verification'}
              </StatusBadge>
            ),
          },
        ]}
      />
      {canAct && (
        <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Type">
            <select
              className="form-input"
              value={form.kind}
              onChange={(event) => setForm({ ...form, kind: event.target.value as CareerRecord['kind'] })}
            >
              <option>Internship</option>
              <option>Offer letter</option>
            </select>
          </Field>
          <Field label="Company">
            <input
              className="form-input"
              value={form.company}
              onChange={(event) => setForm({ ...form, company: event.target.value })}
            />
          </Field>
          <Field label="Role">
            <input
              className="form-input"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
            />
          </Field>
          <Field label="From">
            <input
              type="date"
              className="form-input"
              value={form.from}
              max={today()}
              onChange={(event) => setForm({ ...form, from: event.target.value })}
            />
          </Field>
          <Field label="To (optional)">
            <input
              type="date"
              className="form-input"
              value={form.to}
              onChange={(event) => setForm({ ...form, to: event.target.value })}
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <FilePicker
              files={files}
              onChange={(next) => setFiles(next.slice(-1))}
              label="Attach certificate or letter (PDF/image, up to 5 MB)"
            />
          </div>
          <Button type="submit" disabled={busy} className="self-start">
            Upload
          </Button>
          {error && (
            <div className="sm:col-span-2 lg:col-span-5">
              <Callout tone="error">{error}</Callout>
            </div>
          )}
        </form>
      )}
    </Card>
  )
}

function OpportunityCard({
  opportunity,
  company,
  student,
  expanded,
  onToggle,
  onResume,
}: {
  opportunity: Opportunity
  company: Company
  student: Student
  expanded: boolean
  onToggle: () => void
  onResume: () => void
}) {
  const eligibility = evaluateEligibility(student, opportunity)
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition-[border-color,box-shadow] hover:border-indigo-200 hover:shadow-soft">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
              style={{ backgroundColor: company.accent }}
            >
              {company.initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={opportunity.status === 'Closing soon' ? 'amber' : 'green'} dot>
                  {opportunity.status}
                </StatusBadge>
                <span className="text-xs font-medium text-slate-500">
                  Posted {formatDate(opportunity.posted)}
                </span>
              </div>
              <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-slate-900">
                {opportunity.title}
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {company.name} · {company.sector}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-slate-500" />
                  {opportunity.location} · {opportunity.workMode}
                </span>
                <span className="flex items-center gap-1.5">
                  <BriefcaseBusiness size={14} className="text-slate-500" />
                  {opportunity.package}
                </span>
                <span
                  className={`flex items-center gap-1.5 ${opportunity.status === 'Closing soon' ? 'text-rose-600' : ''}`}
                >
                  <CalendarClock size={14} />
                  {deadlineLabel(opportunity.deadline)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
            <StatusBadge
              tone={
                eligibility.status === 'Eligible'
                  ? 'green'
                  : eligibility.status === 'Not Eligible'
                    ? 'red'
                    : 'purple'
              }
            >
              {eligibility.status}
            </StatusBadge>
            <span className="text-xs font-medium text-slate-500">Rule-based preview</span>
          </div>
        </div>
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-slate-500">Minimum CGPA</p>
            <p className="mt-1 text-sm font-bold text-slate-800">
              {opportunity.minCgpa?.toFixed(2) ?? 'Not published'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Branch criteria</p>
            <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-800">
              {opportunity.allowedBranches.length > 2
                ? `${opportunity.allowedBranches[0]} + ${opportunity.allowedBranches.length - 1} more`
                : opportunity.allowedBranches.join(' · ')}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Required skills</p>
            <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-800">
              {opportunity.requiredSkills.join(' · ')}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {expanded ? 'Hide rule explanation' : 'Show rule explanation'}
          </button>
          <button
            onClick={onResume}
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            <FileCheck2 size={15} /> Match my resume
          </button>
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <Building2 size={14} />
            {opportunity.jobType}
            {opportunity.dream && ' · Dream opening'}
          </span>
          <div className="flex w-full justify-start">
            <ApplyButton opportunity={opportunity} />
          </div>
        </div>
      </div>
      {expanded && <EligibilityExplanation result={eligibility} opportunity={opportunity} />}
    </article>
  )
}

function EligibilityExplanation({
  result,
  opportunity,
}: {
  result: ReturnType<typeof evaluateEligibility>
  opportunity: Opportunity
}) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-5 sm:px-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-medium text-indigo-600">Rule-by-rule explanation</p>
          <h4 className="mt-1 font-display text-lg font-bold text-slate-900">Why this result appears</h4>
        </div>
        <p className="max-w-md text-xs leading-5 text-slate-500">{result.summary}</p>
      </div>
      <div className="mt-5 grid gap-2 md:grid-cols-2">
        {result.rules.map((rule) => (
          <div
            key={rule.label}
            className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3"
          >
            <RuleIcon status={rule.status} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-800">{rule.label}</p>
                <StatusBadge
                  tone={rule.status === 'Pass' ? 'green' : rule.status === 'Fail' ? 'red' : 'purple'}
                >
                  {rule.status}
                </StatusBadge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Required: <span className="font-semibold text-slate-700">{rule.requirement}</span> · Your
                record: <span className="font-semibold text-slate-700">{rule.actual}</span>
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{rule.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
        <CircleAlert size={14} className="mt-0.5 shrink-0 text-amber-500" />
        <span>Published job description: {opportunity.jobDescription}</span>
      </div>
    </div>
  )
}

export function StageTracker({ stage }: { stage: PlacementStage }) {
  const rejected = stage === 'Rejected'
  const selected = stage === 'Selected'
  const activeIndex = rejected ? -1 : stageOrder.indexOf(stage)
  return (
    <div className="scrollbar-thin mt-6 overflow-x-auto pb-2" aria-label="Placement stages">
      <div className="flex min-w-[540px] items-start">
        {stageOrder.map((item, index) => {
          const completed = !rejected && (selected ? true : index <= activeIndex)
          const active = !rejected && index === activeIndex
          return (
            <div key={item} className="relative flex flex-1 flex-col items-center text-center">
              <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-100 first:left-1/2 last:right-1/2" />
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${completed ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-200 bg-white text-slate-500'} ${active ? 'ring-4 ring-indigo-100' : ''}`}
              >
                {completed ? <Check size={14} /> : index + 1}
              </div>
              <p
                className={`mt-2 text-[11px] font-bold ${active ? 'text-indigo-700' : completed ? 'text-slate-700' : 'text-slate-500'}`}
              >
                {item}
              </p>
            </div>
          )
        })}
      </div>
      {rejected && (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-rose-50 py-2 text-xs font-bold text-rose-700">
          <CircleAlert size={14} /> Application marked rejected
        </div>
      )}
    </div>
  )
}
