import { addWorkingDays, daysBetween, patch, today as todayOf, uid, upsert, type Op } from '../ops'
import { policy } from '../policy'
import type { FeeCharge, Payment, Settlement } from '../types'

export interface FeeData {
  charges: FeeCharge[]
  payments: Payment[]
  settlements: Settlement[]
}

export const net = (charge: FeeCharge) => Math.max(0, charge.amount - charge.concession)
const live = (charge: FeeCharge) => !charge.cancelledOn

// money put against a charge by payments (optionally counting ones the bank hasn't confirmed) and adjustments
export function allocated(chargeId: string, data: FeeData, includePending = false) {
  const fromPayments = data.payments
    .filter((payment) => payment.status === 'Success' || (includePending && payment.status === 'Pending'))
    .flatMap((payment) => payment.allocations)
    .filter((allocation) => allocation.chargeId === chargeId)
    .reduce((total, allocation) => total + allocation.amount, 0)
  const fromAdjustments = data.settlements
    .filter(
      (item) => item.kind === 'Adjustment' && item.toChargeId === chargeId && item.status === 'Approved',
    )
    .reduce((total, item) => total + item.amount, 0)
  return fromPayments + fromAdjustments
}

export const outstanding = (charge: FeeCharge, data: FeeData) =>
  live(charge) ? Math.max(0, net(charge) - allocated(charge.id, data, true)) : 0

export type ChargeStatus = 'Paid' | 'Processing' | 'Partially paid' | 'Due' | 'Overdue' | 'Cancelled'

// A charge covered by a payment the bank hasn't confirmed shows Processing, never Due (FR-FEE-08).
export function chargeStatus(charge: FeeCharge, data: FeeData, today = todayOf()): ChargeStatus {
  if (!live(charge)) return 'Cancelled'
  const confirmed = allocated(charge.id, data)
  if (confirmed >= net(charge)) return 'Paid'
  if (allocated(charge.id, data, true) >= net(charge)) return 'Processing'
  if (confirmed > 0) return 'Partially paid'
  return charge.dueDate < today ? 'Overdue' : 'Due'
}

// Money paid in and not tied to a live charge: overpayments and fees of cancelled charges,
// less what has already been moved or paid back (or is on its way).
export function credit(studentId: string, data: FeeData) {
  const paidIn = data.payments
    .filter((payment) => payment.studentId === studentId && payment.status === 'Success')
    .reduce((total, payment) => total + payment.amount, 0)
  const used = data.charges
    .filter((charge) => charge.studentId === studentId && live(charge))
    .reduce((total, charge) => total + Math.min(allocated(charge.id, data), net(charge)), 0)
  const reserved = data.settlements
    .filter((item) => item.studentId === studentId && item.status !== 'Rejected')
    .filter((item) => item.kind === 'Refund' || item.status === 'Requested')
    .reduce((total, item) => total + item.amount, 0)
  return Math.max(0, paidIn - used - reserved)
}

export interface LedgerEntry {
  date: string
  description: string
  debit: number
  credit: number
  balance: number
  note?: string
}

// Charges are debits, confirmed payments credits, refunds sent are debits; adjustments only move money
// between charges, so they are listed without changing the balance. A negative balance is credit.
export function ledger(studentId: string, data: FeeData): LedgerEntry[] {
  const entries: Omit<LedgerEntry, 'balance'>[] = []
  for (const charge of data.charges.filter((item) => item.studentId === studentId)) {
    entries.push({
      date: charge.createdOn,
      description: `${charge.head}: ${charge.description}`,
      debit: net(charge),
      credit: 0,
      note: charge.concession ? `after ₹${charge.concession} concession` : undefined,
    })
    if (charge.cancelledOn)
      entries.push({
        date: charge.cancelledOn,
        description: `Cancelled: ${charge.description}`,
        debit: 0,
        credit: net(charge),
      })
  }
  for (const payment of data.payments.filter((item) => item.studentId === studentId)) {
    if (payment.status === 'Failed') continue
    entries.push({
      date: (payment.confirmedOn ?? payment.createdOn).slice(0, 10),
      description: `Payment ${payment.receiptNo ?? payment.gatewayRef} (${payment.method})`,
      debit: 0,
      credit: payment.status === 'Success' ? payment.amount : 0,
      note:
        payment.status === 'Pending'
          ? `₹${payment.amount} processing – not yet confirmed by the bank`
          : undefined,
    })
  }
  for (const item of data.settlements.filter((entry) => entry.studentId === studentId)) {
    if (item.kind === 'Refund' && (item.status === 'Sent' || item.status === 'Credited'))
      entries.push({
        date: item.sentOn ?? item.createdOn,
        description: `Refund ${item.creditNoteNo ?? ''}`.trim(),
        debit: item.amount,
        credit: 0,
      })
    if (item.kind === 'Adjustment' && item.status === 'Approved')
      entries.push({
        date: item.approvedOn ?? item.createdOn,
        description: `Adjustment ${item.creditNoteNo ?? ''}`.trim(),
        debit: 0,
        credit: 0,
        note: `₹${item.amount} of credit applied to a due charge`,
      })
  }
  let balance = 0
  return entries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => {
      balance += entry.debit - entry.credit
      return { ...entry, balance }
    })
}

