import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, HelpCircle, X } from 'lucide-react'

export function InitialsAvatar({
  initials,
  size = 'md',
  tone = 'indigo',
}: {
  initials: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone?: 'indigo' | 'teal' | 'amber' | 'slate'
}) {
  const sizes = {
    sm: 'h-8 w-8 text-[11px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl',
  }
  const tones = {
    indigo: 'bg-indigo-100 text-indigo-700',
    teal: 'bg-teal-100 text-teal-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg font-semibold ${sizes[size]} ${tones[tone]}`}
    >
      {initials}
    </div>
  )
}

export function StatusBadge({
  children,
  tone,
  dot = false,
}: {
  children: ReactNode
  tone?: 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'purple' | 'teal'
  dot?: boolean
}) {
  const content = String(children)
  const lower = content.toLowerCase()
  const inferred =
    tone ??
    (lower.includes('not eligible') ||
    lower.includes('rejected') ||
    lower.includes('high') ||
    lower.includes('fail')
      ? 'red'
      : lower.includes('cannot') || lower.includes('unknown')
        ? 'purple'
        : lower.includes('eligible') ||
            lower.includes('selected') ||
            lower.includes('resolved') ||
            lower.includes('clear') ||
            lower.includes('open')
          ? 'green'
          : lower.includes('review') ||
              lower.includes('aptitude') ||
              lower.includes('closing') ||
              lower.includes('medium')
            ? 'amber'
            : 'slate')
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-rose-50 text-rose-700 ring-rose-200',
    blue: 'bg-brand-50 text-brand-700 ring-brand-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    purple: 'bg-violet-50 text-violet-700 ring-violet-200',
    teal: 'bg-teal-50 text-teal-700 ring-teal-200',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[inferred]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-lg font-semibold text-slate-950 sm:text-xl">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ProgressBar({
  value,
  tone = 'indigo',
  className = '',
}: {
  value: number
  tone?: 'indigo' | 'teal' | 'amber'
  className?: string
}) {
  const tones = { indigo: 'bg-brand-500', teal: 'bg-emerald-600', amber: 'bg-amber-500' }
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className={`h-full rounded-full transition-all ${tones[tone]}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function InfoRow({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  helper?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
        {helper && <p className="mt-0.5 text-xs text-slate-500">{helper}</p>}
      </div>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        {icon ?? <HelpCircle size={20} />}
      </div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  size = 'md',
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close dialog" />
      <div
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-soft sm:rounded-2xl sm:p-7 ${widths[size]}`}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-950">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function RuleIcon({ status }: { status: 'Pass' | 'Fail' | 'Unknown' }) {
  if (status === 'Pass') return <CheckCircle2 size={17} className="text-emerald-500" />
  if (status === 'Fail') return <AlertCircle size={17} className="text-rose-500" />
  return <HelpCircle size={17} className="text-violet-500" />
}
