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

export function Card({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6 ${className}`}
    >
      {title && <SectionHeading title={title} description={description} action={action} />}
      <div className={title ? 'mt-5' : ''}>{children}</div>
    </section>
  )
}

export function Button({
  children,
  tone = 'primary',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}) {
  const tones = {
    primary: 'bg-ink text-white hover:bg-slate-800',
    secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
    danger: 'bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }
  const sizes = { sm: 'min-h-[36px] px-3 py-1.5 text-xs', md: 'min-h-[44px] px-4 py-2.5 text-sm' }
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string
  hint?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <label className={`block min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function Callout({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warn' | 'error' | 'ok'
  children: ReactNode
}) {
  const tones = {
    info: 'border-slate-200 bg-slate-50 text-slate-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border p-3 text-sm leading-6 ${tones[tone]}`}
    >
      {children}
    </div>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { key: T; label: string; badge?: number }[]
  value: T
  onChange: (key: T) => void
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="scrollbar-thin flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200"
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={value === tab.key}
          onClick={() => onChange(tab.key)}
          className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold transition sm:px-4 ${value === tab.key ? 'bg-ink text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {tab.label}
          {tab.badge ? (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] ${value === tab.key ? 'bg-white/20' : 'bg-rose-50 text-rose-700'}`}
            >
              {tab.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

export function FilePicker({
  files,
  onChange,
  accept = '.pdf,.jpg,.jpeg,.png',
  label = 'Attach documents (PDF or image, up to 5 MB each)',
}: {
  files: File[]
  onChange: (files: File[]) => void
  accept?: string
  label?: string
}) {
  return (
    <div>
      <label className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-600 transition focus-within:ring-2 focus-within:ring-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-50/40">
        {label}
        <input
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          onChange={(event) => {
            onChange([...files, ...Array.from(event.target.files ?? [])])
            event.target.value = ''
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                className="shrink-0 font-bold text-rose-600"
                onClick={() => onChange(files.filter((_, other) => other !== index))}
                aria-label={`Remove ${file.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export interface Column<T> {
  label: string
  render: (row: T) => ReactNode
  className?: string
}

// Table on wide screens, stacked cards on phones (no horizontal scroll at 360 px).
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  empty,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  empty: string
}) {
  if (!rows.length)
    return <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">{empty}</p>
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {columns.map((column) => (
                <th key={column.label} className={`pb-3 pr-4 ${column.className ?? ''}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="align-top">
                {columns.map((column) => (
                  <td key={column.label} className={`py-3 pr-4 text-slate-700 ${column.className ?? ''}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-xl border border-slate-100 p-3">
            <dl className="grid grid-cols-[minmax(0,40%)_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              {columns.map((column) => (
                <div key={column.label} className="contents">
                  <dt className="text-xs text-slate-500">{column.label}</dt>
                  <dd className="min-w-0 break-words text-slate-800">{column.render(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
