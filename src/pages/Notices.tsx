import { useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Search } from 'lucide-react'
import { Button, Card, StatusBadge, Tabs } from '../components/ui'
import { academicCalendar, noticeVisibleTo } from '../domain/campus'
import { today, uid, upsert } from '../ops'
import { useAction, useStudent } from '../store'
import type { NoticeCategory } from '../types'
import { deadlineLabel, formatDate } from '../utils'

const categories: ('All' | NoticeCategory)[] = ['All', 'Academic', 'Exams', 'Fees', 'Placement', 'Rechecking']

export function Notices() {
  const [tab, setTab] = useState<'notices' | 'calendar'>('notices')
  return (
    <div className="space-y-6">
      <Tabs
        label="Notices"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'notices', label: 'Notices' },
          { key: 'calendar', label: 'Academic calendar' },
        ]}
      />
      {tab === 'notices' ? <NoticeList /> : <Calendar />}
    </div>
  )
}

function NoticeList() {
  const { data, student, canAct } = useStudent()
  const { busy, run } = useAction()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<(typeof categories)[number]>('All')
  const [highOnly, setHighOnly] = useState(false)
  const read = (id: string) =>
    data.noticeReads.some((row) => row.noticeId === id && row.studentId === student.id)

  const notices = useMemo(
    () =>
      data.notices
        .filter((notice) => noticeVisibleTo(notice, student))
        .filter((notice) => category === 'All' || notice.category === category)
        .filter((notice) => !highOnly || notice.priority === 'High')
        .filter((notice) =>
          `${notice.title} ${notice.summary} ${notice.source}`.toLowerCase().includes(query.toLowerCase()),
        )
        // unacknowledged mandatory notices first, then nearest deadline
        .sort(
          (a, b) =>
            Number(!!b.mandatory && !read(b.id)) - Number(!!a.mandatory && !read(a.id)) ||
            (a.deadline ?? a.date).localeCompare(b.deadline ?? b.date),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.notices, data.noticeReads, student, category, highOnly, query],
  )

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notices"
            aria-label="Search notices"
            className="form-input bg-white pl-9"
          />
        </label>
        <select
          aria-label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value as typeof category)}
          className="form-input bg-white sm:w-44"
        >
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="flex min-h-[44px] items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 accent-indigo-600"
            checked={highOnly}
            onChange={(event) => setHighOnly(event.target.checked)}
          />
          High priority only
        </label>
      </div>
      {notices.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">No notices match.</p>
        </Card>
      )}
      <div className="space-y-3">
        {notices.map((notice) => {
          const acknowledged = read(notice.id)
          return (
            <article
              key={notice.id}
              className={`rounded-2xl border bg-white p-5 shadow-card ${notice.mandatory && !acknowledged ? 'border-amber-300' : 'border-slate-200/80'}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="blue">{notice.category}</StatusBadge>
                <StatusBadge>{notice.priority}</StatusBadge>
                {notice.mandatory && (
                  <StatusBadge tone={acknowledged ? 'green' : 'amber'}>
                    {acknowledged ? 'Acknowledged' : 'Must read'}
                  </StatusBadge>
                )}
                {notice.deadline && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                    <Clock3 size={12} /> {deadlineLabel(notice.deadline)}
                  </span>
                )}
              </div>
              <h2 className="mt-3 font-display text-lg font-semibold text-slate-900">{notice.title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{notice.summary}</p>
              <p className="mt-3 text-xs text-slate-500">
                {notice.source} · {formatDate(notice.date)} · {notice.audience}
                {notice.deadline && ` · deadline ${formatDate(notice.deadline)}`}
              </p>
              {notice.mandatory && !acknowledged && canAct && (
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={busy}
                  onClick={() =>
                    void run({
                      ops: [
                        upsert('noticeReads', {
                          id: uid('read'),
                          noticeId: notice.id,
                          studentId: student.id,
                          readOn: today(),
                        }),
                      ],
                    })
                  }
                >
                  <CheckCircle2 size={14} /> I have read this
                </Button>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}

function Calendar() {
  const { data, student } = useStudent()
  const events = academicCalendar(student, data).filter((event) => event.date >= today())
  const months = new Map<string, typeof events>()
  for (const event of events) {
    const month = new Date(`${event.date}T12:00:00`).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    })
    months.set(month, [...(months.get(month) ?? []), event])
  }
  return (
    <Card title="Coming up" description="Exams, deadlines, results and fee due dates that apply to you.">
      {events.length === 0 && <p className="text-sm text-slate-500">Nothing scheduled.</p>}
      <div className="space-y-6">
        {[...months.entries()].map(([month, items]) => (
          <section key={month}>
            <h3 className="text-sm font-semibold text-slate-900">{month}</h3>
            <ul className="mt-2 divide-y divide-slate-100">
              {items.map((event, index) => (
                <li key={`${event.date}-${index}`} className="flex items-start gap-3 py-2.5">
                  <span className="w-16 shrink-0 text-sm font-semibold text-slate-700">
                    {formatDate(event.date, { year: undefined })}
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-slate-700">{event.title}</span>
                  <StatusBadge
                    tone={
                      event.kind === 'Fee'
                        ? 'amber'
                        : event.kind === 'Exam'
                          ? 'blue'
                          : event.kind === 'Result'
                            ? 'green'
                            : 'slate'
                    }
                  >
                    {event.kind}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  )
}
