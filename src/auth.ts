import { supabase } from './supabase'
import type { StaffRole } from './types'

export type Role = 'student' | 'parent' | 'staff'
export type Session =
  | { role: 'student'; studentId: string }
  | { role: 'parent'; studentId: string }
  | { role: 'staff'; staffId: string; staffRole: StaffRole }

// Parents use a one-time sign-in link; their account must already have been provisioned from a consent.
export async function sendParentSignInLink(email: string) {
  const { error } = await supabase!.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
  })
  if (error) throw new Error(error.message)
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/?password-recovery=1`,
  })
  if (error) throw new Error(error.message)
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
  if ((data.role === 'student' || data.role === 'parent') && typeof data.student_id === 'string')
    return { role: data.role, studentId: data.student_id }
  const staffRoles: StaffRole[] = ['admin', 'exam', 'accounts', 'placement', 'mentor', 'hod', 'dean', 'registrar']
  if (staffRoles.includes(data.role) && typeof data.staff_id === 'string')
    return { role: 'staff', staffId: data.staff_id, staffRole: data.role as StaffRole }
  return null
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

// Staff sessions count only after the second factor; until then they are not signed in.
export async function restoreRemoteSession(): Promise<{ session: Session; needsMfa: boolean } | null> {
  const { data } = await supabase!.auth.getSession()
  if (!data.session) return null
  const session = await sessionFromProfile(data.session.user.id)
  if (!session || !hasAllowedSignInMethod(data.session.access_token, session.role)) {
    await supabase!.auth.signOut()
    return null
  }
  const needsMfa = session.role === 'staff' && (await mfaLevel()).current !== 'aal2'
  return { session, needsMfa }
}

function hasAllowedSignInMethod(accessToken: string, role: Role) {
  try {
    const encoded = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')))
    const methods = Array.isArray(payload.amr) ? payload.amr.map((item: { method?: string }) => item.method) : []
    return role === 'parent'
      ? methods.some((method: string) => method === 'otp' || method === 'magiclink')
      : methods.some((method: string) => method === 'password')
  } catch {
    return false
  }
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
