import { ExternalLink } from 'lucide-react'
import { Card } from './ui'
import { university } from '../university'

const resources = [
  ['Student grievance redressal', university.links.grievance],
  ['Academic calendar', university.links.academicCalendar],
  ['Policies and regulations', university.links.policies],
  ['Mental health and wellbeing', university.links.wellbeing],
  ['Existing GU student portal', university.links.studentPortal],
] as const

export function UniversityResources() {
  return (
    <Card title="Galgotias University resources" description="These links open university services in a new tab.">
      <ul className="grid gap-2 sm:grid-cols-2">
        {resources.map(([label, href]) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-brand-800 transition hover:border-brand-200 hover:bg-brand-50"
            >
              {label}<ExternalLink size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Formal student grievance contacts</p>
        <ul className="mt-2 space-y-1">
          {university.grievanceEmails.map((email) => (
            <li key={email}>
              <a className="break-all text-sm text-brand-700 underline underline-offset-2" href={`mailto:${email}`}>
                {email}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
