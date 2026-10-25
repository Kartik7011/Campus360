export type ViewKey =
  | 'dashboard'
  | 'academic'
  | 'results'
  | 'exams'
  | 'fees'
  | 'notices'
  | 'placements'
  | 'resume'
  | 'help'
  | 'profile'
  | 'admin'

export type NoticeCategory = 'Academic' | 'Placement' | 'Rechecking' | 'Exams' | 'Fees'
export type Priority = 'High' | 'Medium' | 'Low'
export type EligibilityStatus = 'Eligible' | 'Not Eligible' | 'Cannot Determine'
export type RuleStatus = 'Pass' | 'Fail' | 'Unknown'
export type PlacementStage = 'Applied' | 'Aptitude' | 'Technical' | 'HR' | 'Selected' | 'Rejected'

// staff roles, each limited to its own office's work (requirement.md §2)
export type StaffRole = 'admin' | 'exam' | 'accounts' | 'placement' | 'mentor' | 'hod' | 'dean' | 'registrar'

export interface Student {
  id: string
  name: string
  initials: string
  email: string
  phone: string
  enrolmentNo: string
  apaarId: string | null
  school: string
  semester: number
  branch: string
  program: string
  batch: number
  lateralEntry: boolean
  status: 'Enrolled' | 'Graduated'
  mentorId: string
  cgpa: number | null
  activeBacklogs: number | null
  backlogSubjects?: string[]
  debarred: boolean | null
  debarredReason?: string | null
  graduationYear: number | null
  attendance: number
  creditsCompleted: number
  totalCredits: number
  skills: string[]
  profileNote: string
  // where the record came from and when it was last synced (FR-PRO-02)
  source: string
  syncedAt: string
}

export interface Staff {
  id: string
  name: string
  email: string
  role: StaffRole
  // department for mentors and HoDs; school for deans; empty for university-wide offices
  department: string
}

export interface Mentor {
  id: string
  name: string
  initials: string
  department: string
  email: string
  phone: string
  officeHours: string
  // weekly slots students can book, e.g. "Tue 14:00"
  slots: string[]
  availability: string
  focus: string
}

export interface NoticeTarget {
  schools?: string[]
  programs?: string[]
  semesters?: number[]
  batches?: number[]
  studentIds?: string[]
}

export interface Notice {
  id: string
  title: string
  category: NoticeCategory
  summary: string
  date: string
  deadline?: string
  priority: Priority
  audience: string
  source: string
  // no target means everyone
  target?: NoticeTarget | null
  mandatory?: boolean
}

export interface NoticeRead {
  id: string
  noticeId: string
  studentId: string
  readOn: string
}

export interface AppNotification {
  id: string
  studentId: string
  title: string
  body: string
  view: ViewKey
  createdOn: string
  readOn?: string | null
}

// ── Courses, results and documents ──────────────────────────────────────────

export interface Course {
  id: string
  code: string
  title: string
  credits: number
  semester: number
  branch: string
}

export interface MarkComponent {
  name: string
  obtained: number | null
  max: number
}

export type Attempt = 'Regular' | 'Back' | 'Special'

export interface CourseResult {
  id: string
  studentId: string
  courseCode: string
  semester: number
  sessionId: string
  attempt: Attempt
  components: MarkComponent[]
  total: number | null
  grade: string | null
  gradePoints: number | null
  passed: boolean | null
  // Provisional rows carry internal marks only, before the result is declared
  status: 'Provisional' | 'Declared'
}

export interface SemesterResult {
  id: string
  studentId: string
  semester: number
  sessionId: string
  sgpa: number | null
  cgpa: number | null
  creditsEarned: number
  creditsRegistered: number
  status: 'Pass' | 'Pass with backlog' | 'Withheld' | 'Detained' | 'Awaited'
  withheldReason?: string | null
  declaredOn: string | null
}

export type MarkChangeReason = 'Rechecking' | 'Revaluation' | 'Moderation' | 'Grace marks' | 'Correction'

export interface MarkChange {
  id: string
  resultId: string
  studentId: string
  courseCode: string
  fromTotal: number
  toTotal: number
  fromGrade: string
  toGrade: string
  reason: MarkChangeReason
  note: string
  changedOn: string
}

export interface CreditTransfer {
  id: string
  studentId: string
  source: string
  course: string
  credits: number
  approvedOn: string
}

export type IssuedDocumentKind =
  | 'Grade sheet'
  | 'Consolidated marks statement'
  | 'Fee receipt'
  | 'Credit note'
  | 'Hall ticket'
  | 'Fee certificate'

