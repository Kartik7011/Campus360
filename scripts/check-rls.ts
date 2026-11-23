// Checks a non-production Supabase project using short-lived access tokens from provisioned test accounts.
// Run with: KARTIK_ACCESS_TOKEN=... STAFF_EMAIL=... STAFF_AAL1_ACCESS_TOKEN=... npm run check:rls
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
const { KARTIK_ACCESS_TOKEN, STAFF_EMAIL, STAFF_AAL1_ACCESS_TOKEN } = process.env
if (!url || !key || !KARTIK_ACCESS_TOKEN) {
  console.error('Needs VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and KARTIK_ACCESS_TOKEN.')
  process.exit(1)
}

let failures = 0
function check(label: string, ok: boolean, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`)
}

async function signedIn(email: string, accessToken: string) {
  const db = createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const { error } = await db.auth.getUser(accessToken)
  if (error) throw new Error(`${email}: ${error.message}`)
  return db
}

const student = await signedIn('kartik.chauhan@galgotiasuniversity.ac.in', KARTIK_ACCESS_TOKEN)
for (const [table, column] of [
  ['students', 'id'],
  ['applications', 'student_id'],
  ['recheck_requests', 'student_id'],
  ['resumes', 'student_id'],
  ['course_results', 'student_id'],
  ['fee_charges', 'student_id'],
  ['payments', 'student_id'],
] as const) {
  const { data } = await student.from(table).select('*').eq(column, 'shreyansh')
  check(`student cannot read another student's ${table}`, data?.length === 0, `${data?.length} rows`)
}
const { data: own } = await student.from('course_results').select('id').eq('student_id', 'kartik')
check('student reads their own results', (own?.length ?? 0) > 0, `${own?.length} rows`)
const { data: edited } = await student.from('notices').update({ title: 'changed' }).neq('id', '').select()
check('student cannot edit a notice', edited?.length === 0)
const { data: marks } = await student
  .from('course_results')
  .update({ total: 100 })
  .eq('student_id', 'kartik')
  .select()
check('student cannot change their marks', marks?.length === 0)
const { error: payError } = await student
  .from('payments')
  .insert({
    id: 'x',
    student_id: 'kartik',
    amount: 1,
    method: 'UPI',
    status: 'Success',
    gateway_ref: 'x',
    created_on: new Date().toISOString(),
    allocations: [],
    idempotency_key: 'x',
  })
check('student cannot record a payment directly', !!payError)
const { data: audit } = await student.from('audit_log').select('id')
check('student cannot read the audit log', audit?.length === 0)

if (STAFF_EMAIL && STAFF_AAL1_ACCESS_TOKEN) {
  const staff = await signedIn(STAFF_EMAIL, STAFF_AAL1_ACCESS_TOKEN)
  const { data: rows } = await staff.from('students').select('id')
  check('staff without the second factor see no student records', rows?.length === 0, `${rows?.length} rows`)
}

console.log(failures ? `${failures} check(s) failed` : 'all checks passed')
process.exit(failures ? 1 : 0)
