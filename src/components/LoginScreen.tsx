import { useState } from 'react'
import { BellRing, BriefcaseBusiness, Eye, EyeOff, GraduationCap } from 'lucide-react'
import {
  mfaLevel,
  signInLocal,
  signInRemote,
  signInWithProvider,
  startMfaEnrolment,
  verifyMfa,
  type Role,
  type Session,
} from '../auth'
import { supabase } from '../supabase'
import type { AppData } from '../types'
import { useEnterAnimation } from '../useEnterAnimation'
import { Logo } from './Layout'

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
  onLogin,
}: {
  accounts: Pick<AppData, 'students' | 'staff' | 'consents'>
  onLogin: (session: Session) => void
}) {
  const heroRef = useEnterAnimation<HTMLDivElement>('login', ':scope > *')
  const formRef = useEnterAnimation<HTMLDivElement>('login', ':scope > *')
  const [role, setRole] = useState<Role>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // staff on the database must pass a second factor before the session counts (NFR-SEC-04)
  const [mfa, setMfa] = useState<{
    session: Session
    enrol?: { factorId: string; qr: string; secret: string }
  } | null>(null)
  const [code, setCode] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    let session: Session | null
    try {
      setBusy(true)
      session = supabase ? await signInRemote(email, password) : signInLocal(email, password, accounts)
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
          <Logo inverted />
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
          <p className="hidden text-xs text-brand-200 lg:block">
            Eligibility results are guidance only. Official decisions remain with the college placement cell.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-canvas px-4 py-8 sm:px-8 lg:py-12">
        <div ref={formRef} className="w-full max-w-[26rem]">
          <h2 className="font-display text-2xl font-semibold text-slate-950">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">
            {role === 'student'
              ? 'Sign in with your college email and password.'
              : role === 'parent'
                ? 'Parents can sign in when the student has turned on parent access.'
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
                    Staff accounts need a second factor. Scan this with an authenticator app (Google
                    Authenticator, Microsoft Authenticator), then enter the 6-digit code.
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
            <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
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
                  placeholder={
                    role === 'student'
                      ? 'name.surname@galgotiasuniversity.ac.in'
                      : role === 'parent'
                        ? 'The email the student gave for parent access'
                        : 'office@galgotiasuniversity.ac.in'
                  }
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
              {supabase && role !== 'parent' && (
                <div className="grid gap-2 pt-1 sm:grid-cols-2">
                  {(
                    [
                      ['google', 'Continue with Google'],
                      ['azure', 'Continue with Microsoft'],
                    ] as const
                  ).map(([provider, label]) => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() =>
                        void signInWithProvider(provider).then(
                          ({ error: failed }) => failed && setError(failed.message),
                        )
                      }
                      className="h-11 rounded-xl bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </form>
          )}

          <p className="mt-8 text-xs leading-5 text-slate-500 lg:hidden">
            Eligibility results are guidance only. Official decisions remain with the college placement cell.
          </p>
        </div>
      </section>
    </div>
  )
}