export interface IssuedDocument {
  id: string
  serial: string
  studentId: string
  kind: IssuedDocumentKind
  title: string
  // semester for grade sheets, payment or adjustment id for receipts and credit notes
  ref: string
  issuedOn: string
  supersededOn?: string | null
}

export type OfficialDocumentKind =
  | 'Transcript'
  | 'Signed grade sheet'
  | 'Degree certificate'
  | 'Migration certificate'
  | 'Bonafide certificate'
  | 'Character certificate'

export interface DocumentRequest {
  id: string
  studentId: string
  kind: OfficialDocumentKind
  copies: number
  delivery: 'Collect' | 'Post' | 'Email'
  address: string
  purpose: string
  requestedOn: string
  status: 'Requested' | 'Processing' | 'Ready' | 'Dispatched' | 'Collected' | 'Rejected'
  remarks: string
}

// ── Attendance ──────────────────────────────────────────────────────────────

export interface CourseAttendance {
  id: string
  studentId: string
  courseCode: string
  semester: number
  held: number
  attended: number
  updatedOn: string
}

export interface CondonationRequest {
  id: string
  studentId: string
  courseCode: string
  reason: 'Medical' | 'Official university duty'
  details: string
  files: UploadedFile[]
  requestedOn: string
  decision?: 'Approved' | 'Rejected' | null
  decisionReason?: string | null
  decidedBy?: string | null
  decidedOn?: string | null
}

export interface UploadedFile {
  name: string
  size: number
  // storage path when a database is connected; null in browser-only mode, where files aren't kept
  path: string | null
}

// ── Exams ───────────────────────────────────────────────────────────────────

export interface ExamSession {
  id: string
  name: string
  kind: 'End-term' | 'Back & special'
  semesterParity: 'Odd' | 'Even'
  startsOn: string
  endsOn: string
  applicationOpens?: string | null
  applicationCloses?: string | null
  hallTicketsFrom: string
  resultDeclaredOn?: string | null
}

export interface ExamPaper {
  id: string
  sessionId: string
  courseCode: string
  date: string
  slot: 'Morning' | 'Afternoon'
  time: string
  venue: string
}

export interface ExamRegistration {
  id: string
  studentId: string
  sessionId: string
  courseCode: string
  room?: string | null
  seat?: string | null
}

export type ExamAttendanceStatus = 'Present' | 'Absent' | 'Unfair means' | 'Debarred'

export interface AttendanceEntry {
  status: ExamAttendanceStatus
  by: string
  at: string
}

// exam-hall attendance for one student and paper, keyed in twice from the signed sheet (FR-EXA-02)
export interface ExamAttendance {
  id: string
  studentId: string
  sessionId: string
  courseCode: string
  entry1?: AttendanceEntry | null
  entry2?: AttendanceEntry | null
}

export interface ExamSheetScan {
  id: string
  sessionId: string
  courseCode: string
  file: UploadedFile
  uploadedBy: string
  uploadedOn: string
}

export interface AttendanceDispute {
  id: string
  studentId: string
  attendanceId: string
  hallTicketNo: string
  seatNo: string
  answerSheetBarcode: string
  raisedOn: string
  decision?: 'Upheld' | 'Rejected' | null
  decisionReason?: string | null
  decidedBy?: string | null
  decidedOn?: string | null
}

export interface UfmCase {
  id: string
  studentId: string
  sessionId: string
  courseCode: string
  status: 'Reported' | 'Hearing scheduled' | 'Decided'
  hearingOn?: string | null
  outcome?: string | null
}

export type RecheckService = 'Rechecking' | 'Revaluation' | 'Answer-sheet copy'

export interface RecheckRequest {
  id: string
  studentId: string
  service: RecheckService
  sessionId: string
  subject: string
  code: string
  requestDate: string
  // staff-set stages; "Fee confirmed" is derived from the fee being paid
  status: 'Submitted' | 'Under review' | 'Result published' | 'Rejected'
  remarks: string
  expectedBy: string
  outcome?: string | null
  closedOn?: string | null
}

export type ExamApplicationKind = 'Back' | 'Special'

export interface ExamApplication {
  id: string
  studentId: string
  sessionId: string
  kind: ExamApplicationKind
  // special exams only: why the paper was missed, in which session, with documents
  reason?: 'Medical' | 'Official university duty' | 'Timetable clash' | null
  missedSessionId?: string | null
  details: string
  files: UploadedFile[]
  submittedOn: string
  decision?: 'Approved' | 'Rejected' | null
  decisionReason?: string | null
  decidedBy?: string | null
  decidedOn?: string | null
  // records imported from the ERP predate the duplicate check
  source: 'Campus360' | 'ERP import'
}

