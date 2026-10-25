import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button, Callout, Card, DataTable, Field, StatusBadge, Tabs } from '../../components/ui'
import {
  approveSettlement,
  balanceDue,
  chargeStatus,
  credit,
  lateFineOps,
  net,
  outstanding,
  reconcile,
  refundDeadlines,
  settlementOps,
  settlementPlan,
} from '../../domain/fees'
import { notify } from '../../domain/notify'
import { patch, rupees, today, uid, upsert } from '../../ops'
import { useAction, useCampus } from '../../store'
import type { FeeHead, Scholarship, Settlement } from '../../types'
import { formatDate } from '../../utils'
import { ExportButton, HelpdeskQueue, NoticesManager, useStudentName } from './shared'

type Tab = 'settlements' | 'credit' | 'payments' | 'charges' | 'scholarships' | 'helpdesk' | 'notices'

export function AccountsOffice() {
  const { data } = useCampus()
  const [tab, setTab] = useState<Tab>('settlements')
  return (
    <div className="space-y-6">
      <Tabs
        label="Accounts"
        value={tab}
        onChange={setTab}
        tabs={[
          {
            key: 'settlements',
            label: 'Refunds & adjustments',
            badge: data.settlements.filter((row) => row.status === 'Requested').length,
          },
          {
            key: 'credit',
            label: 'Students with credit',
            badge: data.students.filter((row) => credit(row.id, data) > 0).length,
          },
          {
            key: 'payments',
            label: 'Payments & reconciliation',
            badge: data.payments.filter((row) => row.status === 'Pending').length,
          },
          { key: 'charges', label: 'Fees & fines' },
          { key: 'scholarships', label: 'Scholarships' },
          { key: 'helpdesk', label: 'Helpdesk' },
          { key: 'notices', label: 'Notices' },
        ]}
      />
      {tab === 'settlements' && <Settlements />}
      {tab === 'credit' && <CreditDesk />}
      {tab === 'payments' && <PaymentsDesk />}
      {tab === 'charges' && <ChargesDesk />}
      {tab === 'scholarships' && <ScholarshipsDesk />}
      {tab === 'helpdesk' && <HelpdeskQueue office="accounts" />}
      {tab === 'notices' && <NoticesManager />}
    </div>
  )
}

