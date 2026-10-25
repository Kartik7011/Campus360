import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Academic } from './pages/Academic'
import { Dashboard } from './pages/Dashboard'
import { Exams } from './pages/Exams'
import { Fees } from './pages/Fees'
import { Help } from './pages/Help'
import { Notices } from './pages/Notices'
import { Placements } from './pages/Placements'
import { Profile, PrivacyConsent } from './pages/Profile'
import { Results } from './pages/Results'
import { ResumeChecker } from './pages/ResumeChecker'
import { Verify } from './pages/Verify'
import { LoginScreen } from './components/LoginScreen'
import { AppShell } from './components/Layout'
import { restoreRemoteSession, type Session } from './auth'
import { api, applyRemote, loadRemoteData } from './api'
import { seedData } from './data'
import { makePayment } from './domain/fees'
import { applyOps, type Op } from './ops'
import { policy } from './policy'
import { CampusContext, type Campus } from './store'
import { supabase } from './supabase'
import type { AppData, Payment, ResumeSample, UploadedFile, ViewKey } from './types'

export const STORAGE_KEY = 'campus360-data'
const SESSION_KEY = 'campus360-session'
const ACTIVE_KEY = 'campus360-last-active'
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
    return stored?.role === 'staff' ||
      stored?.role === 'parent' ||
      (stored?.role === 'student' && typeof stored.studentId === 'string')
      ? stored
      : null
  } catch {
    return null
  }
}

// students never load the staff workspace
const StaffPanel = lazy(() =>
  import('./pages/staff/StaffPanel').then((module) => ({ default: module.StaffPanel })),
)

const verifySerial = () => /^#\/verify\/([A-Z0-9-]+)$/i.exec(window.location.hash)?.[1] ?? null

