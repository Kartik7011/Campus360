import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Academic } from './pages/Academic'
import { Admin } from './pages/Admin'
import { Dashboard } from './pages/Dashboard'
import { Notices } from './pages/Notices'
import { Placements } from './pages/Placements'
import { ResumeChecker } from './pages/ResumeChecker'
import { LoginScreen } from './components/LoginScreen'
import { AppShell } from './components/Layout'
import { restoreRemoteSession, type Session } from './auth'
import { api, loadRemoteData } from './api'
import { seedData } from './data'
import { supabase } from './supabase'
import type {
  AppData,
  Notice,
  Opportunity,
  PlacementStage,
  RecheckRequest,
  ResumeSample,
  Student,
  ViewKey,
} from './types'

export const STORAGE_KEY = 'campus360-data'
const SESSION_KEY = 'campus360-session'
// with a database configured, data and sign-in live on the server; otherwise in this browser
const remote = supabase !== null

export function loadAppData(): AppData {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return seedData
    const parsed = JSON.parse(stored) as AppData
    if (parsed.version !== seedData.version || !parsed.students || !parsed.opportunities || !parsed.notices)
      return seedData
    return parsed
  } catch {
    return seedData
  }
}

// Keeps the user signed in across reloads of this tab only.
function loadSession(): Session | null {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? 'null')
    return stored?.role === 'admin' || (stored?.role === 'student' && typeof stored.studentId === 'string')
      ? stored
      : null
  } catch {
    return null
  }
}

