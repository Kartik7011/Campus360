import { applyOps } from '../ops'
import { seedData } from '../data'
import type { AppData, Settlement } from '../types'
import {
  approveSettlement,
  balanceDue,
  chargeStatus,
  credit,
  lateFine,
  lateFineOps,
  ledger,
  makePayment,
  reconcile,
  settlementOps,
  settlementPlan,
} from './fees'
import { decideWithdrawal } from './exams'

const NOW = new Date('2026-10-26T12:00:00Z')
const TODAY = '2026-10-26'
const charge = (data: AppData, id: string) => data.charges.find((item) => item.id === id)!

describe('fee status', () => {
  it('shows a charge covered by an unconfirmed bank payment as Processing, never Due', () => {
    expect(chargeStatus(charge(seedData, 'charge-kartik-hostel'), seedData, TODAY)).toBe('Processing')
  })

  it('marks unpaid charges past their due date as Overdue and applies the late-fine rule', () => {
    const transport = charge(seedData, 'charge-shreyansh-transport')
    expect(chargeStatus(transport, seedData, TODAY)).toBe('Overdue')
    // 26 days late × ₹50, capped at ₹1,000
    expect(lateFine(transport, seedData, TODAY)).toBe(1000)
    expect(lateFine(transport, seedData, '2026-10-05')).toBe(250)
  })

  it('keeps one late-fine charge per overdue charge and updates it until paid', () => {
    const ops = lateFineOps(seedData, '2026-10-05')
    const withFine = applyOps(seedData, ops)
    const fines = withFine.charges.filter(
      (item) => item.head === 'Late fine' && item.ref === 'charge-shreyansh-transport',
    )
    expect(fines).toEqual([expect.objectContaining({ amount: 250 })])
    const later = lateFineOps(withFine, TODAY)
    expect(later).toContainEqual(
      expect.objectContaining({ type: 'patch', id: fines[0].id, patch: { amount: 1000 } }),
    )
    // no second fine for the same charge
    expect(later.filter((op) => op.type === 'upsert')).toEqual([])
  })

  it('balances the ledger: what is due equals charges less confirmed payments', () => {
    const entries = ledger('shreyansh', seedData)
    const due = balanceDue('shreyansh', seedData)
    expect(entries.slice(-1)[0].balance).toBe(due)
  })
})

describe('payments', () => {
  it('pays outstanding amounts and never charges twice for the same submission', () => {
    const input = {
      studentId: 'shreyansh',
      chargeIds: ['charge-shreyansh-exam'],
      method: 'UPI' as const,
      idempotencyKey: 'k-1',
    }
    const first = makePayment(input, seedData, NOW)
    expect(first.payment?.amount).toBe(1200)
    const after = applyOps(seedData, first.ops)
    expect(chargeStatus(charge(after, 'charge-shreyansh-exam'), after, TODAY)).toBe('Paid')
    // double click / retry with the same key
    expect(makePayment(input, after, NOW).ops).toEqual([])
    // a new submission for an already-paid charge has nothing to pay
    expect(makePayment({ ...input, idempotencyKey: 'k-2' }, after, NOW).error).toMatch(/Nothing is due/)
  })

  it('refuses to pay another student’s charge', () => {
    const result = makePayment(
      { studentId: 'kartik', chargeIds: ['charge-shreyansh-exam'], method: 'UPI', idempotencyKey: 'k-3' },
      seedData,
      NOW,
    )
    expect(result.payment).toBeNull()
  })
})

describe('reconciliation', () => {
  it('confirms pending bank payments and refunds a charge paid twice, without the student asking', () => {
    const ops = reconcile(seedData, NOW)
    const after = applyOps(seedData, ops)
    const hostel = after.payments.find((item) => item.id === 'payment-kartik-hostel')!
    expect(hostel.status).toBe('Success')
    expect(hostel.receiptNo).toMatch(/^RCPT-/)
    const refunds = after.settlements.filter((item) => item.kind === 'Refund')
    expect(refunds).toEqual([
      expect.objectContaining({
        studentId: 'kartik',
        amount: 85_000,
        createdBy: 'Reconciliation',
        status: 'Requested',
      }),
    ])
    // running it again finds nothing new
    expect(reconcile(after, NOW)).toEqual([])
  })
})

describe('withdrawing a duplicate exam application', () => {
  // Shreyansh paid ₹1,500 (back) and ₹2,000 (special) for the same subject; the back exam is withdrawn
  const approved = applyOps(
    seedData,
    decideWithdrawal('withdrawal-shreyansh-602', 'Approved', 'Duplicate', 'Rakesh Kumar', seedData, NOW),
  )

  it('cancels the withdrawn fee in full because it was a duplicate', () => {
    expect(charge(approved, 'charge-shreyansh-back-602').cancelledOn).toBe(TODAY)
    expect(
      approved.examApplicationItems.find((item) => item.id === 'examitem-shreyansh-back-602')!.withdrawnOn,
    ).toBe(TODAY)
    expect(credit('shreyansh', approved)).toBe(1500)
  })

  it('adjusts the credit against other dues first and refunds the rest, with exactly one refund', () => {
    // due: exam fee ₹1,200 (15 Nov) after transport ₹12,000 (30 Sep, oldest first)
    const plan = settlementPlan('shreyansh', approved)
    expect(plan).toEqual({
      adjustments: [{ chargeId: 'charge-shreyansh-transport', amount: 1500 }],
      refund: 0,
    })
    const settled = applyOps(
      approved,
      settlementOps(
        'shreyansh',
        approved,
        'Anil Mehta',
        'Duplicate exam application',
        'withdrawal-shreyansh-602',
        TODAY,
      ),
    )
    expect(credit('shreyansh', settled)).toBe(0)
    // once approved, the money is on the transport charge and the ledger still balances
    const adjustment = settled.settlements[0] as Settlement
    const done = applyOps(settled, approveSettlement(adjustment, 'Sunita Rao', NOW).ops)
    expect(balanceDue('shreyansh', done)).toBe(balanceDue('shreyansh', seedData) - 1500)
    expect(ledger('shreyansh', done).slice(-1)[0].balance).toBe(balanceDue('shreyansh', done))
  })

  it('refunds what is left when there are no other dues', () => {
    const noDues = {
      ...approved,
      charges: approved.charges.filter(
        (item) =>
          item.studentId !== 'shreyansh' ||
          item.id.includes('602') ||
          item.id.includes('reval') ||
          item.id.includes('tuition-1'),
      ),
    }
    expect(settlementPlan('shreyansh', noDues)).toEqual({ adjustments: [], refund: 1500 })
  })
})

describe('maker–checker', () => {
  const item: Settlement = {
    id: 's1',
    studentId: 'kartik',
    kind: 'Refund',
    amount: 100,
    reason: 'test',
    status: 'Requested',
    createdBy: 'Anil Mehta',
    createdOn: TODAY,
  }

  it('does not let the creator approve their own settlement', () => {
    expect(approveSettlement(item, 'Anil Mehta', NOW).error).toMatch(/different/)
    expect(approveSettlement(item, 'Sunita Rao', NOW).ops).toHaveLength(1)
  })
})
