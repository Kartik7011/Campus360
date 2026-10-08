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
  Sparkles,
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

function MetricCard({ label, value, helper, icon, accent, action }: { label: string; value: string; helper: string; icon: React.ReactNode; accent: string; action?: React.ReactNode }) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>{icon}</div>{action}</div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
    </div>
  )
}

export function Dashboard({ student, mentor, notices, opportunities, companies, applications, onNavigate }: DashboardProps) {
  const urgentNotices = [...notices].sort((a, b) => (a.deadline ?? a.date).localeCompare(b.deadline ?? b.date)).slice(0, 3)
  const studentApplications = applications.filter((application) => application.studentId === student.id)
  const openOpportunities = opportunities.filter((opportunity) => opportunity.status !== 'Closed')
  const placementReadiness = Math.round(Math.min(100, 38 + (student.cgpa ?? 0) * 5 + (student.activeBacklogs === 0 ? 12 : 0) + (student.attendance >= 85 ? 8 : 0)))
  const firstName = student.name.split(' ')[0]

  return (
    <div className="space-y-7">
      <section className="dashboard-orb relative overflow-hidden rounded-[26px] px-5 py-6 text-white shadow-soft sm:px-8 sm:py-8">
        <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[30px] border-white/5" />
        <div className="absolute -bottom-20 right-20 h-44 w-44 rounded-full border-[22px] border-teal-300/10" />
        <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100"><Sparkles size={14} className="text-amber-300" /> Your campus, made clearer</div>
            <p className="text-sm font-medium text-indigo-100">Good morning, {firstName}</p>
            <h2 className="mt-1 max-w-2xl font-display text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Make your next academic and career move with context.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100/80">Here’s your latest academic snapshot, deadlines, and placement readiness — all in one working view.</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm md:min-w-[180px]">
            <div className="flex items-center justify-between gap-6"><div><p className="text-xs font-semibold uppercase tracking-[0.13em] text-indigo-100/70">Today</p><p className="mt-1 text-sm font-bold">{formatDate('2026-10-08', { weekday: 'long' })}</p></div><CalendarClock size={21} className="text-teal-200" /></div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-teal-100"><span className="h-2 w-2 rounded-full bg-teal-300" /> Demo data is up to date</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Current CGPA" value={student.cgpa?.toFixed(2) ?? '—'} helper="Recorded academic average" icon={<Award size={19} className="text-indigo-600" />} accent="bg-indigo-50" />
        <MetricCard label="Semester" value={`S${student.semester}`} helper={student.branch} icon={<BookOpenCheck size={19} className="text-teal-600" />} accent="bg-teal-50" />
        <MetricCard label="Active backlogs" value={student.activeBacklogs === null ? '—' : String(student.activeBacklogs)} helper={student.activeBacklogs === 0 ? 'No active backlog reported' : 'Review impact on each opening'} icon={<CircleAlert size={19} className={student.activeBacklogs === 0 ? 'text-emerald-600' : 'text-amber-600'} />} accent={student.activeBacklogs === 0 ? 'bg-emerald-50' : 'bg-amber-50'} />
        <MetricCard label="Debarment status" value={student.debarred === null ? 'Unknown' : student.debarred ? 'Debarred' : 'Clear'} helper="Official record indicator" icon={<CheckCircle2 size={19} className="text-emerald-600" />} accent="bg-emerald-50" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeading eyebrow="Priority view" title="What needs your attention" description="The next few items that can change your academic or placement position." action={<button onClick={() => onNavigate('notices')} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">All notices <ChevronRight size={15} /></button>} />
          <div className="mt-5 divide-y divide-slate-100">
            {urgentNotices.map((notice) => (
              <button key={notice.id} onClick={() => onNavigate('notices')} className="group flex w-full items-start gap-3 py-4 text-left first:pt-0 last:pb-0">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notice.category === 'Placement' ? 'bg-violet-50 text-violet-600' : notice.category === 'Rechecking' ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600'}`}><BellRing size={16} /></div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700">{notice.title}</p><StatusBadge tone={notice.priority === 'High' ? 'red' : 'amber'}>{notice.priority}</StatusBadge></div><p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500">{notice.summary}</p><div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-slate-400"><span>{notice.category}</span>{notice.deadline && <span className="flex items-center gap-1 text-slate-500"><Clock3 size={12} /> {deadlineLabel(notice.deadline)}</span>}</div></div>
                <ArrowUpRight size={16} className="mt-1 shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-500" />
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeading eyebrow="Your guide" title="Mentor connection" />
          <div className="mt-5 rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-3"><InitialsAvatar initials={mentor.initials} size="lg" tone="teal" /><div><p className="font-display font-bold text-slate-900">{mentor.name}</p><p className="mt-1 text-xs text-slate-500">{mentor.department.replace('Department of ', '')}</p></div></div><div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />{mentor.availability}</div></div>
          <p className="mt-4 text-sm leading-6 text-slate-500">{mentor.focus}. Bring your academic snapshot and one target role to your next check-in.</p>
          <div className="mt-5 grid grid-cols-2 gap-2"><a href={`mailto:${mentor.email}`} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"><Mail size={14} /> Email</a><a href={`tel:${mentor.phone.replace(/\s/g, '')}`} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"><Phone size={14} /> Call</a></div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeading eyebrow="Placement readiness" title="Build confidence before the next round" action={<button onClick={() => onNavigate('resume')} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">Improve resume <ChevronRight size={15} /></button>} />
          <div className="mt-6 flex items-end justify-between gap-4"><div><p className="font-display text-4xl font-bold tracking-tight text-slate-950">{placementReadiness}<span className="text-xl text-slate-400">/100</span></p><p className="mt-1 text-xs font-semibold text-slate-500">Personal readiness signal</p></div><div className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">Early-stage</div></div>
          <ProgressBar value={placementReadiness} className="mt-5" />
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs text-slate-500">Open roles</p><p className="mt-1 text-lg font-bold text-slate-900">{openOpportunities.length}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs text-slate-500">Applications</p><p className="mt-1 text-lg font-bold text-slate-900">{studentApplications.length}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs text-slate-500">Skills listed</p><p className="mt-1 text-lg font-bold text-slate-900">{student.skills.length}</p></div></div>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs leading-5 text-indigo-800"><Sparkles size={15} className="mt-0.5 shrink-0 text-indigo-500" /><p>This is a planning signal, not an official placement score. Use the rule-by-rule checker for each opening.</p></div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeading eyebrow="Placement activity" title="Your live applications" action={<button onClick={() => onNavigate('placements')} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">View hub <ChevronRight size={15} /></button>} />
          <div className="mt-5 space-y-3">
            {studentApplications.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No applications have been added yet.</p> : studentApplications.slice(0, 3).map((application) => { const opportunity = opportunities.find((item) => item.id === application.opportunityId); const company = opportunity ? getCompanyByOpportunity(opportunity, companies) : undefined; return opportunity && company ? <div key={application.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ backgroundColor: company.accent }}>{company.initials}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{opportunity.title}</p><p className="mt-0.5 text-xs text-slate-500">{company.name} · Applied {formatDate(application.appliedOn)}</p></div><StatusBadge tone={application.stage === 'Selected' ? 'green' : application.stage === 'Rejected' ? 'red' : 'blue'}>{application.stage}</StatusBadge></div> : null })}
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800"><MessageCircleMore size={16} className="shrink-0 text-amber-600" /><span>Keep your mentor updated when a stage changes or a deadline moves.</span></div>
        </section>
      </div>
    </div>
  )
}