export interface ExamApplicationItem {
  id: string
  applicationId: string
  studentId: string
  sessionId: string
  courseCode: string
  kind: ExamApplicationKind
  fee: number
  withdrawnOn?: string | null
  source: 'Campus360' | 'ERP import'
}

export interface WithdrawalRequest {
  id: string
  studentId: string
  applicationId: string
  itemIds: string[]
  reason: string
  requestedOn: string
  requestedBy: string
  decision?: 'Approved' | 'Rejected' | null
  decisionReason?: string | null
  decidedBy?: string | null
  decidedOn?: string | null
}

// ── Fees ────────────────────────────────────────────────────────────────────

export type FeeHead =
  | 'Tuition'
  | 'Exam'
  | 'Hostel'
  | 'Transport'
  | 'Library'
  | 'Late fine'
  | 'Back exam'
  | 'Special exam'
  | 'Rechecking'
  | 'Revaluation'
  | 'Answer-sheet copy'
  | 'Document'

export interface FeeCharge {
  id: string
  studentId: string
  semester: number
  head: FeeHead
  description: string
  amount: number
  concession: number
  dueDate: string
  createdOn: string
  // the request, application item or charge this fee belongs to
  ref?: string | null
  cancelledOn?: string | null
}

export interface PaymentAllocation {
  chargeId: string
  amount: number
}

export interface Payment {
  id: string
  studentId: string
  amount: number
  method: 'UPI' | 'Card' | 'Net banking'
  status: 'Success' | 'Pending' | 'Failed'
  gatewayRef: string
  receiptNo?: string | null
  createdOn: string
  confirmedOn?: string | null
  allocations: PaymentAllocation[]
  idempotencyKey: string
}

export interface Settlement {
  id: string
  studentId: string
  kind: 'Adjustment' | 'Refund'
  amount: number
  // adjustments move credit onto this charge
  toChargeId?: string | null
  reason: string
  ref?: string | null
  status: 'Requested' | 'Approved' | 'Rejected' | 'Sent' | 'Credited'
  createdBy: string
  createdOn: string
  approvedBy?: string | null
  approvedOn?: string | null
  bankRef?: string | null
  sentOn?: string | null
  creditedOn?: string | null
  creditNoteNo?: string | null
}

export interface Scholarship {
  id: string
  studentId: string
  name: string
  portal: string
  amount: number
  status: 'Applied' | 'Verified' | 'Sanctioned' | 'Credited' | 'Rejected'
  expectedOn?: string | null
}

// ── Helpdesk, mentoring, clearance ──────────────────────────────────────────

export type TicketCategory = 'Data correction' | 'Fees' | 'Exams' | 'Placements' | 'Other'

export interface TicketMessage {
  by: string
  role: 'student' | 'staff'
  text: string
  at: string
}

export interface Ticket {
  id: string
  studentId: string
  category: TicketCategory
  subject: string
  messages: TicketMessage[]
  createdOn: string
  status: 'Open' | 'In progress' | 'Resolved' | 'With grievance committee' | 'Closed'
  resolvedOn?: string | null
  committeeOutcome?: string | null
}

export interface MentorBooking {
  id: string
  studentId: string
  mentorId: string
  date: string
  slot: string
  topic: string
  status: 'Requested' | 'Confirmed' | 'Declined'
}

export interface MentorNote {
  id: string
  studentId: string
  mentorId: string
  text: string
  createdOn: string
}

export interface NoDuesItem {
  id: string
  studentId: string
  office: 'Library' | 'Hostel' | 'Accounts' | 'Department' | 'Placement cell'
  status: 'Pending' | 'Cleared'
  remarks: string
  clearedOn?: string | null
}

export interface CareerRecord {
  id: string
  studentId: string
  kind: 'Internship' | 'Offer letter'
  company: string
  role: string
  from: string
  to?: string | null
  file: UploadedFile
  verified: boolean
}

export interface Consent {
  id: string
  studentId: string
  privacyAcceptedOn?: string | null
  parentAccess: boolean
  parentEmail: string
  updatedOn: string
}

// ── Placements and resumes ──────────────────────────────────────────────────

export interface Company {
  id: string
  name: string
  initials: string
  sector: string
  location: string
  website: string
  description: string
  accent: string
}

