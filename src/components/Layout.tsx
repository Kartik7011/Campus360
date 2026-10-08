import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BellRing,
  BriefcaseBusiness,
  ChevronRight,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react'
import type { Student, ViewKey } from '../types'
import { InitialsAvatar } from './ui'

interface AppShellProps {
  student: Student
  activeView: ViewKey
  onNavigate: (view: ViewKey) => void
  onLogout: () => void
  children: React.ReactNode
}

interface NavItem {
  key: ViewKey
  label: string
  shortLabel: string
  icon: LucideIcon
}

const mainNav: NavItem[] = [
  { key: 'dashboard', label: 'Overview', shortLabel: 'Home', icon: LayoutDashboard },
  { key: 'academic', label: 'Academic record', shortLabel: 'Academic', icon: GraduationCap },
  { key: 'notices', label: 'Notices & deadlines', shortLabel: 'Notices', icon: BellRing },
  { key: 'placements', label: 'Placement hub', shortLabel: 'Placements', icon: BriefcaseBusiness },
  { key: 'resume', label: 'Resume checker', shortLabel: 'Resume', icon: FileCheck2 },
]

const viewLabels: Record<ViewKey, string> = {
  dashboard: 'Student overview',
  academic: 'Academic record',
  notices: 'Notices & deadlines',
  placements: 'Placement hub',
  resume: 'Resume checker',
  admin: 'Admin demo panel',
}

export function AppShell({ student, activeView, onNavigate, onLogout, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigate = (view: ViewKey) => {
    onNavigate(view)
    setMobileOpen(false)
  }

  return (
    <div className="min-h-screen bg-canvas text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col bg-ink text-white transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 pb-5 pt-7">
          <button className="group flex items-center gap-3 text-left" onClick={() => navigate('dashboard')} aria-label="Go to Campus360 overview">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
              <div className="absolute h-5 w-5 rounded-full border-[3px] border-teal-300 border-r-transparent" />
              <div className="h-1.5 w-1.5 rounded-full bg-amber-300" />
            </div>
            <div>
              <p className="font-display text-[17px] font-bold tracking-tight">Campus<span className="text-teal-300">360</span></p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-slate-400">Student transparency</p>
            </div>
          </button>
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <div className="mx-5 mb-5 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="flex items-center gap-3">
            <InitialsAvatar initials={student.initials} size="md" tone="teal" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{student.name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-400">{student.branch.replace(' & Engineering', '').replace('Computer Science', 'CSE')}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11px]">
            <span className="text-slate-400">Demo student</span>
            <span className="flex items-center gap-1.5 font-semibold text-teal-300"><span className="h-1.5 w-1.5 rounded-full bg-teal-300" />Active</span>
          </div>
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3" aria-label="Main navigation">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
          <div className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon
              const active = activeView === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${active ? 'bg-white text-ink shadow-lg shadow-slate-950/10' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={18} strokeWidth={active ? 2.4 : 1.8} className={active ? 'text-violet-600' : 'text-slate-400 group-hover:text-teal-300'} />
                  <span>{item.label}</span>
                  {item.key === 'notices' && <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-rose-100 text-rose-600' : 'bg-rose-400/15 text-rose-300'}`}>3</span>}
                </button>
              )
            })}
          </div>

          <div className="my-5 border-t border-white/10" />
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Demo controls</p>
          <button
            onClick={() => navigate('admin')}
            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${activeView === 'admin' ? 'bg-white text-ink shadow-lg shadow-slate-950/10' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
          >
            <Settings2 size={18} strokeWidth={activeView === 'admin' ? 2.4 : 1.8} className={activeView === 'admin' ? 'text-violet-600' : 'text-slate-400 group-hover:text-teal-300'} />
            <span>Admin demo panel</span>
          </button>
        </nav>

        <div className="p-4">
          <div className="mb-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-teal-500/10 p-4 ring-1 ring-white/10">
            <div className="mb-2 flex items-center gap-2 text-teal-300"><ShieldCheck size={15} /><span className="text-[11px] font-bold uppercase tracking-[0.15em]">Built for clarity</span></div>
            <p className="text-xs leading-5 text-slate-300">Your academic record, opportunity rules, and next actions in one place.</p>
          </div>
          <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/10 hover:text-white">
            <LogOut size={17} />
            <span>Switch demo student</span>
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-30 flex items-stretch justify-around rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-soft backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
        {mainNav.map((item) => {
          const Icon = item.icon
          const active = activeView === item.key
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className={`flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 text-[10px] font-bold transition ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
              <span className="max-w-full truncate">{item.shortLabel}</span>
            </button>
          )
        })}
      </nav>

      {mobileOpen && <button className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}

      <main className="min-h-screen lg:pl-[270px]">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-canvas/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button className="rounded-xl bg-white p-2 text-slate-600 shadow-sm ring-1 ring-slate-200 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
              <div>
                <p className="hidden text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 sm:block">Campus360 workspace</p>
                <h1 className="max-w-[190px] truncate font-display text-lg font-bold tracking-tight text-slate-950 sm:max-w-none sm:text-xl">{viewLabels[activeView]}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500" />Demo data synced</div>
              <button onClick={() => navigate('admin')} aria-label="Open admin demo panel" className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-3 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-indigo-300">
                <InitialsAvatar initials={student.initials} size="sm" />
                <span className="hidden text-xs font-semibold text-slate-700 sm:block">{student.name.split(' ')[0]}</span>
                <ChevronRight size={14} className="text-slate-400" />
              </button>
            </div>
          </div>
        </header>
        <div className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</div>
      </main>
    </div>
  )
}
