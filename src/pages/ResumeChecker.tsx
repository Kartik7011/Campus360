import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  FileText,
  Lightbulb,
  SearchCheck,
  Info,
  Loader2,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import type { Company, Opportunity, ResumeAnalysis, ResumeSample, Student } from '../types'
import { analyzeResume, getCompanyByOpportunity } from '../utils'
import { extractText, RESUME_ACCEPT, ResumeFileError } from '../resumeText'
import { findSkillEvidence } from '../semantic'
import { ProgressBar, SectionHeading, StatusBadge } from '../components/ui'

export function ResumeChecker({
  student,
  companies,
  opportunities,
  resumes,
  initialOpportunityId,
  onSaveResume,
  onAnalyzed,
}: {
  student: Student
  companies: Company[]
  opportunities: Opportunity[]
  resumes: ResumeSample[]
  initialOpportunityId?: string
  onSaveResume: (resume: ResumeSample, file: File) => void
  onAnalyzed?: (opportunityId: string, analysis: ResumeAnalysis) => void
}) {
  const studentResumes = resumes.filter((resume) => resume.studentId === student.id)
  const defaultOpportunity =
    initialOpportunityId && opportunities.some((opportunity) => opportunity.id === initialOpportunityId)
      ? initialOpportunityId
      : (opportunities[0]?.id ?? '')
  const [opportunityId, setOpportunityId] = useState(defaultOpportunity)
  const [resumeId, setResumeId] = useState(studentResumes[0]?.id ?? '')
  const [resumeText, setResumeText] = useState(studentResumes[0]?.text ?? '')
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)
  const [uploadStatus, setUploadStatus] = useState<{ busy: boolean; error: string }>({
    busy: false,
    error: '',
  })
  const [useSemantic, setUseSemantic] = useState(true)
  const [running, setRunning] = useState(false)
  const [semanticFailed, setSemanticFailed] = useState(false)
  // bumped whenever the inputs change, so a slow semantic run can't show a report for old inputs
  const runId = useRef(0)

  const opportunity = opportunities.find((item) => item.id === opportunityId) ?? opportunities[0]
  const company = opportunity ? getCompanyByOpportunity(opportunity, companies) : undefined

  const selectSample = (id: string) => {
    const resume = studentResumes.find((item) => item.id === id)
    if (!resume) return
    setResumeId(id)
    setResumeText(resume.text)
    resetReport()
  }

  const resetReport = () => {
    runId.current++
    setAnalysis(null)
    setRunning(false)
  }

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // lets the same file be chosen again after an error
    if (!file) return
    setUploadStatus({ busy: true, error: '' })
    try {
      const resume: ResumeSample = {
        id: `resume-${student.id}-${Date.now()}`,
        studentId: student.id,
        name: file.name,
        text: await extractText(file),
        updatedAt: new Date().toISOString().slice(0, 10),
      }
      onSaveResume(resume, file)
      setResumeId(resume.id)
      setResumeText(resume.text)
      resetReport()
      setUploadStatus({ busy: false, error: '' })
    } catch (error) {
      setUploadStatus({
        busy: false,
        error: error instanceof ResumeFileError ? error.message : 'This file could not be read.',
      })
    }
  }

  const runAnalysis = async () => {
    if (!opportunity || !resumeText.trim()) return
    const id = ++runId.current
    let evidence
    setSemanticFailed(false)
    if (useSemantic) {
      setRunning(true)
      try {
        evidence = await findSkillEvidence(resumeText, [
          ...opportunity.requiredSkills,
          ...opportunity.preferredSkills,
        ])
      } catch {
        setSemanticFailed(true) // offline or the model failed to load: fall back to exact matching
      }
    }
    if (id !== runId.current) return
    const result = analyzeResume(resumeText, opportunity, student, evidence)
    setRunning(false)
    setAnalysis(result)
    onAnalyzed?.(opportunity.id, result)
  }

  const groupedCategories = useMemo(() => analysis?.categories ?? [], [analysis])

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Compare a resume with one selected job description and get a match report with category-wise
            scores and suggestions.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 sm:self-auto">
          <Info size={15} /> Runs on this device
        </div>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-xs leading-5 text-amber-900">
            <span className="font-bold">Important:</span> this score measures resume-to-job-description
            alignment only. It is not a hiring prediction, official eligibility decision, or guarantee of an
            interview.
          </p>
        </div>
      </section>

      <section className="grid [&>*]:min-w-0 gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <SectionHeading
            title="1. Choose a role"
            description="The same resume can match differently against different openings."
          />
          <label htmlFor="resume-target" className="mt-5 block text-xs font-medium text-slate-500">
            Company / role
          </label>
          <div className="relative mt-2">
            <select
              id="resume-target"
              value={opportunityId}
              onChange={(event) => {
                setOpportunityId(event.target.value)
                resetReport()
              }}
              className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-10 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            >
              {opportunities.map((item) => {
                const itemCompany = getCompanyByOpportunity(item, companies)
                return (
                  <option key={item.id} value={item.id}>
                    {itemCompany?.name} · {item.title}
                  </option>
                )
              })}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
          </div>
          {opportunity && company && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white"
                  style={{ backgroundColor: company.accent }}
                >
                  {company.initials}
                </div>
                <div>
                  <p className="font-display font-bold text-slate-900">{opportunity.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {company.name} · {opportunity.package}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">{opportunity.jobDescription}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {opportunity.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-5">
            <label className="text-xs font-medium text-slate-500">2 · Choose resume</label>
            <div className="mt-3 space-y-2">
              {studentResumes.map((resume) => (
                <button
                  key={resume.id}
                  onClick={() => selectSample(resume.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${resumeId === resume.id ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200 hover:border-indigo-200'}`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${resumeId === resume.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}
                  >
                    <FileText size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800">{resume.name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Updated {resume.updatedAt}</p>
                  </div>
                  {resumeId === resume.id && <CheckCircle2 size={16} className="text-indigo-600" />}
                </button>
              ))}
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-xs font-bold text-slate-600 transition focus-within:ring-2 focus-within:ring-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700">
              {uploadStatus.busy ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
              {uploadStatus.busy ? 'Reading file…' : 'Upload a resume (PDF, DOCX or TXT, up to 2 MB)'}
              <input
                type="file"
                accept={RESUME_ACCEPT}
                className="sr-only"
                onChange={handleFile}
                disabled={uploadStatus.busy}
              />
            </label>
            {uploadStatus.error && (
              <p role="alert" className="mt-2 text-xs font-medium text-rose-700">
                {uploadStatus.error}
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 pt-5">
            <label htmlFor="resume-text" className="text-xs font-medium text-slate-500">
              3 · Review or paste text
            </label>
            <textarea
              id="resume-text"
              value={resumeText}
              onChange={(event) => {
                setResumeText(event.target.value)
                setResumeId('')
                resetReport()
              }}
              className="mt-3 min-h-[190px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Paste plain-text resume content here..."
            />
            <label className="mt-3 flex items-start gap-2.5 text-xs leading-5 text-slate-600">
              <input
                type="checkbox"
                checked={useSemantic}
                onChange={(event) => {
                  setUseSemantic(event.target.checked)
                  resetReport()
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-600"
              />
              <span>
                <span className="font-semibold text-slate-800">Match skills by meaning</span>, so “ReactJS”
                counts for React. Downloads a 23 MB model the first time; your resume stays on this device.
              </span>
            </label>
            <button
              disabled={!opportunity || !resumeText.trim() || running}
              onClick={runAnalysis}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {running ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Matching skills…
                </>
              ) : (
                <>
                  <SearchCheck size={17} /> {analysis ? 'Re-run match check' : 'Run match check'}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="min-w-0">
          {!analysis ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-card sm:min-h-[620px] sm:p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <FileCheck2 size={28} />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-slate-900">
                Your match report will appear here
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Select a target role, review the resume text, and run the checker to see category scores,
                strengths, and specific improvements.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <StatusBadge tone="blue">7 categories</StatusBadge>
                <StatusBadge tone="teal">Explainable</StatusBadge>
                <StatusBadge tone="purple">Private</StatusBadge>
              </div>
            </div>
          ) : (
            <AnalysisReport
              analysis={analysis}
              opportunity={opportunity}
              company={company}
              categories={groupedCategories}
              semanticFailed={semanticFailed}
            />
          )}
        </div>
      </section>
    </div>
  )
}

function AnalysisReport({
  analysis,
  opportunity,
  company,
  categories,
  semanticFailed,
}: {
  analysis: ResumeAnalysis
  opportunity?: Opportunity
  company?: Company
  categories: ResumeAnalysis['categories']
  semanticFailed: boolean
}) {
  return (
    <div className="space-y-5">
      {semanticFailed && (
        <p
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"
        >
          The meaning-based matcher couldn’t load (you may be offline), so this report uses exact keyword
          matching only.
        </p>
      )}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                Match report
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {analysis.scoringVersion === 'v2-semantic' ? 'Keywords + meaning' : 'Exact keywords'}
              </span>
              {company && (
                <span className="text-xs font-medium text-slate-500">
                  {company.name} · {opportunity?.title}
                </span>
              )}
            </div>
            <h3 className="mt-3 font-display text-xl font-semibold text-slate-950 sm:text-2xl">
              Resume-to-role alignment
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
              A transparent editing signal based on the text you submitted and the selected job description.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="score-ring flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#2558eb ${analysis.score * 3.6}deg, #dbe8fe 0)`,
              }}
            >
              <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white">
                <span className="font-display text-3xl font-semibold text-slate-950">{analysis.score}</span>
                <span className="text-xs font-medium text-slate-500">/ 100</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Overall signal</p>
              <p className="mt-1 text-sm font-semibold text-brand-700">
                {analysis.score >= 80
                  ? 'Strong alignment'
                  : analysis.score >= 60
                    ? 'Promising base'
                    : 'Needs tailoring'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
        <SectionHeading
          title="Score breakdown"
          description="Each category is a deterministic comparison, not a prediction."
        />
        <div className="mt-6 grid gap-x-8 gap-y-5 md:grid-cols-2">
          {categories.map((category) => (
            <div key={category.key}>
              <div className="flex items-end justify-between gap-3">
                <p className="text-sm font-bold text-slate-800">{category.label}</p>
                <span className="font-display text-lg font-bold text-slate-900">
                  {category.score}
                  <span className="text-xs text-slate-500">/100</span>
                </span>
              </div>
              <ProgressBar
                value={category.score}
                tone={category.score >= 75 ? 'teal' : category.score >= 55 ? 'indigo' : 'amber'}
                className="mt-2"
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">{category.note}</p>
            </div>
          ))}
        </div>
      </section>

      {analysis.semanticMatches.length > 0 && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-2 text-slate-800">
            <Sparkles size={18} className="text-indigo-600" />
            <h3 className="font-display font-bold">Skills matched by meaning</h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            These skills are not written word for word, but this phrase from your resume was close enough. Use
            the exact term too if it truthfully applies.
          </p>
          <ul className="mt-4 space-y-2">
            {analysis.semanticMatches.map((match) => (
              <li key={match.skill} className="flex flex-wrap items-baseline gap-x-2 text-sm text-slate-700">
                <span className="font-bold text-slate-900">{match.skill}</span>
                <span className="text-slate-500">←</span>
                <span>“{match.line}”</span>
                <span className="text-xs text-slate-500">similarity {match.similarity.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={18} />
            <h3 className="font-display font-bold">Strengths to keep</h3>
          </div>
          <div className="mt-4 space-y-3">
            {analysis.strengths.length ? (
              analysis.strengths.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm leading-6 text-emerald-950">
                  <CheckCircle2 size={15} className="mt-1 shrink-0 text-emerald-600" />
                  {item}
                </div>
              ))
            ) : (
              <p className="text-sm text-emerald-900/70">
                Run a little more tailoring and your strongest signals will become clearer.
              </p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-rose-100 bg-rose-50/60 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle size={18} />
            <h3 className="font-display font-bold">Weak or missing areas</h3>
          </div>
          <div className="mt-4 space-y-3">
            {analysis.weakAreas.length ? (
              analysis.weakAreas.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm leading-6 text-rose-950">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  {item}
                </div>
              ))
            ) : (
              <p className="text-sm text-rose-900/70">No major weak area was detected.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-indigo-700">
          <Lightbulb size={18} />
          <h3 className="font-display font-bold">Suggested edits</h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {analysis.suggestions.map((item, index) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-white/70 p-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-indigo-950">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
        <div className="flex items-start gap-2">
          <Info size={15} className="mt-0.5 shrink-0 text-brand-600" />
          <p>
            <span className="font-bold text-slate-800">Scope note:</span> This score only reflects alignment
            between the submitted resume text and the selected job description. It is not an official
            eligibility decision, hiring prediction, or replacement for a mentor / placement-cell review.
          </p>
        </div>
      </section>
    </div>
  )
}
