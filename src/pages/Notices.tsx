import {
  BellRing,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  Filter,
  Megaphone,
  Search,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Notice, NoticeCategory } from '../types'
import { deadlineLabel, formatDate } from '../utils'
import { SectionHeading, StatusBadge } from '../components/ui'
import { useFlipList } from '../useFlipList'

const categories: Array<'All' | NoticeCategory> = ['All', 'Academic', 'Placement', 'Rechecking']

export function Notices({ notices }: { notices: Notice[] }) {
  const [category, setCategory] = useState<'All' | NoticeCategory>('All')
  const [onlyPriority, setOnlyPriority] = useState(false)
  const [query, setQuery] = useState('')
  const listRef = useFlipList<HTMLElement>(`${category}|${onlyPriority}|${query}`)

  const visibleNotices = useMemo(
    () =>
      notices
        .filter((notice) => {
          const matchesCategory = category === 'All' || notice.category === category
          const matchesPriority = !onlyPriority || notice.priority === 'High'
          const haystack =
            `${notice.title} ${notice.summary} ${notice.category} ${notice.source}`.toLowerCase()
          return matchesCategory && matchesPriority && haystack.includes(query.toLowerCase())
        })
        .sort(
          (a, b) =>
            Number(b.priority === 'High') - Number(a.priority === 'High') ||
            (a.deadline ?? a.date).localeCompare(b.deadline ?? b.date),
        ),
    [category, notices, onlyPriority, query],
  )

  const highPriority = notices.filter((notice) => notice.priority === 'High')
  const deadlineCount = notices.filter(
    (notice) => notice.deadline && !deadlineLabel(notice.deadline).includes('Closed'),
  ).length

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Academic, placement, and rechecking updates with the deadline and priority made explicit.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 sm:self-auto">
          <BellRing size={15} className="text-indigo-500" /> {notices.length} active notices
        </div>
      </div>

      <section className="grid [&>*]:min-w-0 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-rose-600">High priority</p>
            <CircleAlert size={18} className="text-rose-500" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-rose-950">{highPriority.length}</p>
          <p className="mt-1 text-xs text-rose-800/70">Needs a closer look today</p>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-indigo-600">Upcoming deadlines</p>
            <CalendarClock size={18} className="text-indigo-500" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-indigo-950">{deadlineCount}</p>
          <p className="mt-1 text-xs text-indigo-800/70">Shown with time left below</p>
        </div>
        <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-teal-600">Source tagged</p>
            <Megaphone size={18} className="text-teal-500" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-teal-950">100%</p>
          <p className="mt-1 text-xs text-teal-800/70">Every notice has an owner</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search
              size={16}
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notices"
              aria-label="Search notices"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="scrollbar-thin flex min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-slate-50 p-1">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${category === item ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <button
              onClick={() => setOnlyPriority((value) => !value)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${onlyPriority ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700'}`}
            >
              <Filter size={14} />
              <span className="hidden sm:inline">High priority</span>
              <span className="sm:hidden">High</span>
            </button>
          </div>
        </div>
      </section>

      <section ref={listRef} className="space-y-3">
        {visibleNotices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <FileText className="mx-auto text-slate-300" size={26} />
            <p className="mt-3 text-sm font-bold text-slate-700">No notices match this view</p>
            <p className="mt-1 text-sm text-slate-500">Try clearing a filter or using a broader search.</p>
          </div>
        ) : (
          visibleNotices.map((notice) => <NoticeCard key={notice.id} notice={notice} />)
        )}
      </section>
    </div>
  )
}

function NoticeCard({ notice }: { notice: Notice }) {
  const categoryStyles = {
    Academic: { icon: FileText, box: 'bg-slate-100 text-slate-600', label: 'slate' as const },
    Placement: { icon: Megaphone, box: 'bg-brand-50 text-brand-700', label: 'blue' as const },
    Rechecking: { icon: FileText, box: 'bg-amber-50 text-amber-600', label: 'amber' as const },
  }
  const { icon: Icon, box, label } = categoryStyles[notice.category]
  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-[border-color,box-shadow] hover:border-indigo-200 hover:shadow-soft sm:p-6">
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${box}`}>
          <Icon size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={label}>{notice.category}</StatusBadge>
            <StatusBadge tone={notice.priority === 'High' ? 'red' : 'amber'} dot>
              {notice.priority} priority
            </StatusBadge>
          </div>
          <h3 className="mt-3 font-display text-lg font-bold text-slate-900">{notice.title}</h3>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">{notice.summary}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock3 size={14} className="text-slate-500" /> Published {formatDate(notice.date)}
            </span>
            {notice.deadline && (
              <span
                className={`flex items-center gap-1.5 ${notice.priority === 'High' ? 'text-rose-600' : 'text-slate-600'}`}
              >
                <CalendarClock size={14} /> Deadline {formatDate(notice.deadline)} ·{' '}
                {deadlineLabel(notice.deadline)}
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-500">
              For: <span className="font-semibold text-slate-600">{notice.audience}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
              {notice.source} <ChevronRight size={14} />
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
