import {
  AtSign,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { Mentor, RecheckRequest, Student, ViewKey } from '../types'
import { formatDate } from '../utils'
import { InfoRow, InitialsAvatar, ProgressBar, SectionHeading, StatusBadge } from '../components/ui'

export function Academic({
  student,
  mentor,
  rechecks,
  onNavigate,
}: {
  student: Student
  mentor: Mentor
  rechecks: RecheckRequest[]
  onNavigate: (view: ViewKey) => void
}) {
  const studentRechecks = rechecks.filter((item) => item.studentId === student.id)
  const creditProgress = Math.round((student.creditsCompleted / student.totalCredits) * 100)
  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            A transparent view of the academic fields that influence planning and placement rules.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 sm:self-auto">
          <ShieldCheck size={15} /> Record loaded
        </div>
      </div>

      <section className="grid [&>*]:min-w-0 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div>
            <div className="flex items-center gap-4">
              <InitialsAvatar initials={student.initials} size="xl" />
              <div>
                <p className="font-display text-xl font-semibold text-slate-950">{student.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {student.program} · Semester {student.semester}
                </p>
                <p className="mt-2 break-all text-sm text-brand-700">{student.email}</p>
              </div>
            </div>
            <p className="mt-6 max-w-[60ch] text-sm leading-6 text-slate-600">{student.profileNote}</p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Branch</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {student.branch.replace(' & Engineering', '')}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Graduating</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {student.graduationYear ?? 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-7">
          <SectionHeading
            title="Academic standing"
            description="These fields are used in planning views and explained again on each placement opportunity."
          />
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-indigo-50 p-5">
              <p className="text-xs font-medium text-indigo-600">CGPA</p>
              <p className="mt-2 font-display text-4xl font-bold tracking-tight text-indigo-950">
                {student.cgpa?.toFixed(2) ?? '—'}
              </p>
              <p className="mt-1 text-xs font-medium text-indigo-700">Cumulative grade point average</p>
            </div>
            <div className="rounded-2xl bg-teal-50 p-5">
              <p className="text-xs font-medium text-teal-600">Semester</p>
              <p className="mt-2 font-display text-4xl font-bold tracking-tight text-teal-950">
                {student.semester}
                <span className="text-xl">th</span>
              </p>
              <p className="mt-1 text-xs font-medium text-teal-700">Current academic term</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-800">Active backlogs</p>
                <span
                  className={`font-display text-xl font-bold ${student.activeBacklogs ? 'text-amber-600' : 'text-emerald-600'}`}
                >
                  {student.activeBacklogs ?? '—'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {student.backlogSubjects?.length
                  ? `Pending: ${student.backlogSubjects.join(', ')}`
                  : 'As per current record'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-800">Debarment status</p>
                <StatusBadge tone={student.debarred ? 'red' : student.debarred === null ? 'purple' : 'green'}>
                  {student.debarred ? 'Debarred' : student.debarred === null ? 'Unknown' : 'Clear'}
                </StatusBadge>
              </div>
              <p className="mt-2 text-xs text-slate-500">Official academic record indicator</p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Credits completed</span>
            <span className="text-slate-800">
              {student.creditsCompleted} / {student.totalCredits}
            </span>
          </div>
          <ProgressBar value={creditProgress} tone="teal" className="mt-2" />
        </div>
      </section>

      <section className="grid [&>*]:min-w-0 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeading
            title="Rechecking tracker"
            description="See what has been submitted, what is under review, and when to follow up."
            action={
              <button
                onClick={() => onNavigate('notices')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                View rechecking notice
              </button>
            }
          />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] text-slate-500">
                  <th className="pb-3 pr-4 font-bold">Subject</th>
                  <th className="pb-3 pr-4 font-bold">Requested</th>
                  <th className="pb-3 pr-4 font-bold">Status</th>
                  <th className="pb-3 font-bold">Expected by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentRechecks.map((request) => (
                  <tr key={request.id} className="align-top">
                    <td className="py-4 pr-4">
                      <p className="text-sm font-bold text-slate-800">{request.subject}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{request.code}</p>
                      <p className="mt-2 max-w-[250px] text-xs leading-5 text-slate-500">{request.remarks}</p>
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-600">{formatDate(request.requestDate)}</td>
                    <td className="py-4 pr-4">
                      <StatusBadge
                        tone={
                          request.status === 'Resolved'
                            ? 'green'
                            : request.status === 'Under Review'
                              ? 'amber'
                              : 'blue'
                        }
                      >
                        {request.status}
                      </StatusBadge>
                    </td>
                    <td className="py-4 text-sm font-semibold text-slate-700">
                      {formatDate(request.expectedBy)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeading
            title="Your mentor"
            description="A clear next contact for academic questions and placement planning."
          />
          <div className="mt-5 flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
            <InitialsAvatar initials={mentor.initials} size="lg" tone="teal" />
            <div>
              <p className="font-display text-lg font-bold text-slate-900">{mentor.name}</p>
              <p className="mt-1 text-xs text-slate-500">{mentor.department}</p>
              <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {mentor.availability}
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <InfoRow
              icon={<AtSign size={17} />}
              label="Email"
              value={
                <a className="break-all text-indigo-600 hover:underline" href={`mailto:${mentor.email}`}>
                  {mentor.email}
                </a>
              }
            />
            <InfoRow
              icon={<Phone size={17} />}
              label="Contact"
              value={
                <a
                  className="text-slate-800 hover:text-indigo-600"
                  href={`tel:${mentor.phone.replace(/\s/g, '')}`}
                >
                  {mentor.phone}
                </a>
              }
            />
            <InfoRow
              icon={<Clock3 size={17} />}
              label="Availability"
              value={mentor.officeHours}
              helper="Appointments are best confirmed over email."
            />
            <InfoRow icon={<GraduationCap size={17} />} label="Guidance focus" value={mentor.focus} />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <a
              href={`mailto:${mentor.email}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-ink px-3 py-3 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              <Mail size={14} /> Write email
            </a>
            <button
              onClick={() => onNavigate('placements')}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
            >
              <CalendarDays size={14} /> Plan placement
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <UserRound size={19} />
          </div>
          <div>
            <h3 className="font-display font-bold text-indigo-950">
              Keep your official record authoritative
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-indigo-800/80">
              Campus360 shows your records to help you plan and ask the right questions. If a CGPA, backlog,
              or debarment field looks incorrect, contact the academic office before relying on an opportunity
              check.
            </p>
          </div>
          <CheckCircle2 className="ml-auto hidden shrink-0 text-indigo-400 sm:block" size={19} />
        </div>
      </section>
    </div>
  )
}
