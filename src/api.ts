import type { SupabaseClient } from '@supabase/supabase-js'
import { seedData } from './data'
import type { Op } from './ops'
import { supabase } from './supabase'
import type { AppData, AuditEntry, CollectionKey, Payment, ResumeAnalysis, UploadedFile } from './types'

// Which database table holds each AppData collection. Also drives the seed (scripts/make-seed.ts).
export const TABLES: Record<CollectionKey, string> = {
  students: 'students',
  staff: 'staff',
  mentors: 'mentors',
  notices: 'notices',
  noticeReads: 'notice_reads',
  notifications: 'notifications',
  courses: 'courses',
  courseResults: 'course_results',
  semesterResults: 'semester_results',
  markChanges: 'mark_changes',
  creditTransfers: 'credit_transfers',
  issuedDocuments: 'issued_documents',
  documentRequests: 'document_requests',
  courseAttendance: 'course_attendance',
  condonations: 'condonation_requests',
  examSessions: 'exam_sessions',
  examPapers: 'exam_papers',
  examRegistrations: 'exam_registrations',
  examAttendance: 'exam_attendance',
  examSheetScans: 'exam_sheet_scans',
  attendanceDisputes: 'attendance_disputes',
  ufmCases: 'ufm_cases',
  rechecks: 'recheck_requests',
  examApplications: 'exam_applications',
  examApplicationItems: 'exam_application_items',
  withdrawals: 'withdrawal_requests',
  charges: 'fee_charges',
  payments: 'payments',
  settlements: 'settlements',
  scholarships: 'scholarships',
  tickets: 'tickets',
  mentorBookings: 'mentor_bookings',
  mentorNotes: 'mentor_notes',
  noDues: 'no_dues',
  careerRecords: 'career_records',
  consents: 'consents',
  companies: 'companies',
  opportunities: 'opportunities',
  applications: 'applications',
  resumes: 'resumes',
}

// Database columns are snake_case; the app's types are camelCase. Nested JSON keeps camelCase.
const toSnake = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
const toCamel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())

export function toRow(item: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(item)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [toSnake(key), value]),
  )
}

// numeric columns (CGPA, SGPA) arrive as strings from some drivers; the app expects numbers
const NUMERIC = new Set(['cgpa', 'sgpa', 'min_cgpa'])

export function fromRow<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      toCamel(key),
      NUMERIC.has(key) && typeof value === 'string' ? Number(value) : value,
    ]),
  ) as T
}

function client(): SupabaseClient {
  if (!supabase) throw new Error('The database is not configured.')
  return supabase
}

async function rows<T>(query: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => fromRow<T>(row as Record<string, unknown>))
}

async function run(query: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await query
  if (error) throw new Error(error.message)
}

// Row-level security limits what comes back: a student gets only their own records.
// shortcut: staff load every row they may see; at 40,000 students the staff views need server-side
// paging and search before going live (NFR-PER-01).
export async function loadRemoteData(): Promise<AppData> {
  const db = client()
  const keys = Object.keys(TABLES) as CollectionKey[]
  const loaded = await Promise.all(keys.map((key) => rows(db.from(TABLES[key]).select('*').limit(10_000))))
  return {
    ...(Object.fromEntries(keys.map((key, index) => [key, loaded[index]])) as Omit<
      AppData,
      'version' | 'audit'
    >),
    version: seedData.version,
    audit: [],
  }
}

// Sends a workflow's row changes in order; the database's policies and guards reject anything not allowed.
export async function applyRemote(ops: Op[]) {
  const db = client()
  for (const op of ops) {
    const table = db.from(TABLES[op.key])
    // workflows only "upsert" new rows; a plain insert needs no update permission under row-level security
    if (op.type === 'upsert') await run(table.insert(toRow(op.row)))
    else if (op.type === 'patch') await run(table.update(toRow(op.patch)).eq('id', op.id))
    else await run(table.delete().eq('id', op.id))
  }
}

export const api = {
  async pay(chargeIds: string[], method: Payment['method'], idempotencyKey: string): Promise<Payment> {
    const { data, error } = await client().rpc('pay_charges', {
      p_charge_ids: chargeIds,
      p_method: method,
      p_key: idempotencyKey,
    })
    if (error) throw new Error(error.message)
    return fromRow<Payment>(data as Record<string, unknown>)
  },

  async verify(serial: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await client().rpc('verify_document', { p_serial: serial })
    if (error) throw new Error(error.message)
    return (data as Record<string, unknown> | null) ?? null
  },

  // private bucket, under the uploader's own folder (storage policies enforce that)
  async upload(bucket: 'documents' | 'exam-sheets', file: File): Promise<UploadedFile> {
    const db = client()
    const { data } = await db.auth.getUser()
    if (!data.user) throw new Error('Your session has expired. Sign in again.')
    const path = `${bucket === 'documents' ? data.user.id : 'sheets'}/${Date.now()}-${file.name}`
    await run(db.storage.from(bucket).upload(path, file))
    return { name: file.name, size: file.size, path: `${bucket}/${path}` }
  },

  async openFile(path: string) {
    const [bucket, ...rest] = path.split('/')
    const { data, error } = await client().storage.from(bucket).createSignedUrl(rest.join('/'), 60)
    if (error) throw new Error(error.message)
    window.open(data.signedUrl, '_blank', 'noopener')
  },

  // Keeps the original file in the private bucket (resumes/<user id>/...) next to its extracted text.
  async addResume(resume: AppData['resumes'][number], file?: File) {
    const db = client()
    let filePath: string | undefined
    if (file) {
      const { data } = await db.auth.getUser()
      if (!data.user) throw new Error('Your session has expired. Sign in again.')
      filePath = `${data.user.id}/${Date.now()}-${file.name}`
      await run(db.storage.from('resumes').upload(filePath, file))
    }
    await run(db.from('resumes').insert(toRow({ ...resume, filePath })))
  },

  saveResumeResult: (studentId: string, opportunityId: string, analysis: ResumeAnalysis) =>
    run(
      client().from('resume_results').insert({
        student_id: studentId,
        opportunity_id: opportunityId,
        score: analysis.score,
        categories: analysis.categories,
        scoring_version: analysis.scoringVersion,
      }),
    ),

  loadAuditLog: () =>
    rows<AuditEntry>(client().from('audit_log').select('*').order('at', { ascending: false }).limit(200)),
}
