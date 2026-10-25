import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  BellRing,
  BriefcaseBusiness,
  CalendarCheck,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Settings2,
  Trophy,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { patch } from '../ops'
import { useCampus } from '../store'
import type { ViewKey } from '../types'
import { useEnterAnimation } from '../useEnterAnimation'
import { InitialsAvatar } from './ui'

export interface ShellUser {
  name: string
  initials: string
  subtitle: string
  isAdmin: boolean
}

interface AppShellProps {
  user: ShellUser
  views: ViewKey[]
  remote: boolean
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

const navItems: Record<ViewKey, NavItem> = {
  dashboard: { key: 'dashboard', label: 'Overview', shortLabel: 'Home', icon: LayoutDashboard },
  academic: { key: 'academic', label: 'Academic record', shortLabel: 'Academic', icon: GraduationCap },
  results: { key: 'results', label: 'Results & documents', shortLabel: 'Results', icon: Trophy },
  exams: { key: 'exams', label: 'Exams', shortLabel: 'Exams', icon: CalendarCheck },
  fees: { key: 'fees', label: 'Fees', shortLabel: 'Fees', icon: Wallet },
  notices: { key: 'notices', label: 'Notices & calendar', shortLabel: 'Notices', icon: BellRing },
  placements: {
    key: 'placements',
    label: 'Placement hub',
    shortLabel: 'Placements',
    icon: BriefcaseBusiness,
  },
  resume: { key: 'resume', label: 'Resume checker', shortLabel: 'Resume', icon: FileCheck2 },
  help: { key: 'help', label: 'Help & requests', shortLabel: 'Help', icon: LifeBuoy },
  profile: { key: 'profile', label: 'Profile & privacy', shortLabel: 'Profile', icon: UserRound },
  admin: { key: 'admin', label: 'Staff workspace', shortLabel: 'Workspace', icon: Settings2 },
}

export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  // same artwork as public/favicon.svg: an orbit ring with a "satellite" in its gap around a centre point
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="c360-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b73f6" />
          <stop offset="1" stopColor="#152257" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#c360-tile)" />
      <circle
        cx="16"
        cy="16"
        r="9"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeDasharray="46 10.5"
        strokeLinecap="round"
      />
      <circle cx="23.8" cy="11.5" r="2.3" fill="#93b8fd" />
      <circle cx="16" cy="16" r="3.2" fill="#fff" />
    </svg>
  )
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className={`h-8 w-8 ${inverted ? 'rounded-[9px] ring-1 ring-white/25' : ''}`} />
      <span
        className={`font-display text-[17px] font-semibold ${inverted ? 'text-white' : 'text-slate-950'}`}
      >
        Campus<span className={inverted ? 'text-brand-300' : 'text-brand-600'}>360</span>
      </span>
    </span>
  )
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
        active
          ? 'bg-brand-50 font-semibold text-brand-800'
          : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon
        size={18}
        strokeWidth={active ? 2.2 : 1.8}
        className={active ? 'text-brand-700' : 'text-slate-500'}
      />
      <span>{label}</span>
      {badge ? (
        <span className="ml-auto rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
          {badge}
        </span>
      ) : null}
    </button>
  )
}

export function AppShell({ user, views, remote, activeView, onNavigate, onLogout, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const items = views.map((key) => navItems[key])
  const { data, student } = useCampus()
  const unreadNotices = student
    ? data.notices.filter(
        (notice) =>
          notice.mandatory &&
          !data.noticeReads.some((read) => read.noticeId === notice.id && read.studentId === student.id),
      ).length
    : 0
  const contentRef = useEnterAnimation<HTMLDivElement>(activeView)

  const navigate = (view: ViewKey) => {
    onNavigate(view)
    setMobileOpen(false)
  }

  return (
    <div className="min-h-dvh bg-canvas text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-soft"
      >
        Skip to content
      </a>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <button onClick={() => navigate(items[0].key)} aria-label="Go to home page">
            <Logo />
          </button>
          <button
            className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav
          className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 pt-2"
          aria-label="Main navigation"
        >
          {items.map((item) => (
            <NavButton
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={activeView === item.key}
              onClick={() => navigate(item.key)}
              badge={item.key === 'notices' ? unreadNotices : undefined}
            />
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <InitialsAvatar initials={user.initials} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.subtitle}</p>
            </div>
            <button
              onClick={onLogout}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <nav
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden ${user.isAdmin ? 'hidden' : 'flex'}`}
        aria-label="Mobile navigation"
      >
        {items.slice(0, items.length > 5 ? 4 : 5).map((item) => {
          const Icon = item.icon
          const active = activeView === item.key
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className={`flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors ${active ? 'font-semibold text-brand-700' : 'font-medium text-slate-500'}`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span className="max-w-full truncate px-1">{item.shortLabel}</span>
            </button>
          )
        })}
        {items.length > 5 && (
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="All sections"
            className="flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-500"
          >
            <Menu size={20} strokeWidth={1.8} />
            <span>More</span>
          </button>
        )}
      </nav>

      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      <main id="main" className="min-h-dvh lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-canvas/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <button
                className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>
              <h1 className="truncate font-display text-lg font-semibold text-slate-950">
                {navItems[activeView].label}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="hidden items-center gap-1.5 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {remote ? 'Synced with the university database' : 'Saved on this device'}
              </span>
              {student && <NotificationBell onNavigate={navigate} />}
              <span className="lg:hidden">
                <InitialsAvatar initials={user.initials} size="sm" />
              </span>
            </div>
          </div>
        </header>
        <div ref={contentRef} className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}

function NotificationBell({ onNavigate }: { onNavigate: (view: ViewKey) => void }) {
  const { data, student, canAct, commit } = useCampus()
  const [open, setOpen] = useState(false)
  const mine = data.notifications
    .filter((item) => item.studentId === student?.id)
    .sort((a, b) => b.createdOn.localeCompare(a.createdOn))
  const unread = mine.filter((item) => !item.readOn).length
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-11 w-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
          <p className="px-3 py-2 text-xs font-semibold text-slate-500">Notifications</p>
          {mine.length === 0 && <p className="px-3 pb-3 text-sm text-slate-500">Nothing yet.</p>}
          <ul className="scrollbar-thin max-h-96 overflow-y-auto">
            {mine.slice(0, 20).map((item) => (
              <li key={item.id}>
                <button
                  className={`w-full rounded-xl px-3 py-2.5 text-left hover:bg-slate-50 ${item.readOn ? '' : 'bg-brand-50/50'}`}
                  onClick={() => {
                    if (canAct && !item.readOn)
                      void commit([patch('notifications', item.id, { readOn: new Date().toISOString() })])
                    setOpen(false)
                    onNavigate(item.view)
                  }}
                >
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.body}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {new Date(item.createdOn).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