export default function App() {
  const [serial, setSerial] = useState(verifySerial)
  useEffect(() => {
    const onHash = () => setSerial(verifySerial())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return serial ? <Verify serial={serial} data={remote ? null : loadAppData()} /> : <SignedInApp />
}

function SignedInApp() {
  const [data, setData] = useState<AppData | null>(() => (remote ? null : loadAppData()))
  const [session, setSession] = useState<Session | null>(() => (remote ? null : loadSession()))
  const [loading, setLoading] = useState(remote)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [activeView, setActiveView] = useState<ViewKey>('dashboard')
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | undefined>()

  const loadData = useCallback(() => {
    setLoading(true)
    setLoadError('')
    setSaveError('')
    loadRemoteData()
      .then(setData)
      .catch((error: Error) => setLoadError(error.message))
      .finally(() => setLoading(false))
  }, [])

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
  }, [session, loadData])

  useEffect(() => {
    if (!remote && data) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch {
        setSaveError('This browser’s storage is full, so recent changes may not survive a reload.')
      }
    }
  }, [data])

  useEffect(() => {
    if (remote) return
    if (session) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else window.sessionStorage.removeItem(SESSION_KEY)
  }, [session])

  const signOut = useCallback(() => {
    if (remote) {
      void supabase!.auth.signOut()
      setData(null)
    }
    setSession(null)
    setLoadError('')
    setActiveView('dashboard')
  }, [])

  // sign out after inactivity: 30 minutes for staff, 7 days for students (NFR-SEC-09)
  useEffect(() => {
    if (!session) return
    const limit =
      (session.role === 'staff' ? policy.sessionTimeoutMinutes.staff : policy.sessionTimeoutMinutes.student) *
      60_000
    const touch = () => window.localStorage.setItem(ACTIVE_KEY, String(Date.now()))
    const last = Number(window.localStorage.getItem(ACTIVE_KEY) ?? Date.now())
    if (Date.now() - last > limit) return signOut()
    touch()
    const events = ['pointerdown', 'keydown'] as const
    events.forEach((name) => window.addEventListener(name, touch))
    const timer = window.setInterval(() => {
      if (Date.now() - Number(window.localStorage.getItem(ACTIVE_KEY) ?? 0) > limit) signOut()
    }, 30_000)
    return () => {
      events.forEach((name) => window.removeEventListener(name, touch))
      window.clearInterval(timer)
    }
  }, [session, signOut])

  const staff =
    session?.role === 'staff' ? data?.staff.find((item) => item.id === session.staffId) : undefined
  const student =
    session && session.role !== 'staff'
      ? data?.students.find((item) => item.id === session.studentId)
      : undefined
  const actor = useMemo(
    () =>
      staff
        ? { name: staff.name, email: staff.email }
        : student
          ? { name: student.name, email: student.email }
          : { name: '', email: '' },
    [staff, student],
  )

  // Applies changes on screen at once; with a database, saves them and reloads if the server refused.
  const commit = useCallback(
    async (ops: Op[]) => {
      if (!ops.length) return true
      setData((current) => current && applyOps(current, ops, remote ? undefined : actor))
      if (!remote) return true
      try {
        await applyRemote(ops)
        return true
      } catch (error) {
        setSaveError((error as Error).message)
        loadRemoteData()
          .then(setData)
          .catch(() => undefined)
        return false
      }
    },
    [actor],
  )

  const pay = useCallback(
    async (chargeIds: string[], method: Payment['method'], idempotencyKey: string) => {
      if (!data || !student) return null
      if (!remote) {
        const result = makePayment({ studentId: student.id, chargeIds, method, idempotencyKey }, data)
        if (result.error) throw new Error(result.error)
        await commit(result.ops)
        return result.payment
      }
      const payment = await api.pay(chargeIds, method, idempotencyKey)
      setData((current) => current && applyOps(current, [{ type: 'upsert', key: 'payments', row: payment }]))
      return payment
    },
    [data, student, commit],
  )

  const upload = useCallback(
    async (file: File, bucket: 'documents' | 'exam-sheets' = 'documents'): Promise<UploadedFile> => {
      if (file.size > policy.maxUploadBytes) throw new Error(`${file.name} is larger than 5 MB.`)
      // browser-only mode keeps the file's name and size, not the file itself
      return remote ? api.upload(bucket, file) : { name: file.name, size: file.size, path: null }
    },
    [],
  )

  const openFile = useCallback((file: UploadedFile) => {
    if (file.path) void api.openFile(file.path).catch((error: Error) => setSaveError(error.message))
  }, [])

  const loadAuditLog = useCallback(
    () => (remote ? api.loadAuditLog() : Promise.resolve(data?.audit ?? [])),
    [data],
  )

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

  if (!session || !data || (session.role !== 'staff' && !student) || (session.role === 'staff' && !staff)) {
    return (
      <LoginScreen
        accounts={data ?? seedData}
        onLogin={(next) => {
          setSession(next)
          setActiveView(next.role === 'staff' ? 'admin' : next.role === 'parent' ? 'results' : 'dashboard')
        }}
      />
    )
  }

  const graduated = student?.status === 'Graduated'
  const campus: Campus = {
    data,
    session,
    actor,
    student,
    staff,
    canAct: session.role === 'student' && !graduated,
    remote,
    commit,
    pay,
    upload,
    openFile,
    navigate: setActiveView,
    loadAuditLog,
  }

  // students' first sign-in asks for the privacy notice to be accepted (NFR-PRV-01)
  const consent = student && data.consents.find((item) => item.studentId === student.id)
  if (session.role === 'student' && !consent?.privacyAcceptedOn)
    return (
      <CampusContext.Provider value={campus}>
        <PrivacyConsent onSignOut={signOut} />
      </CampusContext.Provider>
    )

  const views = allowedViews(session, graduated)
  const view: ViewKey = views.includes(activeView) ? activeView : views[0]

  const addResume = (resume: ResumeSample, file?: File) => {
    setData(
      (current) =>
        current &&
        applyOps(current, [{ type: 'upsert', key: 'resumes', row: resume }], remote ? undefined : actor),
    )
    if (remote) api.addResume(resume, file).catch((error: Error) => setSaveError(error.message))
  }

  const renderView = () => {
    if (session.role === 'staff')
      return (
        <Suspense fallback={<p className="text-sm text-slate-500">Loading workspace…</p>}>
          <StaffPanel />
        </Suspense>
      )
    const current = student!
    switch (view) {
      case 'academic':
        return <Academic />
      case 'results':
        return <Results />
      case 'exams':
        return <Exams />
      case 'fees':
        return <Fees />
      case 'notices':
        return <Notices />
      case 'placements':
        return <Placements onSelectOpportunity={setSelectedOpportunityId} />
      case 'help':
        return <Help />
      case 'profile':
        return <Profile />
      case 'resume':
        return (
          <ResumeChecker
            student={current}
            companies={data.companies}
            opportunities={data.opportunities}
            resumes={data.resumes}
            initialOpportunityId={selectedOpportunityId}
            onSaveResume={addResume}
            onAnalyzed={
              remote
                ? (opportunityId, analysis) =>
                    api
                      .saveResumeResult(current.id, opportunityId, analysis)
                      .catch((error: Error) => setSaveError(error.message))
                : undefined
            }
          />
        )
      case 'dashboard':
      default:
        return <Dashboard />
    }
  }

  const staleHours = student ? (Date.now() - new Date(student.syncedAt).getTime()) / 3_600_000 : 0

  return (
    <CampusContext.Provider value={campus}>
      <AppShell
        user={
          staff
            ? {
                name: staff.name,
                initials: initialsOf(staff.name),
                subtitle: staffTitles[staff.role],
                isAdmin: true,
              }
            : {
                name: session.role === 'parent' ? `Parent of ${student!.name}` : student!.name,
                initials: student!.initials,
                subtitle: `Sem ${student!.semester} · ${student!.branch.replace(' & Engineering', '')}`,
                isAdmin: false,
              }
        }
        views={views}
        activeView={view}
        onNavigate={setActiveView}
        onLogout={signOut}
        remote={remote}
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
              onClick={remote ? loadData : () => setSaveError('')}
              className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
            >
              <RefreshCw size={14} /> {remote ? 'Reload saved data' : 'Dismiss'}
            </button>
          </div>
        )}
        {student && staleHours > policy.staleSyncHours && (
          <p
            role="status"
            className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
          >
            Records were last synced from the university ERP {Math.floor(staleHours / 24)} day(s) ago, so some
            values may be out of date.
          </p>
        )}
        {renderView()}
      </AppShell>
    </CampusContext.Provider>
  )
}

export const staffTitles: Record<string, string> = {
  admin: 'IT administrator',
  exam: 'Exam cell',
  accounts: 'Accounts office',
  placement: 'Placement cell',
  mentor: 'Faculty mentor',
  hod: 'Head of Department',
  dean: 'School Dean',
  registrar: 'Registrar',
}

const initialsOf = (name: string) =>
  name
    .replace(/^(Dr\.|Prof\.)\s*/g, '')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

function allowedViews(session: Session, graduated: boolean): ViewKey[] {
  if (session.role === 'staff') return ['admin']
  if (session.role === 'parent') return ['results', 'academic', 'exams', 'fees', 'notices']
  // graduates keep their documents and fee records (FR-DOC-07)
  if (graduated) return ['results', 'fees', 'help', 'profile']
  return [
    'dashboard',
    'academic',
    'results',
    'exams',
    'fees',
    'notices',
    'placements',
    'resume',
    'help',
    'profile',
  ]
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
