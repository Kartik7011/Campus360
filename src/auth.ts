import type { Student } from './types'

export type Role = 'student' | 'admin'
export type Session = { role: 'student'; studentId: string } | { role: 'admin' }

// shortcut: passwords are checked in the browser and kept in source, so anyone with dev tools can get past this.
// Move sign-in to a server (hashed passwords, sessions) before any real student data is used.
const ADMIN = { email: 'admin@galgotiasuniversity.ac.in', password: 'Admin@360' }
const studentPasswords: Record<string, string> = {
  kartik: 'Kartik@360',
  shreyansh: 'Shreyansh@360',
}

// Students sign in with the email on their record; returns null when the email/password pair is wrong.
export function signIn(email: string, password: string, students: Student[]): Session | null {
  const id = email.trim().toLowerCase()
  if (id === ADMIN.email) return password === ADMIN.password ? { role: 'admin' } : null
  const student = students.find((item) => item.email.toLowerCase() === id)
  return student && studentPasswords[student.id] === password
    ? { role: 'student', studentId: student.id }
    : null
}
