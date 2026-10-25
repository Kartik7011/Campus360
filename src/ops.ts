import type { AppData, AuditEntry, CollectionKey, Row } from './types'

// A workflow returns the row changes it needs; the app applies them to its state, sends them to the
// database (when connected) and audits them. Keeping workflows as pure functions makes them testable.
export type Op =
  | { type: 'upsert'; key: CollectionKey; row: { id: string } }
  | { type: 'patch'; key: CollectionKey; id: string; patch: Record<string, unknown> }
  | { type: 'delete'; key: CollectionKey; id: string }

export const upsert = <K extends CollectionKey>(key: K, row: Row<K>): Op => ({ type: 'upsert', key, row })
export const patch = <K extends CollectionKey>(key: K, id: string, changes: Partial<Row<K>>): Op => ({
  type: 'patch',
  key,
  id,
  patch: changes as Record<string, unknown>,
})
export const remove = (key: CollectionKey, id: string): Op => ({ type: 'delete', key, id })

type AnyRow = { id: string } & Record<string, unknown>

export function applyOps(data: AppData, ops: Op[], actor?: { name: string; email: string }): AppData {
  const next = { ...data } as unknown as Record<CollectionKey, AnyRow[]> & AppData
  const audit: AuditEntry[] = []
  for (const op of ops) {
    const rows = next[op.key] as AnyRow[]
    const index = rows.findIndex((row) => row.id === (op.type === 'upsert' ? op.row.id : op.id))
    const old = index >= 0 ? rows[index] : null
    let row: AnyRow | null = null
    if (op.type === 'upsert') row = op.row as AnyRow
    else if (op.type === 'patch' && old) row = { ...old, ...op.patch }
    if (op.type === 'patch' && !old) continue
    const updated = [...rows]
    if (row && index >= 0) updated[index] = row
    else if (row) updated.unshift(row)
    else if (index >= 0) updated.splice(index, 1)
    ;(next as Record<CollectionKey, AnyRow[]>)[op.key] = updated
    if (actor)
      audit.push({
        id: Date.now() * 1000 + audit.length,
        actor: actor.name,
        actorEmail: actor.email,
        tableName: op.key,
        rowId: row?.id ?? old?.id ?? null,
        action: !old ? 'insert' : row ? 'update' : 'delete',
        old,
        new: row,
        at: new Date().toISOString(),
      })
  }
  if (audit.length) next.audit = [...audit.reverse(), ...data.audit].slice(0, 500)
  return next
}

export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 13)}`
// the local calendar date; toISOString alone gives the UTC date, a day behind in India before 5:30 AM
export const today = (now = new Date()) =>
  new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
export const addDays = (date: string, days: number) =>
  new Date(new Date(`${date}T12:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10)
export const daysBetween = (from: string, to: string) =>
  Math.round(
    (new Date(`${to.slice(0, 10)}T12:00:00Z`).getTime() -
      new Date(`${from.slice(0, 10)}T12:00:00Z`).getTime()) /
      86_400_000,
  )

// Mon–Fri only; public holidays are not modelled
export function addWorkingDays(date: string, days: number) {
  let current = date
  let left = days
  while (left > 0) {
    current = addDays(current, 1)
    const weekday = new Date(`${current}T12:00:00Z`).getUTCDay()
    if (weekday !== 0 && weekday !== 6) left--
  }
  return current
}

export const rupees = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    amount,
  )
