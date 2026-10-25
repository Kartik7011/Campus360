import { supabase } from './supabase'
import type { Student } from './types'

export type Role = 'student' | 'admin'
export type Session = { role: 'student'; studentId: string } | { role: 'admin' }

// shortcut: without a database (no .env.local) passwords are checked in the browser and kept in source,
// so anyone with dev tools can get past this. Only sample data is used in that mode.
const ADMIN = { email: 'admin@galgotiasuniversity.ac.in', password: 'Admin@360' }
const studentPasswords: Record<string, string> = {
  kartik: 'Kartik@360',
  shreyansh: 'Shreyansh@360',
}

// Students sign in with the email on their record; returns null when the email/password pair is wrong.
export function signInLocal(email: string, password: string, students: Student[]): Session | null {
  const id = email.trim().toLowerCase()
  if (id === ADMIN.email) return password === ADMIN.password ? { role: 'admin' } : null
  const student = students.find((item) => item.email.toLowerCase() === id)
  return student && studentPasswords[student.id] === password
    ? { role: 'student', studentId: student.id }
    : null
}

// The role comes from the profiles table, which a user can read but not change.
async function sessionFromProfile(userId: string): Promise<Session | null> {
  const { data, error } = await supabase!
    .from('profiles')
    .select('role, student_id')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return data.role === 'admin' ? { role: 'admin' } : { role: 'student', studentId: data.student_id }
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

export async function restoreRemoteSession(): Promise<Session | null> {
  const { data } = await supabase!.auth.getSession()
  return data.session ? sessionFromProfile(data.session.user.id) : null
}