export interface Opportunity {
  id: string
  companyId: string
  title: string
  location: string
  workMode: 'On-site' | 'Hybrid' | 'Remote'
  deadline: string
  posted: string
  minCgpa: number | null
  allowedBranches: string[]
  maxActiveBacklogs: number | null
  graduationYears?: number[]
  requiredSkills: string[]
  preferredSkills: string[]
  jobDescription: string
  package: string
  jobType: 'Full-time' | 'Internship + PPO'
  status: 'Open' | 'Closing soon' | 'Closed'
  // dream openings stay open to students who already hold an offer (offer policy)
  dream?: boolean
  criteriaVersion?: number
}

export interface CriteriaSnapshot {
  version: number
  minCgpa: number | null
  allowedBranches: string[]
  maxActiveBacklogs: number | null
  graduationYears: number[]
}

export type SharedField = 'Resume' | 'CGPA' | 'Phone' | 'Email' | 'Backlogs'

export interface PlacementApplication {
  id: string
  studentId: string
  opportunityId: string
  stage: PlacementStage
  appliedOn: string
  note: string
  criteria?: CriteriaSnapshot | null
  shared?: SharedField[]
  // set when the placement cell let an application through that the rules would block
  overrideReason?: string | null
}

export interface ResumeSample {
  id: string
  studentId: string
  name: string
  text: string
  updatedAt: string
}

export interface EligibilityRule {
  label: string
  requirement: string
  actual: string
  status: RuleStatus
  detail: string
}

export interface EligibilityResult {
  status: EligibilityStatus
  rules: EligibilityRule[]
  summary: string
}

export interface ResumeCategory {
  key: string
  label: string
  score: number
  note: string
}

export type ScoringVersion = 'v1-keyword' | 'v2-semantic'

// the resume line that best matches a skill, and its cosine similarity (0–1)
export interface SkillEvidence {
  line: string
  similarity: number
}

export interface ResumeAnalysis {
  score: number
  scoringVersion: ScoringVersion
  // skills credited only through semantic evidence (the exact term is not in the resume)
  semanticMatches: { skill: string; line: string; similarity: number }[]
  categories: ResumeCategory[]
  matchedSkills: string[]
  missingSkills: string[]
  strengths: string[]
  weakAreas: string[]
  suggestions: string[]
}

export interface AuditEntry {
  id: number
  actor: string | null
  actorEmail: string | null
  tableName: string
  rowId: string | null
  action: 'insert' | 'update' | 'delete'
  old: Record<string, unknown> | null
  new: Record<string, unknown> | null
  at: string
}

export interface AppData {
  // bump in data.ts whenever the sample data changes; saved data with another version is discarded
  version: number
  students: Student[]
  staff: Staff[]
  mentors: Mentor[]
  notices: Notice[]
  noticeReads: NoticeRead[]
  notifications: AppNotification[]
  courses: Course[]
  courseResults: CourseResult[]
  semesterResults: SemesterResult[]
  markChanges: MarkChange[]
  creditTransfers: CreditTransfer[]
  issuedDocuments: IssuedDocument[]
  documentRequests: DocumentRequest[]
  courseAttendance: CourseAttendance[]
  condonations: CondonationRequest[]
  examSessions: ExamSession[]
  examPapers: ExamPaper[]
  examRegistrations: ExamRegistration[]
  examAttendance: ExamAttendance[]
  examSheetScans: ExamSheetScan[]
  attendanceDisputes: AttendanceDispute[]
  ufmCases: UfmCase[]
  rechecks: RecheckRequest[]
  examApplications: ExamApplication[]
  examApplicationItems: ExamApplicationItem[]
  withdrawals: WithdrawalRequest[]
  charges: FeeCharge[]
  payments: Payment[]
  settlements: Settlement[]
  scholarships: Scholarship[]
  tickets: Ticket[]
  mentorBookings: MentorBooking[]
  mentorNotes: MentorNote[]
  noDues: NoDuesItem[]
  careerRecords: CareerRecord[]
  consents: Consent[]
  companies: Company[]
  opportunities: Opportunity[]
  applications: PlacementApplication[]
  resumes: ResumeSample[]
  // local audit trail for browser-only mode; with a database, triggers write audit_log instead
  audit: AuditEntry[]
}

// every AppData field that is a list of rows with an id, i.e. a database table
export type CollectionKey = Exclude<keyof AppData, 'version' | 'audit'>
export type Row<K extends CollectionKey> = AppData[K][number]
