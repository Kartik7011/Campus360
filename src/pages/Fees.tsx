import { useRef, useState } from 'react'
import { CreditCard, Download, FileText } from 'lucide-react'
import { Button, Callout, Card, DataTable, Field, StatusBadge } from '../components/ui'
import { raiseTicket } from '../domain/campus'
import {
  balanceDue,
  chargeStatus,
  credit,
  lateFine,
  ledger,
  net,
  outstanding,
  refundDeadlines,
} from '../domain/fees'
import { rupees } from '../ops'
import { downloadPdf, inr, issueDocument } from '../pdf'
import { policy } from '../policy'
import { useAction, useStudent } from '../store'
import type { FeeCharge, Payment, Settlement } from '../types'
import { formatDate } from '../utils'

const statusTone = (status: string) =>
  status === 'Paid' || status === 'Credited' || status === 'Success'
    ? 'green'
    : status === 'Overdue' || status === 'Failed' || status === 'Rejected'
      ? 'red'
      : status === 'Cancelled'
        ? 'slate'
        : 'amber'

export function Fees() {
  const { data, student } = useStudent()
  const charges = data.charges.filter((row) => row.studentId === student.id)
  const processing = data.payments
    .filter((row) => row.studentId === student.id && row.status === 'Pending')
    .reduce((total, row) => total + row.amount, 0)
  const due = balanceDue(student.id, data)
  const nextDue = charges
    .filter((row) => ['Due', 'Overdue', 'Partially paid'].includes(chargeStatus(row, data)))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Outstanding', rupees(due), due ? 'text-rose-700' : 'text-emerald-700'],
          ['Processing', rupees(processing), 'text-amber-700'],
          ['Credit with the university', rupees(credit(student.id, data)), 'text-slate-900'],
          ['Next due date', nextDue ? formatDate(nextDue.dueDate) : '—', 'text-slate-900'],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className={`mt-1 font-display text-xl font-semibold ${tone}`}>{value}</dd>
          </div>
        ))}
      </dl>
      <ChargesCard charges={charges} />
      <PaymentsCard />
      <SettlementsCard />
      <LedgerCard />
      <div className="grid gap-6 lg:grid-cols-2">
        <ScholarshipsCard />
        <CertificateCard />
      </div>
    </div>
  )
}

