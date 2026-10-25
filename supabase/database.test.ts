// @vitest-environment node
// Runs every migration and the seed on a real PostgreSQL (PGlite), with small stand-ins for Supabase's
// auth and storage schemas, then checks what each role can and can't do.
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')

const users = {
  kartik: ['00000000-0000-0000-0000-000000000001', 'kartik.chauhan@galgotiasuniversity.ac.in'],
  shreyansh: ['00000000-0000-0000-0000-000000000002', 'shreyansh.pandey@galgotiasuniversity.ac.in'],
  exam1: ['00000000-0000-0000-0000-000000000004', 'exam.rakesh@galgotiasuniversity.ac.in'],
  accounts1: ['00000000-0000-0000-0000-000000000005', 'accounts.anil@galgotiasuniversity.ac.in'],
  mentor: ['00000000-0000-0000-0000-000000000006', 'avinash.dwivedi@galgotiasuniversity.ac.in'],
  hod: ['00000000-0000-0000-0000-000000000007', 'hod.cse@galgotiasuniversity.ac.in'],
  parent: ['00000000-0000-0000-0000-000000000008', 'parent.kartik@example.com'],
  placement: ['00000000-0000-0000-0000-000000000009', 'placement@galgotiasuniversity.ac.in'],
} as const
type User = keyof typeof users | 'anon'