export default function App() {
  const [data, setData] = useState<AppData | null>(() => (remote ? null : loadAppData()))
  const [session, setSession] = useState<Session | null>(() => (remote ? null : loadSession()))
  const [loading, setLoading] = useState(remote)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [activeView, setActiveView] = useState<ViewKey>('dashboard')
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | undefined>()

  const loadData = () => {
    setLoading(true)
    setLoadError('')
    setSaveError('')
    loadRemoteData()
      .then(setData)
      .catch((error: Error) => setLoadError(error.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!remote) return
    restoreRemoteSession()
      .then((restored) => (restored ? setSession(restored) : setLoading(false)))
      .catch((error: Error) => {
        setLoadError(error.message)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (remote && session) loadData()
  }, [session])

  useEffect(() => {
    if (!remote && data) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    if (remote) return
    if (session) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else window.sessionStorage.removeItem(SESSION_KEY)
  }, [session])

  const signOut = () => {
    if (remote) {
      void supabase!.auth.signOut()
      setData(null)
    }
    setSession(null)
    setLoadError('')
    setActiveView('dashboard')
  }

  if (loading) return <FullPageMessage title="Loading your workspace…" busy />
  if (loadError)
    return (
      <FullPageMessage
        title="We couldn’t load your data"
        detail={loadError}
        onRetry={session ? loadData : () => window.location.reload()}
        onSignOut={signOut}
      />
    )

  const currentStudent =
    session?.role === 'student'
      ? data?.students.find((student) => student.id === session.studentId)
      : undefined

  if (!session || !data || (session.role === 'student' && !currentStudent)) {
    return (
      <LoginScreen
        students={data?.students ?? []}
        onLogin={(next) => {
          setSession(next)
          setActiveView(next.role === 'admin' ? 'admin' : 'dashboard')
        }}
      />
    )
  }
  // students never reach the admin view, and the admin only has the admin view
  const view: ViewKey = !currentStudent ? 'admin' : activeView === 'admin' ? 'dashboard' : activeView

  // Updates the screen at once; with a database, also saves and reports a failed save.
  const change = (update: (current: AppData) => AppData, save: () => Promise<void>) => {
    setData((current) => current && update(current))
    if (remote) save().catch((error: Error) => setSaveError(error.message))
  }

  const updateStudent = (id: string, patch: Partial<Student>) =>
    change(
      (current) => ({
        ...current,
        students: current.students.map((student) => (student.id === id ? { ...student, ...patch } : student)),
      }),
      () => api.updateStudent(id, patch),
    )
  const addNotice = (notice: Notice) =>
    change(
      (current) => ({ ...current, notices: [notice, ...current.notices] }),
      () => api.addNotice(notice),
    )
  const removeNotice = (id: string) =>
    change(
      (current) => ({ ...current, notices: current.notices.filter((notice) => notice.id !== id) }),
      () => api.removeNotice(id),
    )
  const addOpportunity = (opportunity: Opportunity) =>
    change(
      (current) => ({ ...current, opportunities: [opportunity, ...current.opportunities] }),
      () => api.addOpportunity(opportunity),
    )
  const updateStage = (applicationId: string, stage: PlacementStage) =>
    change(
      (current) => ({
        ...current,
        applications: current.applications.map((application) =>
          application.id === applicationId ? { ...application, stage } : application,
        ),
      }),
      () => api.updateStage(applicationId, stage),
    )
  const addRecheck = (request: RecheckRequest) =>
    change(
      (current) => ({ ...current, rechecks: [request, ...current.rechecks] }),
      () => api.addRecheck(request),
    )
  const updateRecheck = (id: string, patch: Partial<RecheckRequest>) =>
    change(
      (current) => ({
        ...current,
        rechecks: current.rechecks.map((request) => (request.id === id ? { ...request, ...patch } : request)),
      }),
      () => api.updateRecheck(id, patch),
    )
  const addResume = (resume: ResumeSample, file?: File) =>
    change(
      (current) => ({ ...current, resumes: [resume, ...current.resumes] }),
      () => api.addResume(resume, file),
    )

  const renderView = () => {
    if (!currentStudent) {
      return (
        <Admin
          students={data.students}
          notices={data.notices}
          companies={data.companies}
          opportunities={data.opportunities}
          applications={data.applications}
          rechecks={data.rechecks}
          loadAuditLog={remote ? api.loadAuditLog : undefined}
          onUpdateStudent={updateStudent}
          onAddNotice={addNotice}
          onRemoveNotice={removeNotice}
          onAddOpportunity={addOpportunity}
          onUpdateStage={updateStage}
          onUpdateRecheck={updateRecheck}
        />
      )
    }
    switch (view) {
      case 'academic':
        return (
          <Academic
            student={currentStudent}
            mentor={data.mentor}
            rechecks={data.rechecks}
            onAddRecheck={addRecheck}
            onNavigate={setActiveView}
          />
        )
      case 'notices':
        return <Notices notices={data.notices} />
      case 'placements':
        return (
          <Placements
            student={currentStudent}
            companies={data.companies}
            opportunities={data.opportunities}
            applications={data.applications}
            onNavigate={setActiveView}
            onSelectOpportunity={setSelectedOpportunityId}
          />
        )
      case 'resume':
        return (
          <ResumeChecker
            student={currentStudent}
            companies={data.companies}
            opportunities={data.opportunities}
            resumes={data.resumes}
            initialOpportunityId={selectedOpportunityId}
            onSaveResume={addResume}
            onAnalyzed={
              remote
                ? (opportunityId, analysis) =>
                    api
                      .saveResumeResult(currentStudent.id, opportunityId, analysis)
                      .catch((error: Error) => setSaveError(error.message))
                : undefined
            }
          />
        )
      case 'dashboard':
      default:
        return (
          <Dashboard
            student={currentStudent}
            mentor={data.mentor}
            notices={data.notices}
            opportunities={data.opportunities}
            companies={data.companies}
            applications={data.applications}
            onNavigate={setActiveView}
          />
        )
    }
  }

  return (
    <AppShell
      user={
        currentStudent
          ? {
              name: currentStudent.name,
              initials: currentStudent.initials,
              subtitle: `Sem ${currentStudent.semester} · ${currentStudent.branch.replace(' & Engineering', '')}`,
              isAdmin: false,
            }
          : { name: 'Placement office', initials: 'PO', subtitle: 'Administrator', isAdmin: true }
      }
      activeView={view}
      onNavigate={setActiveView}
      onLogout={signOut}
    >
      {saveError && (
        <div
          role="alert"
          className="mb-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-rose-600" />
            <span>
              <span className="font-semibold">Your last change was not saved.</span> {saveError}
            </span>
          </p>
          <button
            onClick={loadData}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
          >
            <RefreshCw size={14} /> Reload saved data
          </button>
        </div>
      )}
      {renderView()}
    </AppShell>
  )
}

function FullPageMessage({
  title,
  detail,
  busy,
  onRetry,
  onSignOut,
}: {
  title: string
  detail?: string
  busy?: boolean
  onRetry?: () => void
  onSignOut?: () => void
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="w-full max-w-sm text-center" role={busy ? 'status' : 'alert'}>
        {busy ? (
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
        ) : (
          <AlertTriangle size={32} className="mx-auto text-rose-500" />
        )}
        <h1 className="mt-4 font-display text-lg font-semibold text-slate-900">{title}</h1>
        {detail && <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>}
        {(onRetry || onSignOut) && (
          <div className="mt-5 flex justify-center gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
              >
                <RefreshCw size={15} /> Try again
              </button>
            )}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-white"
              >
                Sign out
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
