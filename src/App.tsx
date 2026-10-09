import { useEffect, useState } from 'react'
import { Academic } from './pages/Academic'
import { Admin } from './pages/Admin'
import { Dashboard } from './pages/Dashboard'
import { Notices } from './pages/Notices'
import { Placements } from './pages/Placements'
import { ResumeChecker } from './pages/ResumeChecker'
import { LoginScreen } from './components/LoginScreen'
import { AppShell } from './components/Layout'
import type { Session } from './auth'
import { seedData } from './data'
import type { AppData, Notice, Opportunity, PlacementStage, Student, ViewKey } from './types'

export const STORAGE_KEY = 'campus360-data'
const SESSION_KEY = 'campus360-session'

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
  const [data, setData] = useState<AppData>(() => loadAppData())
  const [session, setSession] = useState<Session | null>(() => loadSession())
  const [activeView, setActiveView] = useState<ViewKey>('dashboard')
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | undefined>()

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    if (session) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else window.sessionStorage.removeItem(SESSION_KEY)
  }, [session])

  const currentStudent =
    session?.role === 'student'
      ? data.students.find((student) => student.id === session.studentId)
      : undefined

  if (!session || (session.role === 'student' && !currentStudent)) {
    return (
      <LoginScreen
        students={data.students}
        onLogin={(next) => {
          setSession(next)
          setActiveView(next.role === 'admin' ? 'admin' : 'dashboard')
        }}
      />
    )
  }
  // students never reach the admin view, and the admin only has the admin view
  const view: ViewKey = !currentStudent ? 'admin' : activeView === 'admin' ? 'dashboard' : activeView

  const updateStudent = (id: string, patch: Partial<Student>) => {
    setData((current) => ({
      ...current,
      students: current.students.map((student) => (student.id === id ? { ...student, ...patch } : student)),
    }))
  }

  const addNotice = (notice: Notice) =>
    setData((current) => ({ ...current, notices: [notice, ...current.notices] }))
  const removeNotice = (id: string) =>
    setData((current) => ({ ...current, notices: current.notices.filter((notice) => notice.id !== id) }))
  const addOpportunity = (opportunity: Opportunity) =>
    setData((current) => ({ ...current, opportunities: [opportunity, ...current.opportunities] }))
  const updateStage = (applicationId: string, stage: PlacementStage) =>
    setData((current) => ({
      ...current,
      applications: current.applications.map((application) =>
        application.id === applicationId ? { ...application, stage } : application,
      ),
    }))

  const renderView = () => {
    if (!currentStudent) {
      return (
        <Admin
          students={data.students}
          notices={data.notices}
          companies={data.companies}
          opportunities={data.opportunities}
          applications={data.applications}
          onUpdateStudent={updateStudent}
          onAddNotice={addNotice}
          onRemoveNotice={removeNotice}
          onAddOpportunity={addOpportunity}
          onUpdateStage={updateStage}
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
      onLogout={() => {
        setSession(null)
        setActiveView('dashboard')
      }}
    >
      {renderView()}
    </AppShell>
  )
}