function ChargesCard({ charges }: { charges: FeeCharge[] }) {
  const { data, canAct, pay } = useStudent()
  const [selected, setSelected] = useState<string[]>([])
  const [method, setMethod] = useState<Payment['method']>('UPI')
  const [error, setError] = useState('')
  const [paid, setPaid] = useState<Payment | null>(null)
  const [busy, setBusy] = useState(false)
  // one key per payment attempt: a double click or retry can't charge twice (FR-DUP-04)
  const key = useRef(crypto.randomUUID())
  const payable = (charge: FeeCharge) =>
    ['Due', 'Overdue', 'Partially paid'].includes(chargeStatus(charge, data))
  const total = selected.reduce(
    (sum, id) => sum + outstanding(data.charges.find((charge) => charge.id === id)!, data),
    0,
  )

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const payment = await pay(selected, method, key.current)
      setPaid(payment)
      setSelected([])
      key.current = crypto.randomUUID()
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const sorted = [...charges].sort(
    (a, b) => Number(payable(b)) - Number(payable(a)) || b.dueDate.localeCompare(a.dueDate),
  )
  return (
    <Card
      title="Fees"
      description="Each fee head with any concession, what is paid and what is left. Late fees follow the published rule."
    >
      <DataTable
        rows={sorted}
        rowKey={(row) => row.id}
        empty="No fees."
        columns={[
          {
            label: '',
            className: 'w-8',
            render: (row) =>
              canAct && payable(row) ? (
                <input
                  type="checkbox"
                  aria-label={`Pay ${row.description}`}
                  className="h-4 w-4 accent-indigo-600"
                  checked={selected.includes(row.id)}
                  onChange={(event) =>
                    setSelected(
                      event.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id),
                    )
                  }
                />
              ) : null,
          },
          {
            label: 'Fee',
            render: (row) => {
              const fine = lateFine(row, data)
              return (
                <div>
                  <p className="font-semibold text-slate-900">{row.description}</p>
                  <p className="text-xs text-slate-500">
                    {row.head} · semester {row.semester}
                  </p>
                  {fine > 0 &&
                    !data.charges.some((item) => item.ref === row.id && item.head === 'Late fine') && (
                      <p className="text-xs text-rose-700">
                        Late fee of {rupees(fine)} applies ({rupees(policy.lateFine.perDay)}/day after the due
                        date, max {rupees(policy.lateFine.max)}).
                      </p>
                    )}
                </div>
              )
            },
          },
          {
            label: 'Amount',
            render: (row) => (
              <div>
                <p>{rupees(net(row))}</p>
                {row.concession > 0 && (
                  <p className="text-xs text-emerald-700">after {rupees(row.concession)} concession</p>
                )}
              </div>
            ),
          },
          { label: 'Left to pay', render: (row) => rupees(outstanding(row, data)) },
          { label: 'Due', render: (row) => formatDate(row.dueDate) },
          {
            label: 'Status',
            render: (row) => (
              <StatusBadge tone={statusTone(chargeStatus(row, data))}>{chargeStatus(row, data)}</StatusBadge>
            ),
          },
        ]}
      />
      {canAct && (
        <div className="mt-5 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-end sm:justify-between">
          <Field label="Pay with">
            <select
              className="form-input bg-white sm:w-48"
              value={method}
              onChange={(event) => setMethod(event.target.value as Payment['method'])}
            >
              <option>UPI</option>
              <option>Card</option>
              <option>Net banking</option>
            </select>
          </Field>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <Button onClick={submit} disabled={!selected.length || busy}>
              <CreditCard size={16} /> {busy ? 'Processing…' : `Pay ${rupees(total)}`}
            </Button>
            <span className="text-[11px] text-slate-500">Test payment gateway – no real money moves.</span>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-3">
          <Callout tone="error">{error}</Callout>
        </div>
      )}
      {paid && (
        <div className="mt-3">
          <Callout tone="ok">
            Paid {rupees(paid.amount)}. Receipt {paid.receiptNo}. Download it from Payments below.
          </Callout>
        </div>
      )}
    </Card>
  )
}

function PaymentsCard() {
  const { data, student, canAct, commit } = useStudent()
  const { busy, run } = useAction()
  const [ticketFor, setTicketFor] = useState<string[]>([])
  const payments = data.payments
    .filter((row) => row.studentId === student.id)
    .sort((a, b) => b.createdOn.localeCompare(a.createdOn))
  const stuck = (payment: Payment) =>
    payment.status === 'Pending' &&
    Date.now() - new Date(payment.createdOn).getTime() > policy.paymentPendingHours * 3_600_000

  const receipt = async (payment: Payment) => {
    const { doc, op } = issueDocument(student, 'Fee receipt', `Fee receipt ${payment.receiptNo}`, payment.id)
    if (!(await commit([op]))) return
    await downloadPdf(
      {
        title: 'Fee receipt',
        serial: doc.serial,
        student,
        facts: [
          ['Receipt no.', payment.receiptNo ?? ''],
          ['Transaction', payment.gatewayRef],
          ['Paid on', formatDate((payment.confirmedOn ?? payment.createdOn).slice(0, 10))],
          ['Method', payment.method],
          ['Amount', inr(payment.amount)],
        ],
        tables: [
          {
            head: ['Fee', 'Head', 'Amount'],
            widths: [110, 38, 30],
            rows: payment.allocations.map((allocation) => {
              const charge = data.charges.find((item) => item.id === allocation.chargeId)
              return [charge?.description ?? allocation.chargeId, charge?.head ?? '', inr(allocation.amount)]
            }),
          },
        ],
      },
      `receipt-${payment.receiptNo}.pdf`,
    )
  }

  return (
    <Card
      title="Payments"
      description="Payments the bank hasn't confirmed show as Processing and never as Due."
    >
      <DataTable
        rows={payments}
        rowKey={(row) => row.id}
        empty="No payments yet."
        columns={[
          { label: 'Date', render: (row) => formatDate(row.createdOn.slice(0, 10)) },
          { label: 'Amount', render: (row) => rupees(row.amount) },
          { label: 'Method', render: (row) => `${row.method} · ${row.gatewayRef}` },
          {
            label: 'Status',
            render: (row) => (
              <StatusBadge tone={statusTone(row.status)}>
                {row.status === 'Pending' ? 'Processing' : row.status}
              </StatusBadge>
            ),
          },
          {
            label: '',
            render: (row) =>
              row.status === 'Success' ? (
                <Button size="sm" tone="secondary" onClick={() => void receipt(row)}>
                  <Download size={14} /> Receipt
                </Button>
              ) : stuck(row) && canAct ? (
                ticketFor.includes(row.id) ||
                data.tickets.some(
                  (ticket) => ticket.studentId === student.id && ticket.subject.includes(row.gatewayRef),
                ) ? (
                  <span className="text-xs text-slate-500">Ticket raised with Accounts</span>
                ) : (
                  <Button
                    size="sm"
                    tone="secondary"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        raiseTicket(
                          student.id,
                          student.name,
                          'Fees',
                          `Payment ${row.gatewayRef} debited but not confirmed`,
                          `${rupees(row.amount)} by ${row.method} on ${formatDate(row.createdOn.slice(0, 10))} (bank reference ${row.gatewayRef}) is still processing after ${policy.paymentPendingHours} hours.`,
                        ),
                        () => setTicketFor([...ticketFor, row.id]),
                      )
                    }
                  >
                    Still processing? Raise a ticket
                  </Button>
                )
              ) : null,
          },
        ]}
      />
    </Card>
  )
}

