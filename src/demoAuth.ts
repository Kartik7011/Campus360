import type { AppData } from './types'
import type { Session } from './auth'

const studentPasswords: Record<string, string> = {
  kartik: 'Kartik@360',
  shreyansh: 'Shreyansh@360',
  aditi: 'Aditi@360',
  rohan: 'Rohan@360',
}

type Accounts = Pick<AppData, 'students' | 'staff' | 'consents'>

// Demo credentials are intentionally confined to the opt-in local development mode.
export function signInLocal(email: string, password: string, data: Accounts): Session | null {
  const id = email.trim().toLowerCase()
  const staff = data.staff.find((item) => item.email.toLowerCase() === id)
  if (staff)
    return password === (id === 'staff@campus360.example' ? 'DemoStaff!360' : staff.role === 'admin' ? 'Admin@360' : 'Staff@360')
      ? { role: 'staff', staffId: staff.id, staffRole: staff.role }
      : null
  const student = data.students.find((item) => item.email.toLowerCase() === id)
  if (student) {
    const expected = id === 'student@campus360.example' ? 'DemoStudent!360' : studentPasswords[student.id]
    return expected === password ? { role: 'student', studentId: student.id } : null
  }
  const consent = data.consents.find((item) => item.parentAccess && item.parentEmail.toLowerCase() === id)
  const expected = id === 'parent@campus360.example' ? 'DemoParent!360' : 'Parent@360'
  return consent && password === expected ? { role: 'parent', studentId: consent.studentId } : null
}