function Settlements() {
  const { data, actor } = useCampus()
  const name = useStudentName()
  const { error, busy, run } = useAction()
  const items = [...data.settlements].sort(
    (a, b) =>
      ['Requested', 'Approved', 'Sent', 'Credited', 'Rejected'].indexOf(a.status) -
      ['Requested', 'Approved', 'Sent', 'Credited', 'Rejected'].indexOf(b.status),
  )
  const act = (item: Settlement) => {
    if (item.status === 'Requested')
      return (
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            disabled={busy || item.createdBy === actor.name}
            title={
              item.createdBy === actor.name
                ? 'Another Accounts user must approve what you created'
                : undefined
            }
            onClick={() => {
              const result = approveSettlement(item, actor.name)
              void run({
                ...result,
                ops: [
                  ...result.ops,
                  notify(
                    item.studentId,
                    'fees',
                    `${item.kind} of ${rupees(item.amount)} approved`,
                    item.kind === 'Refund'
                      ? 'The refund will be sent to your original payment method.'
                      : 'The amount has been applied to your due fees.',
                  ),
                ],
              })
            }}
          >
            Approve
          </Button>
          <Button
            size="sm"
            tone="danger"
            disabled={busy || item.createdBy === actor.name}
            onClick={() =>
              void run({
                ops: [
                  patch('settlements', item.id, {
                    status: 'Rejected',
                    approvedBy: actor.name,
                    approvedOn: today(),
                  }),
                ],
              })
            }
          >
            Reject
          </Button>
        </div>
      )
    if (item.kind === 'Refund' && item.status === 'Approved')
      return (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => {
            // shortcut: the test gateway has no refund API; a real gateway returns this reference
            const bankRef = `RFND-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
            void run({
              ops: [
                patch('settlements', item.id, { status: 'Sent', bankRef, sentOn: today() }),
                notify(
                  item.studentId,
                  'fees',
                  `Refund of ${rupees(item.amount)} sent`,
                  `Bank reference ${bankRef}.`,
                ),
              ],
            })
          }}
        >
          Send refund
        </Button>
      )
    if (item.status === 'Sent')
      return (
        <Button
          size="sm"
          tone="secondary"
          disabled={busy}
          onClick={() =>
            void run({
              ops: [
                patch('settlements', item.id, { status: 'Credited', creditedOn: today() }),
                notify(
                  item.studentId,
                  'fees',
                  `Refund of ${rupees(item.amount)} credited`,
                  'Check your bank statement.',
                ),
              ],
            })
          }
        >
          Mark credited
        </Button>
      )
    return null
  }
  return (
    <Card
      title="Refunds & adjustments"
      description="Maker–checker: whoever prepared an item can't approve it. Approve within 7 working days; credit refunds within 15."
      action={
        <ExportButton
          rows={items.map(
            ({ studentId, kind, amount, status, createdBy, approvedBy, bankRef, createdOn }) => ({
              student: name(studentId),
              kind,
              amount,
              status,
              createdBy,
              approvedBy,
              bankRef,
              createdOn,
            }),
          )}
          filename="settlements.csv"
        />
      }
    >
      {error && (
        <div className="mb-4">
          <Callout tone="error">{error}</Callout>
        </div>
      )}
      <DataTable
        rows={items}
        rowKey={(row) => row.id}
        empty="Nothing to settle."
        columns={[
          { label: 'Student', render: (row) => name(row.studentId) },
          {
            label: 'Item',
            render: (row) => (
              <div>
                <p className="font-semibold">
                  {row.kind} · {rupees(row.amount)}
                </p>
                <p className="text-xs text-slate-500">{row.reason}</p>
                {row.toChargeId && (
                  <p className="text-xs text-slate-500">
                    To: {data.charges.find((charge) => charge.id === row.toChargeId)?.description}
                  </p>
                )}
              </div>
            ),
          },
          {
            label: 'Status',
            render: (row) => (
              <div className="space-y-1 text-xs">
                <StatusBadge>{row.status}</StatusBadge>
                <p>
                  Prepared by {row.createdBy}, {formatDate(row.createdOn)}
                </p>
                {row.approvedBy && (
                  <p>
                    {row.status === 'Rejected' ? 'Rejected' : 'Approved'} by {row.approvedBy}
                  </p>
                )}
                {row.status === 'Requested' && today() > refundDeadlines(row).approveBy && (
                  <StatusBadge tone="red">Past approval deadline</StatusBadge>
                )}
              </div>
            ),
          },
          { label: 'Action', render: act },
        ]}
      />
    </Card>
  )
}

function CreditDesk() {
  const { data, actor } = useCampus()
  const { error, busy, run } = useAction()
  const students = data.students.filter((row) => credit(row.id, data) > 0)
  const duplicates = new Set(
    reconcile(data)
      .filter((op) => op.type === 'upsert' && op.key === 'settlements')
      .map((op) => (op.type === 'upsert' ? (op.row as Settlement).studentId : '')),
  )
  return (
    <Card
      title="Students with credit"
      description="Money from withdrawn papers or overpayments. Preparing a settlement applies it to the student's oldest dues first and refunds the rest; another Accounts user approves it."
    >
      {error && (
        <div className="mb-4">
          <Callout tone="error">{error}</Callout>
        </div>
      )}
      <DataTable
        rows={students}
        rowKey={(row) => row.id}
        empty="No student has credit."
        columns={[
          { label: 'Student', render: (row) => row.name },
          { label: 'Credit', render: (row) => rupees(credit(row.id, data)) },
          {
            label: 'Plan',
            render: (row) => {
              const plan = settlementPlan(row.id, data)
              return (
                <ul className="text-xs">
                  {plan.adjustments.map((item) => (
                    <li key={item.chargeId}>
                      Adjust {rupees(item.amount)} to{' '}
                      {data.charges.find((charge) => charge.id === item.chargeId)?.description}
                    </li>
                  ))}
                  {plan.refund > 0 && <li>Refund {rupees(plan.refund)}</li>}
                </ul>
              )
            },
          },
          {
            label: '',
            render: (row) =>
              // a charge paid twice through the gateway is always refunded, never adjusted (FR-FEE-07)
              duplicates.has(row.id) ? (
                <span className="text-xs text-amber-700">
                  Duplicate payment found – run reconciliation to refund it first.
                </span>
              ) : (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run({
                      ops: settlementOps(
                        row.id,
                        data,
                        actor.name,
                        'Credit from withdrawn papers or overpayment',
                        `credit-${row.id}-${today()}`,
                      ),
                    })
                  }
                >
                  Prepare settlement
                </Button>
              ),
          },
        ]}
      />
    </Card>
  )
}

function PaymentsDesk() {
  const { data } = useCampus()
  const name = useStudentName()
  const { error, busy, run } = useAction()
  const [message, setMessage] = useState('')
  const payments = [...data.payments].sort((a, b) => b.createdOn.localeCompare(a.createdOn))
  return (
    <Card
      title="Payments"
      description="Reconciliation matches payments against the bank: pending payments are confirmed and charges paid twice are refunded automatically (FR-FEE-07). Runs hourly in production."
      action={
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => {
              const ops = reconcile(data)
              void run({ ops }, () =>
                setMessage(
                  ops.length
                    ? `${ops.length} change(s) from reconciliation.`
                    : 'Everything already matches the bank.',
                ),
              )
            }}
          >
            <RefreshCw size={14} /> Run reconciliation
          </Button>
          <ExportButton
            rows={payments.map(({ receiptNo, gatewayRef, studentId, amount, method, status, createdOn }) => ({
              receiptNo,
              gatewayRef,
              student: name(studentId),
              amount,
              method,
              status,
              createdOn,
            }))}
            filename="payments.csv"
          />
        </div>
      }
    >
      {message && (
        <div className="mb-4">
          <Callout tone="ok">{message}</Callout>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Callout tone="error">{error}</Callout>
        </div>
      )}
      <DataTable
        rows={payments}
        rowKey={(row) => row.id}
        empty="No payments."
        columns={[
          { label: 'Date', render: (row) => formatDate(row.createdOn.slice(0, 10)) },
          { label: 'Student', render: (row) => name(row.studentId) },
          { label: 'Amount', render: (row) => rupees(row.amount) },
          {
            label: 'Reference',
            render: (row) => (
              <span className="text-xs">
                {row.receiptNo ?? '—'} · {row.gatewayRef}
              </span>
            ),
          },
          {
            label: 'Status',
            render: (row) => (
              <StatusBadge
                tone={row.status === 'Success' ? 'green' : row.status === 'Failed' ? 'red' : 'amber'}
              >
                {row.status}
              </StatusBadge>
            ),
          },
        ]}
      />
    </Card>
  )
}

const heads: FeeHead[] = ['Tuition', 'Exam', 'Hostel', 'Transport', 'Library']

function ChargesDesk() {
  const { data } = useCampus()
  const name = useStudentName()
  const { error, busy, run } = useAction()
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    studentId: data.students[0]?.id ?? '',
    head: 'Tuition' as FeeHead,
    description: '',
    amount: '',
    concession: '0',
    dueDate: '',
    ref: '',
  })
  const add = (event: React.FormEvent) => {
    event.preventDefault()
    const amount = Number(form.amount)
    const concession = Number(form.concession)
    const student = data.students.find((row) => row.id === form.studentId)
    if (
      !student ||
      !form.description.trim() ||
      !(amount > 0) ||
      concession < 0 ||
      concession > amount ||
      !form.dueDate
    )
      return void run({
        ops: [],
        error: 'Fill in every field; the concession can’t be more than the amount.',
      })
    void run(
      {
        ops: [
          upsert('charges', {
            id: uid('charge'),
            studentId: student.id,
            semester: student.semester,
            head: form.head,
            description: form.description.trim(),
            amount,
            concession,
            dueDate: form.dueDate,
            createdOn: today(),
            ref: form.ref || null,
          }),
          notify(
            student.id,
            'fees',
            `New fee: ${form.description.trim()}`,
            `${rupees(amount - concession)} due by ${formatDate(form.dueDate)}.`,
          ),
        ],
      },
      () => setForm({ ...form, description: '', amount: '', concession: '0', ref: '' }),
    )
  }
  const charges = [...data.charges].sort((a, b) => b.createdOn.localeCompare(a.createdOn))
  return (
    <div className="space-y-6">
      <Card title="Add a fee or concession">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Student">
            <select
              className="form-input"
              value={form.studentId}
              onChange={(event) => setForm({ ...form, studentId: event.target.value })}
            >
              {data.students.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Head">
            <select
              className="form-input"
              value={form.head}
              onChange={(event) => setForm({ ...form, head: event.target.value as FeeHead })}
            >
              {heads.map((head) => (
                <option key={head}>{head}</option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <input
              className="form-input"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
          <Field label="Due date">
            <input
              type="date"
              className="form-input"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
          </Field>
          <Field label="Amount (₹)">
            <input
              className="form-input"
              inputMode="numeric"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value.replace(/\D/g, '') })}
            />
          </Field>
          <Field label="Concession (₹)">
            <input
              className="form-input"
              inputMode="numeric"
              value={form.concession}
              onChange={(event) => setForm({ ...form, concession: event.target.value.replace(/\D/g, '') })}
            />
          </Field>
          <Field label="Exam session (exam fees)" hint="Unpaid exam fees block that session's hall ticket.">
            <select
              className="form-input"
              value={form.ref}
              onChange={(event) => setForm({ ...form, ref: event.target.value })}
            >
              <option value="">—</option>
              {data.examSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={busy} className="self-end">
            Add fee
          </Button>
          {error && (
            <div className="sm:col-span-2 lg:col-span-4">
              <Callout tone="error">{error}</Callout>
            </div>
          )}
        </form>
      </Card>
      <Card
        title="All fees"
        action={
          <Button
            size="sm"
            disabled={busy}
            onClick={() => {
              const ops = lateFineOps(data)
              void run({ ops }, () =>
                setMessage(
                  ops.length ? `Applied or updated ${ops.length} late fine(s).` : 'No late fines due.',
                ),
              )
            }}
          >
            Apply late fines
          </Button>
        }
      >
        {message && (
          <div className="mb-4">
            <Callout tone="ok">{message}</Callout>
          </div>
        )}
        <DataTable
          rows={charges}
          rowKey={(row) => row.id}
          empty="No fees."
          columns={[
            { label: 'Student', render: (row) => name(row.studentId) },
            {
              label: 'Fee',
              render: (row) => (
                <div>
                  <p>{row.description}</p>
                  <p className="text-xs text-slate-500">{row.head}</p>
                </div>
              ),
            },
            { label: 'Net', render: (row) => rupees(net(row)) },
            { label: 'Left', render: (row) => rupees(outstanding(row, data)) },
            { label: 'Due', render: (row) => formatDate(row.dueDate) },
            { label: 'Status', render: (row) => <StatusBadge>{chargeStatus(row, data)}</StatusBadge> },
          ]}
        />
        <div className="mt-4">
          <ExportButton
            rows={data.students.map((row) => ({
              student: row.name,
              enrolment_no: row.enrolmentNo,
              due: balanceDue(row.id, data),
              credit: credit(row.id, data),
            }))}
            filename="fee-balances.csv"
            label="Export balances"
          />
        </div>
      </Card>
    </div>
  )
}

function ScholarshipsDesk() {
  const { data } = useCampus()
  const name = useStudentName()
  const { busy, run } = useAction()
  const statuses: Scholarship['status'][] = ['Applied', 'Verified', 'Sanctioned', 'Credited', 'Rejected']
  return (
    <Card title="Scholarships" description="Status as reported by the university and government portals.">
      <DataTable
        rows={data.scholarships}
        rowKey={(row) => row.id}
        empty="No scholarships."
        columns={[
          { label: 'Student', render: (row) => name(row.studentId) },
          {
            label: 'Scholarship',
            render: (row) => (
              <div>
                <p>{row.name}</p>
                <p className="text-xs text-slate-500">
                  {row.portal} · {rupees(row.amount)}
                </p>
              </div>
            ),
          },
          {
            label: 'Status',
            render: (row) => (
              <select
                aria-label="Status"
                className="form-input h-9 text-xs"
                value={row.status}
                disabled={busy}
                onChange={(event) =>
                  void run({
                    ops: [
                      patch('scholarships', row.id, { status: event.target.value as Scholarship['status'] }),
                      notify(row.studentId, 'fees', `${row.name}: ${event.target.value}`, ''),
                    ],
                  })
                }
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            ),
          },
        ]}
      />
    </Card>
  )
}