export const balanceDue = (studentId: string, data: FeeData) =>
  data.charges
    .filter((charge) => charge.studentId === studentId)
    .reduce((total, charge) => total + outstanding(charge, data), 0)

export function lateFine(charge: FeeCharge, data: FeeData, today = todayOf()) {
  if (!policy.lateFine.heads.includes(charge.head) || outstanding(charge, data) === 0) return 0
  const daysLate = daysBetween(charge.dueDate, today)
  return daysLate > 0 ? Math.min(policy.lateFine.max, daysLate * policy.lateFine.perDay) : 0
}

// Accounts runs this (daily in production): one fine charge per overdue charge, kept up to date until paid.
export function lateFineOps(data: FeeData, today = todayOf()): Op[] {
  const ops: Op[] = []
  for (const charge of data.charges) {
    const fine = lateFine(charge, data, today)
    if (!fine) continue
    const existing = data.charges.find(
      (item) => item.head === 'Late fine' && item.ref === charge.id && live(item),
    )
    if (existing && allocated(existing.id, data, true) === 0 && existing.amount !== fine)
      ops.push(patch('charges', existing.id, { amount: fine }))
    if (!existing)
      ops.push(
        upsert('charges', {
          id: uid('charge'),
          studentId: charge.studentId,
          semester: charge.semester,
          head: 'Late fine',
          description: `Late fee on ${charge.description} (₹${policy.lateFine.perDay}/day after ${charge.dueDate}, max ₹${policy.lateFine.max})`,
          amount: fine,
          concession: 0,
          dueDate: today,
          createdOn: today,
          ref: charge.id,
        }),
      )
  }
  return ops
}

export const receiptNumber = (now = new Date()) =>
  `RCPT-${now.getFullYear()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`