let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$
      select jsonb_build_object('email', current_setting('request.jwt.claim.email', true), 'aal', current_setting('request.jwt.claim.aal', true)) $$;
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id serial primary key, bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
  `)
  for (const file of [
    '001_init.sql',
    '002_rls.sql',
    '003_audit.sql',
    '004_link_profiles.sql',
    '005_full_platform.sql',
  ])
    await db.exec(read(`migrations/${file}`))
  await db.exec(read('seed.sql'))
  // accounts are created after the SQL, as in the dashboard; the trigger links them to their roles
  for (const [id, email] of Object.values(users))
    await db.exec(`insert into auth.users values ('${id}', '${email}')`)
  await db.exec(`
    grant usage on schema public, auth, storage to authenticated, anon;
    grant all on all tables in schema public to authenticated;
    grant select on all tables in schema public to anon;
    grant all on all tables in schema storage to authenticated;
    grant usage, select on all sequences in schema storage to authenticated;
  `)
}, 60_000)

afterAll(() => db.close())

async function as<T>(user: User, fn: () => Promise<T>, aal = 'aal2'): Promise<T> {
  const [id, email] = user === 'anon' ? ['', ''] : users[user]
  await db.exec(`reset role;
    select set_config('request.jwt.claim.sub', '${id}', false);
    select set_config('request.jwt.claim.email', '${email}', false);
    select set_config('request.jwt.claim.aal', '${aal}', false);
    set role ${user === 'anon' ? 'anon' : 'authenticated'};`)
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
  }
}
const count = async (sql: string) => (await db.query(sql)).rows.length
const rejects = (sql: string) =>
  db.query(sql).then(
    () => false,
    () => true,
  )
const affected = async (sql: string) => (await db.query(sql)).affectedRows ?? 0

describe('database rules', () => {
  it('links every account to its role by email', async () => {
    const rows = (await db.query<{ role: string }>('select role from profiles order by role')).rows.map(
      (row) => row.role,
    )
    expect(rows).toEqual(['accounts', 'exam', 'hod', 'mentor', 'parent', 'placement', 'student', 'student'])
  })

  it('keeps students to their own records and away from marks, payments and staff data', async () => {
    await as('kartik', async () => {
      expect(await count("select 1 from course_results where student_id <> 'kartik'")).toBe(0)
      expect(await count("select 1 from fee_charges where student_id = 'shreyansh'")).toBe(0)
      expect(await count('select 1 from mentor_notes')).toBe(0)
      expect(await count('select 1 from exam_sheet_scans')).toBe(0)
      expect(await count('select 1 from audit_log')).toBe(0)
      expect(await affected("update course_results set total = 99 where student_id = 'kartik'")).toBe(0)
      expect(await rejects("update notifications set title = 'x' where id = 'notification-2'")).toBe(true)
      expect(await affected("update notifications set read_on = now() where id = 'notification-2'")).toBe(1)
      expect(
        await rejects(
          "insert into payments (id, student_id, amount, method, status, gateway_ref, created_on, allocations, idempotency_key) values ('p', 'kartik', 1, 'UPI', 'Success', 'x', now(), '[]', 'k')",
        ),
      ).toBe(true)
    })
  })

  it('accepts only published fees, and pays each charge once per payment key', async () => {
    await as('kartik', async () => {
      await db.query(
        `insert into recheck_requests (id, student_id, service, session_id, subject, code, request_date, status, remarks, expected_by)
         values ('rq-x', 'kartik', 'Answer-sheet copy', 'may-2026', 'CD', 'CSE-602', current_date, 'Submitted', '', current_date + 14)`,
      )
      expect(
        await rejects(
          "insert into fee_charges (id, student_id, semester, head, description, amount, due_date, created_on, ref) values ('c-bad', 'kartik', 7, 'Answer-sheet copy', 'copy', 1, current_date, current_date, 'rq-x')",
        ),
      ).toBe(true)
      expect(
        await rejects(
          "insert into fee_charges (id, student_id, semester, head, description, amount, due_date, created_on) values ('c-t', 'kartik', 7, 'Tuition', 't', 1, current_date, current_date)",
        ),
      ).toBe(true)
      await db.query(
        "insert into fee_charges (id, student_id, semester, head, description, amount, due_date, created_on, ref) values ('c-ok', 'kartik', 7, 'Answer-sheet copy', 'copy', 300, current_date, current_date, 'rq-x')",
      )
      const pay = (
        await db.query<{ id: string; amount: number; allocations: unknown[] }>(
          "select * from pay_charges(array['c-ok', 'charge-shreyansh-exam'], 'UPI', 'key-1')",
        )
      ).rows[0]
      expect(pay.amount).toBe(300)
      expect(pay.allocations).toHaveLength(1)
      const again = (
        await db.query<{ id: string }>("select * from pay_charges(array['c-ok'], 'UPI', 'key-1')")
      ).rows[0]
      expect(again.id).toBe(pay.id)
    })
  })

  it('blocks the same subject twice in one exam session and back exams for passed subjects', async () => {
    await as('shreyansh', async () => {
      await db.query(
        "insert into exam_applications (id, student_id, session_id, kind, submitted_on) values ('ea1', 'shreyansh', 'nov-2026-bs', 'Back', current_date)",
      )
      const item = (code: string, id: string, fee = 1500) =>
        `insert into exam_application_items (id, application_id, student_id, session_id, course_code, kind, fee) values ('${id}', 'ea1', 'shreyansh', 'nov-2026-bs', '${code}', 'Back', ${fee})`
      // the window may be closed when the tests run after 5 Nov 2026; then every insert is rejected
      const windowOpen = (
        await db.query<{ open: boolean }>(
          "select current_date between application_opens and application_closes as open from exam_sessions where id = 'nov-2026-bs'",
        )
      ).rows[0].open
      if (windowOpen) {
        expect(await rejects(item('ECE-601', 'ei1'))).toBe(false)
        expect(await rejects(item('ECE-601', 'ei2'))).toBe(true)
      }
      expect(await rejects(item('ECE-602', 'ei3'))).toBe(true) // already in the ERP-imported applications
      expect(await rejects(item('ECE-603', 'ei4'))).toBe(true) // passed
      expect(await rejects(item('ECE-601', 'ei5', 10))).toBe(true) // wrong fee
      expect(await affected("update exam_applications set decision = 'Approved' where id = 'ea1'")).toBe(0)
    })
  })

  it('lets a parent read only their child, and only while consent is on', async () => {
    await as('parent', async () => {
      expect(await count("select 1 from course_results where student_id = 'kartik'")).toBeGreaterThan(0)
      expect(await count("select 1 from course_results where student_id <> 'kartik'")).toBe(0)
    })
    await db.exec("update consents set parent_access = false where student_id = 'kartik'")
    await as('parent', async () => expect(await count('select 1 from course_results')).toBe(0))
    await db.exec("update consents set parent_access = true where student_id = 'kartik'")
  })

  it('gives staff no rights until they pass the second factor', async () => {
    await as('exam1', async () => expect(await count('select 1 from course_results')).toBe(0), 'aal1')
    await as('exam1', async () =>
      expect(await count('select distinct student_id from course_results')).toBe(4),
    )
  })

  it('limits each office to its own work', async () => {
    await as('exam1', async () => {
      expect(
        await affected("update course_results set total = 73 where id = 'result-kartik-CSE-601-may-2026'"),
      ).toBe(1)
      expect(
        await rejects(
          "insert into settlements (id, student_id, kind, amount, reason, status, created_by, created_on) values ('s0', 'kartik', 'Refund', 1, 'x', 'Requested', 'R', current_date)",
        ),
      ).toBe(true)
      expect(
        await rejects(
          `update exam_attendance set entry2 = jsonb_build_object('status', 'Present', 'by', 'Rakesh Kumar', 'at', now()) where id = 'examatt-aditi-may-2026-CSE-604'`,
        ),
      ).toBe(true)
    })
    await as('accounts1', async () => {
      expect(await affected('update course_results set total = 10')).toBe(0)
      await db.query(
        "insert into settlements (id, student_id, kind, amount, reason, status, created_by, created_on) values ('s1', 'kartik', 'Refund', 100, 'x', 'Requested', 'Anil Mehta', current_date)",
      )
      expect(
        await rejects(
          "update settlements set status = 'Approved', approved_by = 'Anil Mehta' where id = 's1'",
        ),
      ).toBe(true)
      expect(
        await affected(
          "update settlements set status = 'Approved', approved_by = 'Sunita Rao' where id = 's1'",
        ),
      ).toBe(1)
    })
    await as('placement', async () => {
      expect(
        await rejects(
          "insert into applications (id, student_id, opportunity_id, stage, applied_on, note, override_reason) values ('a3', 'kartik', 'opp-technova-frontend', 'Applied', current_date, '', 'approved')",
        ),
      ).toBe(false)
    })
  })

  it('scopes mentors to mentees and HoDs to their department', async () => {
    const ids = async () =>
      (await db.query<{ id: string }>('select id from students order by id')).rows.map((row) => row.id)
    await as('mentor', async () => expect(await ids()).toEqual(['aditi', 'kartik', 'rohan']))
    await as('hod', async () => {
      expect(await ids()).toEqual(['aditi', 'kartik', 'rohan'])
      expect(
        await affected(
          "update condonation_requests set decision = 'Approved', decided_by = 'HoD' where id = 'condonation-aditi'",
        ),
      ).toBe(1)
    })
  })

  it('rejects ineligible placement applications from students', async () => {
    await as('kartik', async () => {
      expect(
        await rejects(
          "insert into applications (id, student_id, opportunity_id, stage, applied_on, note) values ('a2', 'kartik', 'opp-technova-frontend', 'Applied', current_date, '')",
        ),
      ).toBe(true)
    })
  })

  it('verifies documents publicly with live figures and shows signed-out visitors nothing else', async () => {
    await as('anon', async () => {
      const result = (
        await db.query<{ v: Record<string, unknown> | null }>(
          "select verify_document('C360-GS-7Q4K2M9X') as v",
        )
      ).rows[0].v
      expect(result).toMatchObject({ holder: 'Kartik Chauhan', kind: 'Grade sheet' })
      expect((await db.query<{ v: unknown }>("select verify_document('nope') as v")).rows[0].v).toBeNull()
      expect((await count('select 1 from course_results')) + (await count('select 1 from students'))).toBe(0)
    })
  })

  it('logs staff changes with who made them', async () => {
    const rows = (
      await db.query<{ actor_email: string }>(
        "select actor_email from audit_log where table_name in ('settlements', 'course_results') and actor_email is not null",
      )
    ).rows
    expect(rows.map((row) => row.actor_email)).toEqual(
      expect.arrayContaining([
        'exam.rakesh@galgotiasuniversity.ac.in',
        'accounts.anil@galgotiasuniversity.ac.in',
      ]),
    )
  })
})
