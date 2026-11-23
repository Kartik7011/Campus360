import { useEffect, useState } from 'react'
import { BellRing, BriefcaseBusiness, Eye, EyeOff, GraduationCap } from 'lucide-react'
import {
  mfaLevel,
  sendParentSignInLink,
  sendPasswordReset,
  signInRemote,
  startMfaEnrolment,
  verifyMfa,
  type Role,
  type Session,
} from '../auth'
import { supabase } from '../supabase'
import type { AppData } from '../types'
import { useEnterAnimation } from '../useEnterAnimation'
import { Logo } from './Layout'
import { university } from '../university'

const highlights = [
  { icon: GraduationCap, title: 'Academic record', text: 'CGPA, backlogs, mentor and rechecking status' },
  {
    icon: BriefcaseBusiness,
    title: 'Placement eligibility',
    text: 'Each company’s criteria checked against your record',
  },
  { icon: BellRing, title: 'Notices & deadlines', text: 'Updates from every office, with time left' },
]

const roleLabels: Record<Role, string> = { student: 'Student', parent: 'Parent', staff: 'Staff' }

export function LoginScreen({
  accounts,
  pendingMfaSession,
  onLogin,
}: {
  accounts: Pick<AppData, 'students' | 'staff' | 'consents'>
  pendingMfaSession?: Session | null
  onLogin: (session: Session) => void
}) {
  const heroRef = useEnterAnimation<HTMLDivElement>('login', ':scope > *')
  const formRef = useEnterAnimation<HTMLDivElement>('login', ':scope > *')
  const [role, setRole] = useState<Role>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [busy, setBusy] = useState(false)
  // staff on the database must pass a second factor before the session counts (NFR-SEC-04)
  const [mfa, setMfa] = useState<{
    session: Session
    enrol?: { factorId: string; qr: string; secret: string }
  } | null>(null)
  const [code, setCode] = useState('')

  useEffect(() => {
    if (!pendingMfaSession || pendingMfaSession.role !== 'staff') return
    let active = true
    void mfaLevel()
      .then(async (level) => {
        if (!active) return
        if (level.current === 'aal2') return onLogin(pendingMfaSession)
        const enrol = level.next === 'aal2' ? undefined : await startMfaEnrolment()
        if (active) setMfa({ session: pendingMfaSession, enrol })
      })
      .catch((reason: Error) => active && setError(reason.message))
    return () => { active = false }
  }, [pendingMfaSession])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    let session: Session | null
    try {
      setBusy(true)
      if (supabase) session = await signInRemote(email, password)
      else if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_MODE === 'true')
        session = (await import('../demoAuth')).signInLocal(email, password, accounts)
      else return setError('Sign-in is unavailable because the application is not configured.')
    } catch {
      return setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
    if (!session) return setError('Email or password is incorrect.')
    if (session.role !== role) {
      await supabase?.auth.signOut()
      return setError(
        `This is a ${roleLabels[session.role].toLowerCase()} account. Use the ${roleLabels[session.role]} tab.`,
      )
    }
    if (supabase && session.role === 'staff') {
      try {
        const level = await mfaLevel()
        if (level.current !== 'aal2')
          return setMfa({ session, enrol: level.next === 'aal2' ? undefined : await startMfaEnrolment() })
      } catch (reason) {
        return setError((reason as Error).message)
      }
    }
    onLogin(session)
  }

  const sendParentLink = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setError('')
    setLinkSent(false)
    try {
      await sendParentSignInLink(email)
      setLinkSent(true)
    } catch {
      // Keep the response the same for unknown addresses and temporary delivery failures.
      setLinkSent(true)
    } finally {
      setBusy(false)
    }
  }

  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!mfa) return
    setBusy(true)
    try {
      await verifyMfa(code.trim(), mfa.enrol?.factorId)
      onLogin(mfa.session)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const switchRole = (next: Role) => {
    setRole(next)
    setError('')
  }

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 text-white">
        {/* faint dot grid + a soft light source so the panel has depth without decoration */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-500/30 blur-3xl" />

        <div className="relative flex h-full flex-col px-5 py-6 sm:px-10 sm:py-10 xl:px-16">
          <a href={university.website} target="_blank" rel="noopener noreferrer" className="w-fit rounded-sm" aria-label="Galgotias University official website">
            <Logo inverted />
          </a>
          <p className="mt-3 text-xs font-medium tracking-wide text-brand-100">STUDENT SERVICES · GREATER NOIDA</p>
          <div ref={heroRef} className="flex flex-1 flex-col justify-center py-8 lg:py-12">
            <h1 className="max-w-xl font-display text-3xl font-semibold leading-tight sm:text-4xl xl:text-5xl">
              Your academic record and placement status, in one place.
            </h1>
            <p className="mt-4 max-w-[52ch] text-base leading-7 text-brand-100">
              See where you stand before you apply, and why. Eligibility is checked rule by rule against each
              company’s published criteria.
            </p>
            <ul className="mt-8 hidden gap-3 sm:grid xl:grid-cols-3">
              {highlights.map(({ icon: Icon, title, text }) => (
                <li
                  key={title}
                  className="rounded-xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur-sm"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-brand-200">
                    <Icon size={18} />
                  </span>
                  <p className="mt-3 text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-5 text-brand-100/90">{text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden text-xs leading-5 text-brand-200 lg:block">
            <p>Eligibility results are guidance only. Official decisions remain with the university placement office.</p>
            <p className="mt-2 max-w-md">{university.campus}</p>
            <a href={university.website} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline underline-offset-2">
              Galgotias University website
            </a>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-canvas px-4 py-8 sm:px-8 lg:py-12">
        <div ref={formRef} className="w-full max-w-[26rem]">
          <h2 className="font-display text-2xl font-semibold text-slate-950">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">
            {role === 'student'
              ? import.meta.env.PROD
                ? 'Use the Campus360 account provided by university IT.'
                : 'Sign in with your college account.'
              : role === 'parent'
                ? import.meta.env.PROD
                  ? 'Request a one-time sign-in link at the email address the student approved.'
                  : 'Parents can sign in when the student has turned on parent access.'
                : 'Exam cell, accounts, placement, faculty and administration.'}
          </p>

          <div
            className="mt-6 grid grid-cols-3 rounded-lg bg-slate-200/70 p-1"
            role="tablist"
            aria-label="Account type"
          >
            {(['student', 'parent', 'staff'] as Role[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={role === item}
                onClick={() => switchRole(item)}
                className={`h-9 rounded-md text-sm font-medium capitalize transition-colors ${role === item ? 'bg-white text-brand-800 shadow-card' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {roleLabels[item]}
              </button>
            ))}
          </div>

          {mfa ? (
            <form onSubmit={submitCode} className="mt-5 space-y-4" noValidate>
              <h3 className="text-sm font-semibold text-slate-900">
                {mfa.enrol ? 'Set up two-step sign-in' : 'Enter your authenticator code'}
              </h3>
              {mfa.enrol && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                  <p>
                    Staff accounts need a second factor. Scan this with an authenticator app, then enter the 6-digit code.
                  </p>
                  <img
                    src={mfa.enrol.qr}
                    alt="Authenticator setup QR code"
                    className="mx-auto mt-3 h-40 w-40"
                  />
                  <p className="mt-2 break-all text-center text-xs text-slate-500">
                    Or enter this key: {mfa.enrol.secret}
                  </p>
                </div>
              )}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, ''))
                  setError('')
                }}
                className="form-input bg-white text-center text-lg tracking-[0.4em]"
                aria-label="6-digit code"
              />
              {error && (
                <p id="signin-error" role="alert" className="text-sm font-medium text-rose-700">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={code.length !== 6 || busy}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
              >
                {busy ? 'Checking…' : 'Verify and continue'}
              </button>
              <button
                type="button"
                onClick={() => {
                  void supabase?.auth.signOut()
                  setMfa(null)
                  setCode('')
                }}
                className="w-full text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </form>
          ) : (
            role === 'parent' && import.meta.env.PROD ? (
              <form onSubmit={sendParentLink} className="mt-5 space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">Parent email</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => { setEmail(event.target.value); setLinkSent(false); setError('') }}
                    placeholder="The email the student approved"
                    className="form-input mt-1.5 bg-white"
                  />
                </div>
                {linkSent && <p role="status" className="text-sm text-emerald-700">If this address has an active parent account, a sign-in link has been sent.</p>}
                <button type="submit" disabled={!email.trim() || busy} className="h-11 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300">
                  {busy ? 'Sending…' : 'Email a sign-in link'}
                </button>
              </form>
            ) : (
            <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
              {import.meta.env.PROD && (
                <p className="text-sm leading-6 text-slate-600">
                  Sign in with the account provided by university IT. Staff accounts require an authenticator code.
                </p>
              )}
              <div>
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setError('')
                  }}
                  placeholder={import.meta.env.PROD ? 'University-issued email address' : role === 'parent' ? 'The email the student gave for parent access' : 'name@galgotiasuniversity.ac.in'}
                  className="form-input mt-1.5 bg-white"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'signin-error' : undefined}
                />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setError('')
                    }}
                    className="form-input bg-white pr-12"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'signin-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 hover:text-slate-800"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <p id="signin-error" role="alert" className="text-sm font-medium text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!email.trim() || !password || busy}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-sm font-semibold text-white shadow-sm shadow-brand-700/30 transition hover:from-brand-700 hover:to-brand-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              {import.meta.env.PROD && role !== 'parent' && supabase && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    disabled={!email.trim() || busy}
                    onClick={async () => {
                      setBusy(true)
                      setResetSent(false)
                      try {
                        await sendPasswordReset(email)
                      } catch {
                        // Do not reveal whether this address has a provisioned account.
                      } finally {
                        setResetSent(true)
                        setBusy(false)
                      }
                    }}
                    className="text-sm font-medium text-brand-700 underline underline-offset-2 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Forgot password?
                  </button>
                  {resetSent && <p role="status" className="mt-2 text-xs text-slate-500">If this account can receive a reset link, one has been sent.</p>}
                </div>
              )}
            </form>
            )
          )}

          <p className="mt-8 text-xs leading-5 text-slate-500 lg:hidden">
            Eligibility results are guidance only. Official decisions remain with the university placement office.
          </p>
          <div className="mt-6 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            <p>{university.name} · Greater Noida campus</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <a href={university.website} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline underline-offset-2">University website</a>
              <a href={university.links.grievance} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline underline-offset-2">Grievance support</a>
              <a href={university.links.privacy} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline underline-offset-2">Website privacy policy</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export function PasswordRecoveryScreen({ onBack }: { onBack: () => void }) {
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    if (!supabase) return setHasSession(false)
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setHasSession(Boolean(data.session))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setHasSession(true)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < 12) return setError('Choose a password with at least 12 characters.')
    if (password !== confirmation) return setError('The passwords do not match.')
    if (!supabase) return setError('Password reset is unavailable because the application is not configured.')
    setBusy(true)
    setError('')
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      await supabase.auth.signOut()
      setComplete(true)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-semibold text-slate-950">
          {complete ? 'Password updated' : 'Reset your password'}
        </h1>
        {complete ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm leading-6 text-slate-600">Your password has been changed. Sign in with your new password.</p>
            <button type="button" onClick={onBack} className="h-11 w-full rounded-xl bg-brand-700 text-sm font-semibold text-white">Back to sign in</button>
          </div>
        ) : hasSession === null ? (
          <p className="mt-4 text-sm text-slate-600">Checking your secure reset link…</p>
        ) : !hasSession ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm leading-6 text-slate-600">This reset link is invalid or has expired. Return to sign in and request another link.</p>
            <button type="button" onClick={onBack} className="h-11 w-full rounded-xl bg-brand-700 text-sm font-semibold text-white">Back to sign in</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              New password
              <input className="form-input mt-1.5 bg-white" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Confirm new password
              <input className="form-input mt-1.5 bg-white" type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </label>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-brand-700 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Updating…' : 'Update password'}</button>
          </form>
        )}
      </section>
    </main>
  )
}