function SettlementsCard() {
  const { data, student, canAct, commit } = useStudent()
  const items = data.settlements
    .filter((row) => row.studentId === student.id)
    .sort((a, b) => b.createdOn.localeCompare(a.createdOn))
  if (!items.length) return null
  const creditNote = async (item: Settlement) => {
    const { doc, op } = issueDocument(student, 'Credit note', `Credit note ${item.creditNoteNo}`, item.id)
    if (!(await commit([op]))) return
    const target = data.charges.find((charge) => charge.id === item.toChargeId)
    await downloadPdf(
      {
        title: 'Credit note',
        serial: doc.serial,
        student,
        facts: [
          ['Credit note no.', item.creditNoteNo ?? ''],
          ['Type', item.kind],
          ['Amount', inr(item.amount)],
          ['Approved', item.approvedOn ? formatDate(item.approvedOn) : ''],
        ],
        tables: [
          {
            head: ['Reason', item.kind === 'Adjustment' ? 'Applied to' : 'Paid to'],
            widths: [100, 78],
            rows: [
              [
                item.reason,
                item.kind === 'Adjustment'
                  ? (target?.description ?? '')
                  : `Original payment method${item.bankRef ? ` (ref ${item.bankRef})` : ''}`,
              ],
            ],
          },
        ],
      },
      `credit-note-${item.creditNoteNo}.pdf`,
    )
  }
  return (
    <Card
      title="Refunds & adjustments"
      description={`Accounts approves within ${policy.refund.approveWorkingDays} working days; refunds reach your original payment method within ${policy.refund.creditWorkingDays} working days of approval.`}
    >
      <DataTable
        rows={items}
        rowKey={(row) => row.id}
        empty=""
        columns={[
          {
            label: 'Type',
            render: (row) => (
              <div>
                <p className="font-semibold">
                  {row.kind} · {rupees(row.amount)}
                </p>
                <p className="text-xs text-slate-500">{row.reason}</p>
              </div>
            ),
          },
          {
            label: 'Progress',
            render: (row) => {
              const deadlines = refundDeadlines(row)
              return (
                <div className="space-y-1 text-xs">
                  <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
                  {row.status === 'Requested' && <p>Approval due by {formatDate(deadlines.approveBy)}</p>}
                  {row.kind === 'Refund' && row.status === 'Approved' && deadlines.creditBy && (
                    <p>Credit due by {formatDate(deadlines.creditBy)}</p>
                  )}
                  {row.bankRef && <p>Bank reference {row.bankRef}</p>}
                </div>
              )
            },
          },
          {
            label: '',
            render: (row) =>
              row.creditNoteNo && canAct ? (
                <Button size="sm" tone="secondary" onClick={() => void creditNote(row)}>
                  <FileText size={14} /> Credit note
                </Button>
              ) : null,
          },
        ]}
      />
    </Card>
  )
}

