// Checks row-level security on the live Supabase project in .env.local by signing in as each sample account.
// Run with: KARTIK_PASSWORD=... ADMIN_PASSWORD=... npm run check:rls
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
const { KARTIK_PASSWORD, ADMIN_PASSWORD } = process.env
if (!url || !key || !KARTIK_PASSWORD || !ADMIN_PASSWORD) {
  console.error(
    'Needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, and KARTIK_PASSWORD and ADMIN_PASSWORD.',
  )
  process.exit(1)
}

let failures = 0
function check(label: string, ok: boolean, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`)
}

async function signedIn(email: string, password: string) {
  const db = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await db.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`${email}: ${error.message}`)
  return db
}

const student = await signedIn('kartik.chauhan@galgotiasuniversity.ac.in', KARTIK_PASSWORD)
for (const table of ['students', 'applications', 'recheck_requests', 'resumes']) {
  const column = table === 'students' ? 'id' : 'student_id'
  const { data } = await student.from(table).select('*').eq(column, 'shreyansh')
  check(`student cannot read another student's ${table}`, data?.length === 0, `${data?.length} rows`)
}
const { data: edited } = await student.from('notices').update({ title: 'changed' }).neq('id', '').select()
check('student cannot edit a notice', edited?.length === 0)
const { data: audit } = await student.from('audit_log').select('id')
check('student cannot read the audit log', audit?.length === 0)

const admin = await signedIn('admin@galgotiasuniversity.ac.in', ADMIN_PASSWORD)
const { data: everyone } = await admin.from('students').select('id')
check('admin reads every student', (everyone?.length ?? 0) >= 2, `${everyone?.length} rows`)
const { error: auditError } = await admin.from('audit_log').select('id').limit(1)
check('admin reads the audit log', !auditError, auditError?.message)

console.log(failures ? `${failures} check(s) failed` : 'all checks passed')
process.exit(failures ? 1 : 0)
