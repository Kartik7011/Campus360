import {
  ArrowUpRight,
  Award,
  BellRing,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Mail,
  MessageCircleMore,
  Phone,
  Info,
} from 'lucide-react'
import type { Company, Mentor, Notice, Opportunity, PlacementApplication, Student, ViewKey } from '../types'
import { deadlineLabel, formatDate, getCompanyByOpportunity } from '../utils'
import { InitialsAvatar, ProgressBar, SectionHeading, StatusBadge } from '../components/ui'

interface DashboardProps {
  student: Student
  mentor: Mentor
  notices: Notice[]
  opportunities: Opportunity[]
  companies: Company[]
  applications: PlacementApplication[]
  onNavigate: (view: ViewKey) => void
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  accent,
  action,
}: {
  label: string
  value: string
  helper: string
  icon: React.ReactNode
  accent: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
        {action}
      </div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
    </div>
  )
}

export function Dashboard({
  student,
  mentor,
  notices,
  opportunities,
  companies,
  applications,
  onNavigate,
}: DashboardProps) {
  const urgentNotices = [...notices]
    .sort((a, b) => (a.deadline ?? a.date).localeCompare(b.deadline ?? b.date))
    .slice(0, 3)
  const studentApplications = applications.filter((application) => application.studentId === student.id)
  const openOpportunities = opportunities.filter((opportunity) => opportunity.status !== 'Closed')
  const placementReadiness = Math.round(
    Math.min(
      100,
      38 +
        (student.cgpa ?? 0) * 5 +
        (student.activeBacklogs === 0 ? 12 : 0) +
        (student.attendance >= 85 ? 8 : 0),
    ),
  )
  const firstName = student.name.split(' ')[0]

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 px-5 py-6 text-white sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-brand-200">{formatDate('2026-10-08', { weekday: 'long' })}</p>
            <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
              Good morning, {firstName}
            </h2>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded-lg bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
              <b className="font-semibold">{urgentNotices.length}</b> upcoming deadlines
            </span>
            <span className="rounded-lg bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
              <b className="font-semibold">{studentApplications.length}</b> active applications
            </span>
          </div>
        </div>
      </section>

      <section className="grid [&>*]:min-w-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          label="Current CGPA"
          value={student.cgpa?.toFixed(2) ?? '—'}
          helper="Recorded academic average"
          icon={<Award size={19} className="text-indigo-600" />}
          accent="bg-indigo-50"
        />
        <MetricCard
          label="Semester"
          value={`S${student.semester}`}
          helper={student.branch}
          icon={<BookOpenCheck size={19} className="text-teal-600" />}
          accent="bg-teal-50"
        />
        <MetricCard
          label="Active backlogs"
          value={student.activeBacklogs === null ? '—' : String(student.activeBacklogs)}
          helper={
            student.activeBacklogs === 0
              ? 'No active backlog reported'
              : student.backlogSubjects?.length
                ? `Pending: ${student.backlogSubjects.join(', ')}`
                : 'Review impact on each opening'
          }
          icon={
            <CircleAlert
              size={19}
              className={student.activeBacklogs === 0 ? 'text-emerald-600' : 'text-amber-600'}
            />
          }
          accent={student.activeBacklogs === 0 ? 'bg-emerald-50' : 'bg-amber-50'}
        />
        <MetricCard
          label="Debarment status"
          value={student.debarred === null ? 'Unknown' : student.debarred ? 'Debarred' : 'Clear'}
          helper="Official record indicator"
          icon={<CheckCircle2 size={19} className="text-emerald-600" />}
          accent="bg-emerald-50"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeading
            title="Upcoming deadlines"
            description="The next few items that can change your academic or placement position."
            action={
              <button
                onClick={() => onNavigate('notices')}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                All notices <ChevronRight size={15} />
              </button>
            }
          />
          <div className="mt-5 divide-y divide-slate-100">
            {urgentNotices.map((notice) => (
              <button
                key={notice.id}
                onClick={() => onNavigate('notices')}
                className="group flex w-full items-start gap-3 py-4 text-left first:pt-0 last:pb-0"
              >
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notice.category === 'Placement' ? 'bg-brand-50 text-brand-700' : notice.category === 'Rechecking' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}
                >
                  <BellRing size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700">
                      {notice.title}
                    </p>
                    <StatusBadge tone={notice.priority === 'High' ? 'red' : 'amber'}>
                      {notice.priority}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500">{notice.summary}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                    <span>{notice.category}</span>
                    {notice.deadline && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock3 size={12} /> {deadlineLabel(notice.deadline)}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowUpRight
                  size={16}
                  className="mt-1 shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-500"
                />
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeading title="Your mentor" />
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <InitialsAvatar initials={mentor.initials} size="lg" tone="teal" />
              <div>
                <p className="font-display font-bold text-slate-900">{mentor.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {mentor.department.replace('Department of ', '')}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {mentor.availability}
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            {mentor.focus}. Bring your academic snapshot and one target role to your next check-in.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <a
              href={`mailto:${mentor.email}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
            >
              <Mail size={14} /> Email
            </a>
            <a
              href={`tel:${mentor.phone.replace(/\s/g, '')}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
            >
              <Phone size={14} /> Call
            </a>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeading
            title="Placement readiness"
            action={
              <button
                onClick={() => onNavigate('resume')}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Improve resume <ChevronRight size={15} />
              </button>
            }
          />
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-4xl font-bold tracking-tight text-slate-950">
                {placementReadiness}
                <span className="text-xl text-slate-500">/100</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Personal readiness signal</p>
            </div>
            <div className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
              Early-stage
            </div>
          </div>
          <ProgressBar value={placementReadiness} className="mt-5" />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Open roles</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{openOpportunities.length}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Applications</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{studentApplications.length}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Skills listed</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{student.skills.length}</p>
            </div>
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs leading-5 text-indigo-800">
            <Info size={15} className="mt-0.5 shrink-0 text-indigo-500" />
            <p>
              This is a planning signal, not an official placement score. Use the rule-by-rule checker for
              each opening.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeading
            title="Applications"
            action={
              <button
                onClick={() => onNavigate('placements')}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                View hub <ChevronRight size={15} />
              </button>
            }
          />
          <div className="mt-5 space-y-3">
            {studentApplications.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No applications have been added yet.
              </p>
            ) : (
              studentApplications.slice(0, 3).map((application) => {
                const opportunity = opportunities.find((item) => item.id === application.opportunityId)
                const company = opportunity ? getCompanyByOpportunity(opportunity, companies) : undefined
                return opportunity && company ? (
                  <div
                    key={application.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                      style={{ backgroundColor: company.accent }}
                    >
                      {company.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{opportunity.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {company.name} · Applied {formatDate(application.appliedOn)}
                      </p>
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
                ) : null
              })
            )}
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            <MessageCircleMore size={16} className="shrink-0 text-amber-600" />
            <span>Keep your mentor updated when a stage changes or a deadline moves.</span>
          </div>
        </section>
      </div>
    </div>
  )
}
