import { supabase } from './supabase'
import type { AppData, StaffRole } from './types'

export type Role = 'student' | 'parent' | 'staff'
export type Session =
  | { role: 'student'; studentId: string }
  | { role: 'parent'; studentId: string }
  | { role: 'staff'; staffId: string; staffRole: StaffRole }

// shortcut: without a database (no .env.local) passwords are checked in the browser and kept in source,
// so anyone with dev tools can get past this. Only sample data is used in that mode.
const studentPasswords: Record<string, string> = {
  kartik: 'Kartik@360',
  shreyansh: 'Shreyansh@360',
  aditi: 'Aditi@360',
  rohan: 'Rohan@360',
}
const STAFF_PASSWORD = 'Staff@360'
const ADMIN_PASSWORD = 'Admin@360'
const PARENT_PASSWORD = 'Parent@360'

type Accounts = Pick<AppData, 'students' | 'staff' | 'consents'>

// Returns null when the email/password pair is wrong. A parent can sign in only while the student's consent is on.
export function signInLocal(email: string, password: string, data: Accounts): Session | null {
  const id = email.trim().toLowerCase()
  const staff = data.staff.find((item) => item.email.toLowerCase() === id)
  if (staff)
    return password === (staff.role === 'admin' ? ADMIN_PASSWORD : STAFF_PASSWORD)
      ? { role: 'staff', staffId: staff.id, staffRole: staff.role }
      : null
  const student = data.students.find((item) => item.email.toLowerCase() === id)
  if (student)
    return studentPasswords[student.id] === password ? { role: 'student', studentId: student.id } : null
  const consent = data.consents.find((item) => item.parentAccess && item.parentEmail.toLowerCase() === id)
  return consent && password === PARENT_PASSWORD ? { role: 'parent', studentId: consent.studentId } : null
}

// The role comes from the profiles table, which a user can read but not change.
async function sessionFromProfile(userId: string): Promise<Session | null> {
  const { data, error } = await supabase!
    .from('profiles')
    .select('role, student_id, staff_id')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  if (data.role === 'student' || data.role === 'parent')
    return { role: data.role, studentId: data.student_id }
  return { role: 'staff', staffId: data.staff_id, staffRole: data.role }
}

// Returns null for wrong credentials or an account with no profile; throws when the server can't be reached.
export async function signInRemote(email: string, password: string): Promise<Session | null> {
  const { data, error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
  if (error) {
    if (error.status === 400) return null
    throw new Error(error.message)
  }
  const session = await sessionFromProfile(data.user.id)
  if (!session) await supabase!.auth.signOut()
  return session
}

// University Google / Microsoft accounts (NFR-SEC-03). The provider must be enabled in the Supabase dashboard.
export const signInWithProvider = (provider: 'google' | 'azure') =>
  supabase!.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin, scopes: provider === 'azure' ? 'email' : undefined },
  })

// Staff sessions count only after the second factor; until then they are not signed in.
export async function restoreRemoteSession(): Promise<Session | null> {
  const { data } = await supabase!.auth.getSession()
  if (!data.session) return null
  const session = await sessionFromProfile(data.session.user.id)
  if (session?.role === 'staff' && (await mfaLevel()).current !== 'aal2') return null
  return session
}

export async function mfaLevel() {
  const { data, error } = await supabase!.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) throw new Error(error.message)
  return { current: data.currentLevel, next: data.nextLevel }
}

export async function startMfaEnrolment() {
  const { data, error } = await supabase!.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `Campus360 ${Date.now()}`,
  })
  if (error) throw new Error(error.message)
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret }
}

export async function verifyMfa(code: string, factorId?: string) {
  let id = factorId
  if (!id) {
    const { data, error } = await supabase!.auth.mfa.listFactors()
    if (error) throw new Error(error.message)
    id = data.totp.find((factor) => factor.status === 'verified')?.id
  }
  if (!id) throw new Error('No authenticator is set up for this account.')
  const { error } = await supabase!.auth.mfa.challengeAndVerify({ factorId: id, code })
  if (error)
    throw new Error(
      /invalid/i.test(error.message) ? 'That code is not right. Try the current one.' : error.message,
    )
}
