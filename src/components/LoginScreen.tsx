import { useState } from 'react'
import { BellRing, BriefcaseBusiness, Eye, EyeOff, GraduationCap } from 'lucide-react'
import { signIn, type Role, type Session } from '../auth'
import type { Student } from '../types'
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

export function LoginScreen({
  students,
  onLogin,
}: {
  students: Student[]
  onLogin: (session: Session) => void
}) {
  const heroRef = useEnterAnimation<HTMLDivElement>('login', ':scope > *')
  const formRef = useEnterAnimation<HTMLDivElement>('login', ':scope > *')
  const [role, setRole] = useState<Role>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const session = signIn(email, password, students)
    if (!session) return setError('Email or password is incorrect.')
    if (session.role !== role)
      return setError(
        role === 'admin'
          ? 'This is a student account. Use the Student tab.'
          : 'This is an admin account. Use the Admin tab.',
      )
    onLogin(session)
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
              : 'Placement office and staff access.'}
          </p>

          <div
            className="mt-6 grid grid-cols-2 rounded-lg bg-slate-200/70 p-1"
            role="tablist"
            aria-label="Account type"
          >
            {(['student', 'admin'] as Role[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={role === item}
                onClick={() => switchRole(item)}
                className={`h-9 rounded-md text-sm font-medium capitalize transition-colors ${role === item ? 'bg-white text-brand-800 shadow-card' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {item}
              </button>
            ))}
          </div>

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
                    : 'admin@galgotiasuniversity.ac.in'
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
              disabled={!email.trim() || !password}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-sm font-semibold text-white shadow-sm shadow-brand-700/30 transition hover:from-brand-700 hover:to-brand-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
            >
              Sign in
            </button>
          </form>

          <p className="mt-8 text-xs leading-5 text-slate-500 lg:hidden">
            Eligibility results are guidance only. Official decisions remain with the college placement cell.
          </p>
        </div>
      </section>
    </div>
  )
}
