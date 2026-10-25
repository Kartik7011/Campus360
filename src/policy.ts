import type { FeeHead, OfficialDocumentKind, RecheckService, TicketCategory } from './types'

// University rules the app enforces. Each value is a policy decision (requirement.md §7), not a
// software choice: change it here and in supabase fee_rates, and the app and database follow.
export const policy = {
  attendanceRequired: 75,
  recheck: {
    windowDays: 10,
    slaDays: 14,
    fees: { Rechecking: 500, Revaluation: 1000, 'Answer-sheet copy': 300 } satisfies Record<
      RecheckService,
      number
    >,
  },
  examFees: { Back: 1500, Special: 2000 },
  documentFees: {
    Transcript: 1000,
    'Signed grade sheet': 500,
    'Degree certificate': 2000,
    'Migration certificate': 500,
    'Bonafide certificate': 0,
    'Character certificate': 0,
  } satisfies Record<OfficialDocumentKind, number>,
  examAttendance: { entryHours: 48, disputeDays: 7 },
  hallTicketWarningDays: 7,
  // late fine on overdue charges of these heads
  lateFine: { perDay: 50, max: 1000, heads: ['Tuition', 'Hostel', 'Transport', 'Exam'] as FeeHead[] },
  withdrawal: {
    // share of the fee refunded when a student withdraws by choice before the application deadline;
    // nothing after hall tickets are issued; duplicates and rejected special exams are always refunded in full
    beforeDeadline: 1,
    afterDeadline: 0.5,
  },
  refund: { approveWorkingDays: 7, creditWorkingDays: 15 },
  paymentPendingHours: 48,
  helpdeskSlaDays: {
    'Data correction': 5,
    Fees: 3,
    Exams: 3,
    Placements: 3,
    Other: 5,
  } satisfies Record<TicketCategory, number>,
  // offer policy: one offer per student, except for openings marked as dream
  onePlacementOffer: true,
  mentorWarnings: { cgpaDrop: 0.5 },
  staleSyncHours: 26,
  sessionTimeoutMinutes: { staff: 30, student: 7 * 24 * 60 },
  maxUploadBytes: 5 * 1024 * 1024,
}

// which office handles each helpdesk category
export const ticketOffice: Record<TicketCategory, string> = {
  'Data correction': 'exam',
  Fees: 'accounts',
  Exams: 'exam',
  Placements: 'placement',
  Other: 'registrar',
}

export const faqs: { q: string; a: string; category: TicketCategory }[] = [
  {
    q: 'My CGPA or marks look wrong. What do I do?',
    a: 'Marks come from the university record. If a mark is wrong, apply for rechecking or revaluation during the window on the Exams page. For other data errors (name, branch, attendance), raise a Data correction ticket.',
    category: 'Data correction',
  },
  {
    q: 'Money was debited but my fee still shows as due.',
    a: 'Payments still being confirmed by the bank show as Processing, not Due. Most are confirmed within a few hours. If it is still processing after 48 hours, use “Raise a ticket” on that payment.',
    category: 'Fees',
  },
  {
    q: 'Why can’t I download my hall ticket?',
    a: 'The Exams page lists exactly what is blocking it: an unpaid exam fee, attendance detention or debarment, with what to do about each.',
    category: 'Exams',
  },
  {
    q: 'I applied for the wrong exam (back instead of special).',
    a: 'Open the application on the Exams page and request withdrawal of that subject before hall tickets are issued. Any fee is adjusted against your dues or refunded.',
    category: 'Exams',
  },
  {
    q: 'Why does a company show “Cannot determine”?',
    a: 'Some data needed for a rule is missing from your record or the company criteria. The rule list names what is missing and who can fix it. Missing data is never treated as a pass.',
    category: 'Placements',
  },
]