// Pays the outstanding amount of the chosen charges. The same idempotency key never charges twice,
// so a double click or a retry after a timeout is safe (FR-DUP-04).
export function makePayment(
  input: { studentId: string; chargeIds: string[]; method: Payment['method']; idempotencyKey: string },
  data: FeeData,
  now = new Date(),
): { ops: Op[]; payment: Payment | null; error?: string } {
  const existing = data.payments.find((payment) => payment.idempotencyKey === input.idempotencyKey)
  if (existing) return { ops: [], payment: existing }
  const allocations = input.chargeIds
    .map((id) => data.charges.find((charge) => charge.id === id))
    .filter((charge): charge is FeeCharge => !!charge && charge.studentId === input.studentId)
    .map((charge) => ({ chargeId: charge.id, amount: outstanding(charge, data) }))
    .filter((allocation) => allocation.amount > 0)
  if (!allocations.length) return { ops: [], payment: null, error: 'Nothing is due on the selected fees.' }
  const payment: Payment = {
    id: uid('payment'),
    studentId: input.studentId,
    amount: allocations.reduce((total, allocation) => total + allocation.amount, 0),
    method: input.method,
    status: 'Success',
    gatewayRef: `TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    receiptNo: receiptNumber(now),
    createdOn: now.toISOString(),
    confirmedOn: now.toISOString(),
    allocations,
    idempotencyKey: input.idempotencyKey,
  }
  return { ops: [upsert('payments', payment)], payment }
}

// Matches payments against the bank. In this build the test gateway's bank confirms every pending
// payment; a charge paid more than once by separate payments is refunded without the student asking.
export function reconcile(data: FeeData, now = new Date()): Op[] {
  const ops: Op[] = []
  const confirmed = data.payments.map((payment) =>
    payment.status === 'Pending'
      ? {
          ...payment,
          status: 'Success' as const,
          confirmedOn: now.toISOString(),
          receiptNo: payment.receiptNo ?? receiptNumber(now),
        }
      : payment,
  )
  confirmed.forEach((payment, index) => {
    if (payment !== data.payments[index])
      ops.push(
        patch('payments', payment.id, {
          status: payment.status,
          confirmedOn: payment.confirmedOn,
          receiptNo: payment.receiptNo,
        }),
      )
  })
  const after = { ...data, payments: confirmed }
  for (const charge of data.charges.filter(live)) {
    const payers = confirmed.filter(
      (payment) =>
        payment.status === 'Success' &&
        payment.allocations.some((allocation) => allocation.chargeId === charge.id),
    )
    const excess = allocated(charge.id, after) - net(charge)
    const ref = `duplicate-payment-${charge.id}`
    if (payers.length > 1 && excess > 0 && !data.settlements.some((item) => item.ref === ref))
      ops.push(
        upsert('settlements', {
          id: uid('settlement'),
          studentId: charge.studentId,
          kind: 'Refund',
          amount: excess,
          reason: `Paid twice for ${charge.description}; the extra payment is refunded`,
          ref,
          status: 'Requested',
          createdBy: 'Reconciliation',
          createdOn: todayOf(now),
        }),
      )
  }
  return ops
}

// Uses a student's credit to clear due charges (oldest due date first) and refunds the rest.
export function settlementPlan(studentId: string, data: FeeData) {
  let left = credit(studentId, data)
  const adjustments: { chargeId: string; amount: number }[] = []
  const due = data.charges
    .filter((charge) => charge.studentId === studentId && outstanding(charge, data) > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  for (const charge of due) {
    if (left <= 0) break
    const amount = Math.min(left, outstanding(charge, data))
    adjustments.push({ chargeId: charge.id, amount })
    left -= amount
  }
  return { adjustments, refund: left }
}

export function settlementOps(
  studentId: string,
  data: FeeData,
  createdBy: string,
  reason: string,
  ref: string,
  today = todayOf(),
): Op[] {
  const plan = settlementPlan(studentId, data)
  const base = { studentId, reason, ref, status: 'Requested' as const, createdBy, createdOn: today }
  return [
    ...plan.adjustments.map((item) =>
      upsert('settlements', {
        ...base,
        id: uid('settlement'),
        kind: 'Adjustment',
        amount: item.amount,
        toChargeId: item.chargeId,
      }),
    ),
    ...(plan.refund > 0
      ? [upsert('settlements', { ...base, id: uid('settlement'), kind: 'Refund', amount: plan.refund })]
      : []),
  ]
}

export const creditNoteNumber = (now = new Date()) =>
  `CN-${now.getFullYear()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`

// Maker–checker: the person approving must not be the person who created it (FR-RFD-04).
export function approveSettlement(
  item: Settlement,
  approver: string,
  now = new Date(),
): { ops: Op[]; error?: string } {
  if (item.status !== 'Requested') return { ops: [], error: 'Only requested settlements can be approved.' }
  if (item.createdBy === approver)
    return { ops: [], error: 'A different Accounts user must approve what you created.' }
  return {
    ops: [
      patch('settlements', item.id, {
        status: 'Approved',
        approvedBy: approver,
        approvedOn: todayOf(now),
        creditNoteNo: creditNoteNumber(now),
      }),
    ],
  }
}

export const refundDeadlines = (item: Settlement) => ({
  approveBy: addWorkingDays(item.createdOn, policy.refund.approveWorkingDays),
  creditBy: item.approvedOn ? addWorkingDays(item.approvedOn, policy.refund.creditWorkingDays) : null,
})