function LedgerCard() {
  const { data, student } = useStudent()
  const entries = ledger(student.id, data).reverse()
  return (
    <Card
      title="Ledger"
      description="Every charge, payment, adjustment and refund, with the running balance (negative means credit)."
    >
      <DataTable
        rows={entries}
        rowKey={(row) => `${row.date}-${row.description}-${row.balance}`}
        empty="No entries."
        columns={[
          { label: 'Date', render: (row) => formatDate(row.date.slice(0, 10)) },
          {
            label: 'Entry',
            render: (row) => (
              <div>
                <p>{row.description}</p>
                {row.note && <p className="text-xs text-slate-500">{row.note}</p>}
              </div>
            ),
          },
          { label: 'Debit', render: (row) => (row.debit ? rupees(row.debit) : '') },
          { label: 'Credit', render: (row) => (row.credit ? rupees(row.credit) : '') },
          { label: 'Balance', render: (row) => <span className="font-semibold">{rupees(row.balance)}</span> },
        ]}
      />
    </Card>
  )
}

function ScholarshipsCard() {
  const { data, student } = useStudent()
  const items = data.scholarships.filter((row) => row.studentId === student.id)
  return (
    <Card title="Scholarships">
      <DataTable
        rows={items}
        rowKey={(row) => row.id}
        empty="No scholarship applications on record."
        columns={[
          {
            label: 'Scholarship',
            render: (row) => (
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="text-xs text-slate-500">{row.portal}</p>
              </div>
            ),
          },
          { label: 'Amount', render: (row) => rupees(row.amount) },
          {
            label: 'Status',
            render: (row) => (
              <StatusBadge
                tone={statusTone(
                  row.status === 'Credited' ? 'Credited' : row.status === 'Rejected' ? 'Rejected' : 'Pending',
                )}
              >
                {row.status}
              </StatusBadge>
            ),
          },
          { label: 'Expected', render: (row) => (row.expectedOn ? formatDate(row.expectedOn) : '—') },
        ]}
      />
    </Card>
  )
}

// April–March financial years with at least one payment
function CertificateCard() {
  const { data, student, canAct, commit } = useStudent()
  const payments = data.payments.filter((row) => row.studentId === student.id && row.status === 'Success')
  const yearOf = (date: string) => {
    const [year, month] = date.split('-').map(Number)
    return month >= 4 ? year : year - 1
  }
  const years = [
    ...new Set(payments.map((row) => yearOf((row.confirmedOn ?? row.createdOn).slice(0, 10)))),
  ].sort((a, b) => b - a)
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear())
  const download = async () => {
    const label = `${year}-${String(year + 1).slice(2)}`
    const { doc, op } = issueDocument(student, 'Fee certificate', `Fee certificate ${label}`, label)
    if (!(await commit([op]))) return
    const inYear = payments.filter((row) => yearOf((row.confirmedOn ?? row.createdOn).slice(0, 10)) === year)
    const byHead = new Map<string, number>()
    for (const payment of inYear)
      for (const allocation of payment.allocations) {
        const head = data.charges.find((charge) => charge.id === allocation.chargeId)?.head ?? 'Other'
        byHead.set(head, (byHead.get(head) ?? 0) + allocation.amount)
      }
    const total = inYear.reduce((sum, row) => sum + row.amount, 0)
    await downloadPdf(
      {
        title: `Fee certificate – financial year ${label}`,
        serial: doc.serial,
        student,
        facts: [
          ['Financial year', `1 Apr ${year} – 31 Mar ${year + 1}`],
          ['Total paid', inr(total)],
        ],
        tables: [
          {
            head: ['Fee head', 'Amount paid'],
            widths: [120, 58],
            rows: [...byHead.entries()].map(([head, amount]) => [head, inr(amount)]),
          },
        ],
        notes: [
          'Issued for income-tax and education-loan purposes. Refunds made in the year are not deducted here; see the ledger.',
        ],
      },
      `fee-certificate-${label}.pdf`,
    )
  }
  return (
    <Card
      title="Annual fee certificate"
      description="For income-tax (section 80C) and education-loan claims."
    >
      {years.length === 0 ? (
        <p className="text-sm text-slate-500">No payments yet.</p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Financial year">
            <select
              className="form-input sm:w-40"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}-{String(item + 1).slice(2)}
                </option>
              ))}
            </select>
          </Field>
          {canAct && (
            <Button tone="secondary" onClick={() => void download()}>
              <Download size={16} /> Download certificate
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
