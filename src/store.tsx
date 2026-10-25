import { createContext, useContext, useState } from 'react'
import type { Session } from './auth'
import type { Op } from './ops'
import type { AppData, AuditEntry, Payment, Staff, Student, UploadedFile, ViewKey } from './types'

export interface Campus {
  data: AppData
  session: Session
  // the person acting, recorded on decisions and in the local audit trail
  actor: { name: string; email: string }
  // set for student and parent sessions
  student?: Student
  staff?: Staff
  // parents and graduates can look but not apply, pay or request
  canAct: boolean
  remote: boolean
  // applies a workflow's changes; resolves false (and shows the error) if the database refused them
  commit: (ops: Op[]) => Promise<boolean>
  pay: (chargeIds: string[], method: Payment['method'], idempotencyKey: string) => Promise<Payment | null>
  upload: (file: File, bucket?: 'documents' | 'exam-sheets') => Promise<UploadedFile>
  openFile: (file: UploadedFile) => void
  navigate: (view: ViewKey) => void
  loadAuditLog: () => Promise<AuditEntry[]>
}

export const CampusContext = createContext<Campus | null>(null)

export function useCampus() {
  const value = useContext(CampusContext)
  if (!value) throw new Error('useCampus must be used inside the signed-in app')
  return value
}

// Runs a workflow result: shows its validation error, or commits its changes.
export function useAction() {
  const { commit } = useCampus()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (result: { ops: Op[]; error?: string }, onDone?: () => void) => {
    if (result.error) {
      setError(result.error)
      return false
    }
    setError('')
    setBusy(true)
    const ok = await commit(result.ops)
    setBusy(false)
    if (ok) onDone?.()
    return ok
  }
  return { error, setError, busy, run }
}

// for pages that only make sense for a student or parent session
export function useStudent() {
  const campus = useCampus()
  if (!campus.student) throw new Error('This page needs a student')
  return { ...campus, student: campus.student }
}
