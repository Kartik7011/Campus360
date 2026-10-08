import { ArrowRight, BookOpenCheck, BriefcaseBusiness, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import type { Student } from '../types'
import { InitialsAvatar } from './ui'

export function LoginScreen({ students, onLogin }: { students: Student[]; onLogin: (id: string) => void }) {
  return (
    <div className="min-h-screen overflow-hidden bg-ink text-white">
      <div className="absolute inset-0 campus-grid opacity-20" />
      <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="grid w-full gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="max-w-xl">
            <div className="mb-10 flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <div className="absolute h-6 w-6 rounded-full border-[3px] border-teal-300 border-r-transparent" />
                <div className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              </div>
              <div><p className="font-display text-lg font-bold">Campus<span className="text-teal-300">360</span></p><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Student transparency platform</p></div>
            </div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-xs font-semibold text-teal-200"><Sparkles size={14} /> Capstone-I MTE demo</div>
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-white sm:text-6xl">Know where you stand.<br /><span className="text-gradient">Choose what’s next.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">A single student view for academic records, placement rules, important notices, and practical resume improvement.</p>
            <div className="mt-9 grid max-w-lg gap-3 sm:grid-cols-3">
              {[
                { icon: BookOpenCheck, label: 'Academic clarity' },
                { icon: BriefcaseBusiness, label: 'Placement transparency' },
                { icon: ShieldCheck, label: 'Human-led decisions' },
              ].map(({ icon: Icon, label }) => <div key={label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-xs font-semibold text-slate-300"><Icon size={15} className="text-teal-300" />{label}</div>)}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white p-5 text-slate-900 shadow-2xl shadow-slate-950/30 sm:p-7">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-500">Demo access</p><h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-950">Choose a student profile</h2><p className="mt-1 text-sm leading-6 text-slate-500">No password needed for this MTE walkthrough.</p></div>
              <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600"><CheckCircle2 size={20} /></div>
            </div>
            <div className="space-y-3">
              {students.map((student, index) => (
                <button key={student.id} onClick={() => onLogin(student.id)} className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-card">
                  <InitialsAvatar initials={student.initials} size="lg" tone={index === 0 ? 'indigo' : 'teal'} />
                  <div className="min-w-0 flex-1"><p className="font-display text-base font-bold text-slate-900">{student.name}</p><p className="mt-1 truncate text-sm text-slate-500">{student.branch}</p><div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500"><span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">Sem {student.semester}</span><span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">CGPA {student.cgpa?.toFixed(2) ?? '—'}</span></div></div>
                  <ArrowRight size={19} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500" />
                </button>
              ))}
            </div>
            <div className="mt-7 flex gap-3 rounded-2xl bg-slate-950 p-4 text-slate-300"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-teal-300" /><p className="text-xs leading-5">This is seeded demo data for academic review. Official eligibility decisions remain with the college placement cell.</p></div>
          </section>
        </div>
      </div>
    </div>
  )
}
