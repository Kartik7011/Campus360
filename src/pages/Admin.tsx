import { useEffect, useState } from 'react'
import {
  Activity,
  BellRing,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Edit3,
  Plus,
  Save,
  Settings2,
  Trash2,
  UsersRound,
} from 'lucide-react'
import type {
  Company,
  Notice,
  NoticeCategory,
  Opportunity,
  PlacementApplication,
  PlacementStage,
  Student,
} from '../types'
import { formatDate, getCompanyByOpportunity } from '../utils'
import { InitialsAvatar, Modal, SectionHeading, StatusBadge } from '../components/ui'

type AdminTab = 'students' | 'notices' | 'opportunities' | 'stages'

interface AdminProps {
  students: Student[]
  notices: Notice[]
  companies: Company[]
  opportunities: Opportunity[]
  applications: PlacementApplication[]
  onUpdateStudent: (id: string, patch: Partial<Student>) => void
  onAddNotice: (notice: Notice) => void
  onRemoveNotice: (id: string) => void
  onAddOpportunity: (opportunity: Opportunity) => void
  onUpdateStage: (applicationId: string, stage: PlacementStage) => void
}

const stages: PlacementStage[] = ['Applied', 'Aptitude', 'Technical', 'HR', 'Selected', 'Rejected']

export function Admin({
  students,
  notices,
  companies,
  opportunities,
  applications,
  onUpdateStudent,
  onAddNotice,
  onRemoveNotice,
  onAddOpportunity,
  onUpdateStage,
}: AdminProps) {
  const [tab, setTab] = useState<AdminTab>('students')
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [showNoticeForm, setShowNoticeForm] = useState(false)
  const [showOpportunityForm, setShowOpportunityForm] = useState(false)
  const [noticeDraft, setNoticeDraft] = useState({
    title: '',
    category: 'Academic' as NoticeCategory,
    priority: 'Medium' as Notice['priority'],
    summary: '',
    deadline: '',
  })
  const [opportunityDraft, setOpportunityDraft] = useState({
    companyId: companies[0]?.id ?? '',
    title: '',
    location: 'Campus / India',
    deadline: '',
    minCgpa: '7.50',
    maxBacklogs: '0',
    branches: 'Computer Science & Engineering',
    requiredSkills: 'Communication, Problem Solving',
    description: '',
  })

  const tabs = [
    { key: 'students' as const, label: 'Student records', icon: UsersRound },
    { key: 'notices' as const, label: 'Notices', icon: BellRing },
    { key: 'opportunities' as const, label: 'Opportunities', icon: BriefcaseBusiness },
    { key: 'stages' as const, label: 'Placement stages', icon: Activity },
  ]

  const saveNotice = () => {
    if (!noticeDraft.title.trim() || !noticeDraft.summary.trim()) return
    onAddNotice({
      id: `notice-admin-${Date.now()}`,
      title: noticeDraft.title.trim(),
      category: noticeDraft.category,
      priority: noticeDraft.priority,
      summary: noticeDraft.summary.trim(),
      date: '2026-10-08',
      deadline: noticeDraft.deadline || undefined,
      audience: 'All students',
      source: 'Admin panel',
    })
    setNoticeDraft({ title: '', category: 'Academic', priority: 'Medium', summary: '', deadline: '' })
    setShowNoticeForm(false)
  }

  const saveOpportunity = () => {
    if (!opportunityDraft.title.trim() || !opportunityDraft.description.trim()) return
    onAddOpportunity({
      id: `opp-admin-${Date.now()}`,
      companyId: opportunityDraft.companyId,
      title: opportunityDraft.title.trim(),
      location: opportunityDraft.location.trim() || 'Campus / India',
      workMode: 'On-site',
      deadline: opportunityDraft.deadline || '2026-10-31',
      posted: '2026-10-08',
      minCgpa: Number(opportunityDraft.minCgpa) || null,
      allowedBranches: opportunityDraft.branches
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      maxActiveBacklogs: opportunityDraft.maxBacklogs === '' ? null : Number(opportunityDraft.maxBacklogs),
      requiredSkills: opportunityDraft.requiredSkills
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      preferredSkills: [],
      jobDescription: opportunityDraft.description.trim(),
      package: 'To be announced',
      jobType: 'Full-time',
      status: 'Open',
    })
    setOpportunityDraft({
      companyId: companies[0]?.id ?? '',
      title: '',
      location: 'Campus / India',
      deadline: '',
      minCgpa: '7.50',
      maxBacklogs: '0',
      branches: 'Computer Science & Engineering',
      requiredSkills: 'Communication, Problem Solving',
      description: '',
    })
    setShowOpportunityForm(false)
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Edit student records, add notices or opportunities, and move applications through stages. Changes
            persist in this browser.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 sm:self-auto">
          <Settings2 size={15} /> Admin controls
        </div>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
        <p className="text-xs leading-5 text-amber-900">
          <span className="font-bold">Note:</span> changes are saved in this browser only. This panel is not
          yet connected to the university student information system or placement portal.
        </p>
      </section>

      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:px-4 ${tab === key ? 'bg-ink text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'students' && <StudentManager students={students} onEdit={setEditStudent} />}
      {tab === 'notices' && (
        <NoticeManager notices={notices} onAdd={() => setShowNoticeForm(true)} onRemove={onRemoveNotice} />
      )}
      {tab === 'opportunities' && (
        <>
          <OpportunityManager
            opportunities={opportunities}
            companies={companies}
            onAdd={() => setShowOpportunityForm(true)}
          />
          <CompanyManager companies={companies} opportunities={opportunities} />
        </>
      )}
      {tab === 'stages' && (
        <StageManager
          applications={applications}
          opportunities={opportunities}
          companies={companies}
          onUpdateStage={onUpdateStage}
        />
      )}

      <StudentEditModal
        student={editStudent}
        onClose={() => setEditStudent(null)}
        onSave={(patch) => {
          if (editStudent) onUpdateStudent(editStudent.id, patch)
          setEditStudent(null)
        }}
      />
      <Modal
        open={showNoticeForm}
        title="Add a notice"
        description="Create a concise notice that will appear in the student workspace."
        onClose={() => setShowNoticeForm(false)}
      >
        <div className="space-y-4">
          <Field label="Title">
            <input
              value={noticeDraft.title}
              onChange={(event) => setNoticeDraft({ ...noticeDraft, title: event.target.value })}
              className="form-input"
              placeholder="e.g. Department orientation schedule"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select
                value={noticeDraft.category}
                onChange={(event) =>
                  setNoticeDraft({ ...noticeDraft, category: event.target.value as NoticeCategory })
                }
                className="form-input"
              >
                <option>Academic</option>
                <option>Placement</option>
                <option>Rechecking</option>
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={noticeDraft.priority}
                onChange={(event) =>
                  setNoticeDraft({ ...noticeDraft, priority: event.target.value as Notice['priority'] })
                }
                className="form-input"
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </Field>
          </div>
          <Field label="Deadline (optional)">
            <input
              type="date"
              value={noticeDraft.deadline}
              onChange={(event) => setNoticeDraft({ ...noticeDraft, deadline: event.target.value })}
              className="form-input"
            />
          </Field>
          <Field label="Summary">
            <textarea
              value={noticeDraft.summary}
              onChange={(event) => setNoticeDraft({ ...noticeDraft, summary: event.target.value })}
              className="form-input min-h-[110px]"
              placeholder="What should students know or do?"
            />
          </Field>
          <button
            onClick={saveNotice}
            disabled={!noticeDraft.title.trim() || !noticeDraft.summary.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={16} /> Save notice
          </button>
        </div>
      </Modal>
      <Modal
        open={showOpportunityForm}
        title="Add an opportunity"
        description="Seed a simple opening so the eligibility engine can explain it to students."
        onClose={() => setShowOpportunityForm(false)}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company">
            <select
              value={opportunityDraft.companyId}
              onChange={(event) =>
                setOpportunityDraft({ ...opportunityDraft, companyId: event.target.value })
              }
              className="form-input"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Role title">
            <input
              value={opportunityDraft.title}
              onChange={(event) => setOpportunityDraft({ ...opportunityDraft, title: event.target.value })}
              className="form-input"
              placeholder="e.g. QA Automation Intern"
            />
          </Field>
          <Field label="Location">
            <input
              value={opportunityDraft.location}
              onChange={(event) => setOpportunityDraft({ ...opportunityDraft, location: event.target.value })}
              className="form-input"
            />
          </Field>
          <Field label="Deadline">
            <input
              type="date"
              value={opportunityDraft.deadline}
              onChange={(event) => setOpportunityDraft({ ...opportunityDraft, deadline: event.target.value })}
              className="form-input"
            />
          </Field>
          <Field label="Minimum CGPA">
            <input
              value={opportunityDraft.minCgpa}
              onChange={(event) => setOpportunityDraft({ ...opportunityDraft, minCgpa: event.target.value })}
              className="form-input"
              inputMode="decimal"
            />
          </Field>
          <Field label="Max active backlogs">
            <input
              value={opportunityDraft.maxBacklogs}
              onChange={(event) =>
                setOpportunityDraft({ ...opportunityDraft, maxBacklogs: event.target.value })
              }
              className="form-input"
              inputMode="numeric"
            />
          </Field>
          <Field label="Allowed branches (comma-separated)" wide>
            <input
              value={opportunityDraft.branches}
              onChange={(event) => setOpportunityDraft({ ...opportunityDraft, branches: event.target.value })}
              className="form-input"
            />
          </Field>
          <Field label="Required skills (comma-separated)" wide>
            <input
              value={opportunityDraft.requiredSkills}
              onChange={(event) =>
                setOpportunityDraft({ ...opportunityDraft, requiredSkills: event.target.value })
              }
              className="form-input"
            />
          </Field>
          <Field label="Job description" wide>
            <textarea
              value={opportunityDraft.description}
              onChange={(event) =>
                setOpportunityDraft({ ...opportunityDraft, description: event.target.value })
              }
              className="form-input min-h-[130px]"
              placeholder="What will this student work on?"
            />
          </Field>
        </div>
        <button
          onClick={saveOpportunity}
          disabled={!opportunityDraft.title.trim() || !opportunityDraft.description.trim()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={16} /> Save opportunity
        </button>
      </Modal>
    </div>
  )
}

function StudentManager({ students, onEdit }: { students: Student[]; onEdit: (student: Student) => void }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
      <SectionHeading
        title="Students"
        description="Edit the fields used by the academic summary and rule-based eligibility checks."
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {students.map((student) => (
          <div key={student.id} className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <InitialsAvatar
                  initials={student.initials}
                  size="md"
                  tone={student.id === 'kartik' ? 'indigo' : 'teal'}
                />
                <div>
                  <p className="font-display font-bold text-slate-900">{student.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{student.branch}</p>
                </div>
              </div>
              <button
                onClick={() => onEdit(student)}
                className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
                aria-label={`Edit ${student.name}`}
              >
                <Edit3 size={16} />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              <InfoCell label="CGPA" value={student.cgpa?.toFixed(2) ?? 'Unknown'} />
              <InfoCell label="Semester" value={`S${student.semester}`} />
              <InfoCell label="Backlogs" value={String(student.activeBacklogs ?? 'Unknown')} />
              <InfoCell
                label="Debarment"
                value={student.debarred === null ? 'Unknown' : student.debarred ? 'Yes' : 'Clear'}
              />
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <CalendarDays size={14} /> Graduation year {student.graduationYear ?? 'not available'}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function NoticeManager({
  notices,
  onAdd,
  onRemove,
}: {
  notices: Notice[]
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
      <SectionHeading
        title="Published notices"
        description="Add a new update or remove one from the student view."
        action={
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            <Plus size={15} /> Add notice
          </button>
        }
      />
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] text-slate-500">
              <th className="pb-3 pr-4">Notice</th>
              <th className="pb-3 pr-4">Category</th>
              <th className="pb-3 pr-4">Priority</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {notices.map((notice) => (
              <tr key={notice.id}>
                <td className="py-4 pr-4">
                  <p className="text-sm font-bold text-slate-800">{notice.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {notice.deadline ? `Deadline ${formatDate(notice.deadline)}` : 'No deadline'}
                  </p>
                </td>
                <td className="py-4 pr-4">
                  <StatusBadge tone="blue">{notice.category}</StatusBadge>
                </td>
                <td className="py-4 pr-4">
                  <StatusBadge tone={notice.priority === 'High' ? 'red' : 'amber'}>
                    {notice.priority}
                  </StatusBadge>
                </td>
                <td className="py-4">
                  <button
                    onClick={() => onRemove(notice.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function OpportunityManager({
  opportunities,
  companies,
  onAdd,
}: {
  opportunities: Opportunity[]
  companies: Company[]
  onAdd: () => void
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
      <SectionHeading
        title="Placement openings"
        description="Review the rule inputs that students see in the placement hub."
        action={
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            <Plus size={15} /> Add opportunity
          </button>
        }
      />
      <div className="mt-5 grid gap-3">
        {opportunities.map((opportunity) => {
          const company = getCompanyByOpportunity(opportunity, companies)
          return (
            <div
              key={opportunity.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white"
                  style={{ backgroundColor: company?.accent ?? '#64748b' }}
                >
                  {company?.initials ?? '—'}
                </div>
                <div>
                  <p className="font-display font-bold text-slate-900">{opportunity.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {company?.name} · deadline {formatDate(opportunity.deadline)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  CGPA ≥ {opportunity.minCgpa ?? '—'}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  Backlogs ≤ {opportunity.maxActiveBacklogs ?? '—'}
                </span>
                <StatusBadge tone={opportunity.status === 'Closing soon' ? 'amber' : 'green'}>
                  {opportunity.status}
                </StatusBadge>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function CompanyManager({
  companies,
  opportunities,
}: {
  companies: Company[]
  opportunities: Opportunity[]
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
      <SectionHeading
        title="Employers"
        description="The companies below are the source records used by the opportunity cards and resume checker."
      />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {companies.map((company) => {
          const count = opportunities.filter((opportunity) => opportunity.companyId === company.id).length
          return (
            <div key={company.id} className="rounded-2xl border border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white"
                  style={{ backgroundColor: company.accent }}
                >
                  {company.initials}
                </div>
                <div>
                  <p className="font-display font-bold text-slate-900">{company.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{company.sector}</p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">{company.description}</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-500">{company.location}</span>
                <span className="font-bold text-indigo-600">
                  {count} opening{count === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function StageManager({
  applications,
  opportunities,
  companies,
  onUpdateStage,
}: {
  applications: PlacementApplication[]
  opportunities: Opportunity[]
  companies: Company[]
  onUpdateStage: (id: string, stage: PlacementStage) => void
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
      <SectionHeading
        title="Update application stages"
        description="Move applications through the pipeline so the student tracker stays current."
      />
      <div className="mt-5 space-y-3">
        {applications.map((application) => {
          const opportunity = opportunities.find((item) => item.id === application.opportunityId)
          const company = opportunity ? getCompanyByOpportunity(opportunity, companies) : undefined
          const studentLabel = application.studentId === 'kartik' ? 'Kartik Chauhan' : 'Shreyansh Pandey'
          return (
            <div
              key={application.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display font-bold text-slate-900">
                    {opportunity?.title ?? 'Unknown opportunity'}
                  </p>
                  <span className="text-xs text-slate-500">·</span>
                  <p className="text-xs font-semibold text-slate-500">{company?.name}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {studentLabel} · applied {formatDate(application.appliedOn)}
                </p>
              </div>
              <div className="relative">
                <select
                  value={application.stage}
                  onChange={(event) => onUpdateStage(application.id, event.target.value as PlacementStage)}
                  className="form-input min-w-[150px] appearance-none pr-9 text-xs font-bold"
                >
                  <option>Applied</option>
                  <option>Aptitude</option>
                  <option>Technical</option>
                  <option>HR</option>
                  <option>Selected</option>
                  <option>Rejected</option>
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function StudentEditModal({
  student,
  onClose,
  onSave,
}: {
  student: Student | null
  onClose: () => void
  onSave: (patch: Partial<Student>) => void
}) {
  const [form, setForm] = useState<Student | null>(student)
  useEffect(() => setForm(student), [student])
  return (
    <Modal
      open={Boolean(student)}
      title={student ? `Edit ${student.name}` : 'Edit student'}
      description="These values drive the academic snapshot and eligibility explanations."
      onClose={onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {form && (
          <>
            <Field label="CGPA">
              <input
                type="number"
                step="0.01"
                value={form.cgpa ?? ''}
                onChange={(event) =>
                  setForm({ ...form, cgpa: event.target.value === '' ? null : Number(event.target.value) })
                }
                className="form-input"
              />
            </Field>
            <Field label="Semester">
              <input
                type="number"
                value={form.semester}
                onChange={(event) => setForm({ ...form, semester: Number(event.target.value) })}
                className="form-input"
              />
            </Field>
            <Field label="Branch">
              <input
                value={form.branch}
                onChange={(event) => setForm({ ...form, branch: event.target.value })}
                className="form-input"
              />
            </Field>
            <Field label="Active backlogs">
              <input
                type="number"
                min="0"
                value={form.activeBacklogs ?? ''}
                onChange={(event) =>
                  setForm({
                    ...form,
                    activeBacklogs: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
                className="form-input"
              />
            </Field>
            <Field label="Graduation year">
              <input
                type="number"
                value={form.graduationYear ?? ''}
                onChange={(event) =>
                  setForm({
                    ...form,
                    graduationYear: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
                className="form-input"
              />
            </Field>
            <Field label="Debarment status">
              <select
                value={form.debarred === null ? 'unknown' : form.debarred ? 'yes' : 'no'}
                onChange={(event) =>
                  setForm({
                    ...form,
                    debarred: event.target.value === 'unknown' ? null : event.target.value === 'yes',
                  })
                }
                className="form-input"
              >
                <option value="no">Clear</option>
                <option value="yes">Debarred</option>
                <option value="unknown">Unknown</option>
              </select>
            </Field>
          </>
        )}
      </div>
      <button
        onClick={() =>
          form &&
          onSave({
            cgpa: form.cgpa,
            semester: form.semester,
            branch: form.branch,
            activeBacklogs: form.activeBacklogs,
            graduationYear: form.graduationYear,
            debarred: form.debarred,
          })
        }
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
      >
        <Check size={16} /> Save student record
      </button>
    </Modal>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  )
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  )
}
