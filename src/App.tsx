import { useEffect, useState } from 'react'
import { Academic } from './pages/Academic'
import { Admin } from './pages/Admin'
import { Dashboard } from './pages/Dashboard'
import { Notices } from './pages/Notices'
import { Placements } from './pages/Placements'
import { ResumeChecker } from './pages/ResumeChecker'
import { LoginScreen } from './components/LoginScreen'
import { AppShell } from './components/Layout'
import { seedData } from './data'
import type { DemoData, Notice, Opportunity, PlacementStage, Student, ViewKey } from './types'

const STORAGE_KEY = 'campus360-demo-data-v1'

function loadDemoData(): DemoData {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return seedData
    const parsed = JSON.parse(stored) as DemoData
    if (!parsed.students || !parsed.opportunities || !parsed.notices) return seedData
    return parsed
  } catch {
    return seedData
  }
}

export default function App() {
  const [data, setData] = useState<DemoData>(() => loadDemoData())
  const [studentId, setStudentId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<ViewKey>('dashboard')
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | undefined>()

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const currentStudent = data.students.find((student) => student.id === studentId)

  if (!currentStudent) {
    return <LoginScreen students={data.students} onLogin={(id) => { setStudentId(id); setActiveView('dashboard') }} />
  }

  const updateStudent = (id: string, patch: Partial<Student>) => {
    setData((current) => ({ ...current, students: current.students.map((student) => student.id === id ? { ...student, ...patch } : student) }))
  }

  const addNotice = (notice: Notice) => setData((current) => ({ ...current, notices: [notice, ...current.notices] }))
  const removeNotice = (id: string) => setData((current) => ({ ...current, notices: current.notices.filter((notice) => notice.id !== id) }))
  const addOpportunity = (opportunity: Opportunity) => setData((current) => ({ ...current, opportunities: [opportunity, ...current.opportunities] }))
  const updateStage = (applicationId: string, stage: PlacementStage) => setData((current) => ({ ...current, applications: current.applications.map((application) => application.id === applicationId ? { ...application, stage } : application) }))

  const renderView = () => {
    switch (activeView) {
      case 'academic':
        return <Academic student={currentStudent} mentor={data.mentor} rechecks={data.rechecks} onNavigate={setActiveView} />
      case 'notices':
        return <Notices notices={data.notices} />
      case 'placements':
        return <Placements student={currentStudent} companies={data.companies} opportunities={data.opportunities} applications={data.applications} onNavigate={setActiveView} onSelectOpportunity={setSelectedOpportunityId} />
      case 'resume':
        return <ResumeChecker student={currentStudent} companies={data.companies} opportunities={data.opportunities} resumes={data.resumes} initialOpportunityId={selectedOpportunityId} />
      case 'admin':
        return <Admin students={data.students} notices={data.notices} companies={data.companies} opportunities={data.opportunities} applications={data.applications} onUpdateStudent={updateStudent} onAddNotice={addNotice} onRemoveNotice={removeNotice} onAddOpportunity={addOpportunity} onUpdateStage={updateStage} />
      case 'dashboard':
      default:
        return <Dashboard student={currentStudent} mentor={data.mentor} notices={data.notices} opportunities={data.opportunities} companies={data.companies} applications={data.applications} onNavigate={setActiveView} />
    }
  }

  return <AppShell student={currentStudent} activeView={activeView} onNavigate={setActiveView} onLogout={() => { setStudentId(null); setActiveView('dashboard') }}>{renderView()}</AppShell>
}
