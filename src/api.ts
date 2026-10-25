import type { SupabaseClient } from '@supabase/supabase-js'
import { seedData } from './data'
import { supabase } from './supabase'
import type {
  AppData,
  AuditEntry,
  Mentor,
  Notice,
  Opportunity,
  PlacementStage,
  RecheckRequest,
  ResumeAnalysis,
  ResumeSample,
  Student,
} from './types'

// Database columns are snake_case; the app's types are camelCase.
const toSnake = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
const toCamel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())

export function toRow(item: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(item)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [toSnake(key), value]),
  )
}

export function fromRow<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [toCamel(key), value])) as T
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
export async function loadRemoteData(): Promise<AppData> {
  const db = client()
  const [students, mentors, notices, rechecks, companies, opportunities, applications, resumes] =
    await Promise.all([
      rows<Student>(db.from('students').select('*').order('name')),
      rows<Mentor>(db.from('mentors').select('*').limit(1)),
      rows<Notice>(db.from('notices').select('*').order('date', { ascending: false })),
      rows<RecheckRequest>(
        db.from('recheck_requests').select('*').order('request_date', { ascending: false }),
      ),
      rows<AppData['companies'][number]>(db.from('companies').select('*').order('name')),
      rows<Opportunity>(db.from('opportunities').select('*').order('posted', { ascending: false })),
      rows<AppData['applications'][number]>(db.from('applications').select('*')),
      rows<ResumeSample>(db.from('resumes').select('*').order('updated_at', { ascending: false })),
    ])
  if (!mentors[0]) throw new Error('No mentor record was found.')
  return {
    version: seedData.version,
    students,
    mentor: mentors[0],
    notices,
    rechecks,
    companies,
    opportunities,
    applications,
    resumes,
  }
}

export const api = {
  updateStudent: (id: string, patch: Partial<Student>) =>
    run(client().from('students').update(toRow(patch)).eq('id', id)),
  addNotice: (notice: Notice) => run(client().from('notices').insert(toRow(notice))),
  removeNotice: (id: string) => run(client().from('notices').delete().eq('id', id)),
  addOpportunity: (opportunity: Opportunity) =>
    run(client().from('opportunities').insert(toRow(opportunity))),
  updateStage: (id: string, stage: PlacementStage) =>
    run(client().from('applications').update({ stage }).eq('id', id)),
  addRecheck: (request: RecheckRequest) => run(client().from('recheck_requests').insert(toRow(request))),
  updateRecheck: (id: string, patch: Partial<RecheckRequest>) =>
    run(client().from('recheck_requests').update(toRow(patch)).eq('id', id)),

  // Keeps the original file in the private bucket (resumes/<user id>/...) next to its extracted text.
  async addResume(resume: ResumeSample, file?: File) {
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
    rows<AuditEntry>(client().from('audit_log').select('*').order('at', { ascending: false }).limit(50)),
}
