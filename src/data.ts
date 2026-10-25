import { gradeFor } from './domain/results'
import type {
  AppData,
  Course,
  CourseResult,
  ExamAttendance,
  ExamAttendanceStatus,
  ExamPaper,
  SemesterResult,
  Student,
} from './types'

// ── courses ─────────────────────────────────────────────────────────────────

const CSE = 'Computer Science & Engineering'
const ECE = 'Electronics & Communication Engineering'
const SCSE = 'School of Computing Science & Engineering'
const SEEE = 'School of Electrical, Electronics & Communication Engineering'

const course = (code: string, title: string, credits: number, semester: number, branch: string): Course => ({
  id: `course-${code}`,
  code,
  title,
  credits,
  semester,
  branch,
})

const courses: Course[] = [
  course('CSE-501', 'Database Management Systems', 4, 5, CSE),
  course('CSE-502', 'Theory of Computation', 4, 5, CSE),
  course('CSE-503', 'Design & Analysis of Algorithms', 4, 5, CSE),
  course('CSE-504', 'Web Technologies', 3, 5, CSE),
  course('CSE-601', 'Operating Systems', 4, 6, CSE),
  course('CSE-602', 'Compiler Design', 4, 6, CSE),
  course('CSE-603', 'Computer Networks', 4, 6, CSE),
  course('CSE-604', 'Software Engineering', 3, 6, CSE),
  course('CSE-605', 'Machine Learning', 3, 6, CSE),
  course('CSE-S11', 'Technical Writing (summer term)', 2, 6, CSE),
  course('CSE-701', 'Cloud Computing', 3, 7, CSE),
  course('CSE-702', 'Information Security', 3, 7, CSE),
  course('CSE-703', 'Big Data Analytics', 3, 7, CSE),
  course('CSE-704', 'Major Project I', 6, 7, CSE),
  course('ECE-501', 'Control Systems', 4, 5, ECE),
  course('ECE-502', 'Communication Theory', 4, 5, ECE),
  course('ECE-503', 'Linear Integrated Circuits', 4, 5, ECE),
  course('ECE-601', 'Electromagnetic Waves II (EM2)', 4, 6, ECE),
  course('ECE-602', 'Analog Circuits', 4, 6, ECE),
  course('ECE-603', 'Microprocessors', 4, 6, ECE),
  course('ECE-605', 'Digital Signal Processing', 4, 6, ECE),
  course('ECE-606', 'VLSI Design', 3, 6, ECE),
  course('ECE-701', 'Embedded Systems', 3, 7, ECE),
  course('ECE-702', 'Wireless Communication', 3, 7, ECE),
  course('ECE-703', 'Internet of Things', 3, 7, ECE),
]
const credits = (code: string) => courses.find((item) => item.code === code)?.credits ?? 0

// ── results ─────────────────────────────────────────────────────────────────

// marks out of CA 25, mid-term 25, end-term 50; a null end-term means absent
function result(
  studentId: string,
  code: string,
  semester: number,
  sessionId: string,
  marks: [number, number, number | null],
  attempt: CourseResult['attempt'] = 'Regular',
): CourseResult {
  const [ca, mid, end] = marks
  const total = ca + mid + (end ?? 0)
  return {
    id: `result-${studentId}-${code}-${sessionId}`,
    studentId,
    courseCode: code,
    semester,
    sessionId,
    attempt,
    components: [
      { name: 'Continuous assessment', obtained: ca, max: 25 },
      { name: 'Mid-term', obtained: mid, max: 25 },
      { name: 'End-term', obtained: end, max: 50 },
    ],
    total,
    ...gradeFor(total),
    status: 'Declared',
  }
}

// internal marks of the running semester, shown before the result is declared
const provisional = (studentId: string, code: string, ca: number, mid: number): CourseResult => ({
  id: `result-${studentId}-${code}-dec-2026`,
  studentId,
  courseCode: code,
  semester: 7,
  sessionId: 'dec-2026',
  attempt: 'Regular',
  components: [
    { name: 'Continuous assessment', obtained: ca, max: 25 },
    { name: 'Mid-term', obtained: mid, max: 25 },
    { name: 'End-term', obtained: null, max: 50 },
  ],
  total: null,
  grade: null,
  gradePoints: null,
  passed: null,
  status: 'Provisional',
})

const courseResults: CourseResult[] = [
  ...(
    [
      ['CSE-501', [20, 19, 38]],
      ['CSE-502', [18, 17, 33]],
      ['CSE-503', [21, 20, 37]],
      ['CSE-504', [23, 22, 42]],
    ] as const
  ).map(([code, marks]) => result('kartik', code, 5, 'dec-2025', [...marks])),
  ...(
    [
      ['CSE-601', [19, 18, 35]],
      ['CSE-602', [21, 20, 40]],
      ['CSE-603', [17, 16, 35]],
      ['CSE-604', [20, 19, 38]],
      ['CSE-605', [22, 21, 42]],
    ] as const
  ).map(([code, marks]) => result('kartik', code, 6, 'may-2026', [...marks])),
  provisional('kartik', 'CSE-701', 21, 19),
  provisional('kartik', 'CSE-702', 19, 17),
  provisional('kartik', 'CSE-703', 22, 20),
  provisional('kartik', 'CSE-704', 23, 22),
  ...(
    [
      ['ECE-501', [18, 16, 33]],
      ['ECE-502', [17, 15, 32]],
      ['ECE-503', [16, 15, 30]],
    ] as const
  ).map(([code, marks]) => result('shreyansh', code, 5, 'dec-2025', [...marks])),
  ...(
    [
      ['ECE-601', [12, 9, 14]],
      ['ECE-602', [18, 12, null]],
      ['ECE-603', [19, 17, 32]],
      // 56 after revaluation (was 52); see markChanges
      ['ECE-605', [16, 14, 26]],
      ['ECE-606', [20, 19, 36]],
    ] as const
  ).map(([code, marks]) => result('shreyansh', code, 6, 'may-2026', [...marks])),
  provisional('shreyansh', 'ECE-701', 18, 15),
  provisional('shreyansh', 'ECE-702', 17, 16),
  provisional('shreyansh', 'ECE-703', 20, 18),
  ...(
    [
      ['CSE-601', [20, 19, 40]],
      ['CSE-602', [17, 15, 30]],
      ['CSE-603', [19, 18, 37]],
      ['CSE-604', [21, 20, 39]],
      ['CSE-605', [18, 16, 33]],
    ] as const
  ).map(([code, marks]) => result('aditi', code, 6, 'may-2026', [...marks])),
  provisional('aditi', 'CSE-701', 20, 18),
  provisional('aditi', 'CSE-702', 15, 12),
  ...(
    [
      ['CSE-501', [17, 16, 31]],
      ['CSE-502', [15, 13, 22]],
    ] as const
  ).map(([code, marks]) => result('rohan', code, 5, 'dec-2025', [...marks])),
]

// SGPA from this semester's course rows; CGPA credit-weighted across semesters, as the ERP calculates it
function semesters(
  studentId: string,
  earlier: [number, number][],
  declared: [number, string, string][],
): SemesterResult[] {
  const rows: SemesterResult[] = earlier.map(([semester, sgpa]) => ({
    id: `sem-${studentId}-${semester}`,
    studentId,
    semester,
    sessionId: semester % 2 ? `odd-${semester}` : `even-${semester}`,
    sgpa,
    cgpa: null,
    creditsEarned: 22,
    creditsRegistered: 22,
    status: 'Pass',
    declaredOn: null,
  }))
  for (const [semester, sessionId, declaredOn] of declared) {
    const results = courseResults.filter(
      (row) =>
        row.studentId === studentId &&
        row.semester === semester &&
        row.status === 'Declared' &&
        row.courseCode !== 'CSE-S11',
    )
    const registered = results.reduce((total, row) => total + credits(row.courseCode), 0)
    const points = results.reduce((total, row) => total + (row.gradePoints ?? 0) * credits(row.courseCode), 0)
    rows.push({
      id: `sem-${studentId}-${semester}`,
      studentId,
      semester,
      sessionId,
      sgpa: Math.round((points / registered) * 100) / 100,
      cgpa: null,
      creditsEarned: results
        .filter((row) => row.passed)
        .reduce((total, row) => total + credits(row.courseCode), 0),
      creditsRegistered: registered,
      status: results.some((row) => !row.passed) ? 'Pass with backlog' : 'Pass',
      declaredOn,
    })
  }
  let weight = 0
  let sum = 0
  for (const row of rows) {
    weight += row.creditsRegistered
    sum += (row.sgpa ?? 0) * row.creditsRegistered
    row.cgpa = Math.round((sum / weight) * 100) / 100
  }
  return rows
}

const semesterResults: SemesterResult[] = [
  ...semesters(
    'kartik',
    [
      [1, 7.4],
      [2, 7.6],
      [3, 7.9],
      [4, 7.7],
    ],
    [
      [5, 'dec-2025', '2026-02-05'],
      [6, 'may-2026', '2026-10-19'],
    ],
  ),
  ...semesters(
    'shreyansh',
    [
      [1, 7.3],
      [2, 7.1],
      [3, 7.4],
      [4, 7.0],
    ],
    [
      [5, 'dec-2025', '2026-02-05'],
      [6, 'may-2026', '2026-10-19'],
    ],
  ),
  ...semesters(
    'aditi',
    [
      [1, 8.1],
      [2, 8.3],
      [3, 8.0],
      [4, 8.4],
      [5, 8.2],
    ],
    [[6, 'may-2026', '2026-10-19']],
  ),
  ...semesters(
    'rohan',
    [
      [1, 6.9],
      [2, 7.1],
      [3, 6.8],
    ],
    [],
  ),
  {
    id: 'sem-rohan-4',
    studentId: 'rohan',
    semester: 4,
    sessionId: 'may-2026',
    sgpa: null,
    cgpa: null,
    creditsEarned: 0,
    creditsRegistered: 22,
    status: 'Withheld',
    withheldReason: 'Exam fee of ₹1,200 due – contact the Accounts office',
    declaredOn: '2026-10-19',
  },
]
const cgpaOf = (studentId: string) =>
  semesterResults
    .filter((row) => row.studentId === studentId && row.cgpa !== null)
    .sort((a, b) => b.semester - a.semester)[0]?.cgpa ?? null

// ── students ────────────────────────────────────────────────────────────────

const student = (fields: Omit<Student, 'cgpa' | 'source' | 'syncedAt'>): Student => ({
  ...fields,
  cgpa: cgpaOf(fields.id),
  source: 'University ERP (sample data)',
  syncedAt: '2026-10-26T02:00:00Z',
})

const students: Student[] = [
  student({
    id: 'kartik',
    name: 'Kartik Chauhan',
    initials: 'KC',
    email: 'kartik.chauhan@galgotiasuniversity.ac.in',
    phone: '+91 98765 40182',
    enrolmentNo: '23131011071',
    apaarId: '2847 1930 5521',
    school: SCSE,
    semester: 7,
    branch: CSE,
    program: 'B.Tech',
    batch: 2023,
    lateralEntry: false,
    status: 'Enrolled',
    mentorId: 'mentor-avinash',
    activeBacklogs: 0,
    backlogSubjects: [],
    debarred: false,
    graduationYear: 2027,
    attendance: 86,
    creditsCompleted: 128,
    totalCredits: 160,
    skills: ['React', 'TypeScript', 'Node.js', 'SQL', 'Git'],
    profileNote: 'Focused on product engineering, campus systems, and building useful tools for students.',
  }),
  student({
    id: 'shreyansh',
    name: 'Shreyansh Pandey',
    initials: 'SP',
    email: 'shreyansh.pandey@galgotiasuniversity.ac.in',
    phone: '+91 98765 77826',
    enrolmentNo: '23131012130',
    apaarId: null,
    school: SEEE,
    semester: 7,
    branch: ECE,
    program: 'B.Tech',
    batch: 2023,
    lateralEntry: false,
    status: 'Enrolled',
    mentorId: 'mentor-neha',
    activeBacklogs: 2,
    backlogSubjects: ['EM2', 'Analog Circuits'],
    debarred: false,
    graduationYear: 2027,
    attendance: 91,
    creditsCompleted: 124,
    totalCredits: 160,
    skills: ['Python', 'Embedded C', 'IoT', 'MATLAB', 'Data Analysis'],
    profileNote:
      'Exploring embedded systems, applied data work, and the connection between hardware and software.',
  }),
  student({
    id: 'aditi',
    name: 'Aditi Sharma',
    initials: 'AS',
    email: 'aditi.sharma@galgotiasuniversity.ac.in',
    phone: '+91 98111 23456',
    enrolmentNo: '23131011102',
    apaarId: '3391 0047 2210',
    school: SCSE,
    semester: 7,
    branch: CSE,
    program: 'B.Tech',
    batch: 2023,
    lateralEntry: true,
    status: 'Enrolled',
    mentorId: 'mentor-avinash',
    activeBacklogs: 0,
    backlogSubjects: [],
    debarred: false,
    graduationYear: 2027,
    attendance: 74,
    creditsCompleted: 120,
    totalCredits: 160,
    skills: ['Java', 'Spring Boot', 'SQL'],
    profileNote: 'Lateral entry from diploma; interested in backend systems.',
  }),
  student({
    id: 'rohan',
    name: 'Rohan Verma',
    initials: 'RV',
    email: 'rohan.verma@galgotiasuniversity.ac.in',
    phone: '+91 99581 11220',
    enrolmentNo: '24131011045',
    apaarId: null,
    school: SCSE,
    semester: 5,
    branch: CSE,
    program: 'B.Tech',
    batch: 2024,
    lateralEntry: false,
    status: 'Enrolled',
    mentorId: 'mentor-avinash',
    activeBacklogs: 1,
    backlogSubjects: ['Theory of Computation'],
    debarred: false,
    graduationYear: 2028,
    attendance: 81,
    creditsCompleted: 66,
    totalCredits: 160,
    skills: ['C++', 'Python'],
    profileNote: '',
  }),
]

// ── exams ───────────────────────────────────────────────────────────────────

const paper = (
  sessionId: string,
  courseCode: string,
  date: string,
  slot: ExamPaper['slot'],
  venue = 'Block A',
): ExamPaper => ({
  id: `paper-${sessionId}-${courseCode}`,
  sessionId,
  courseCode,
  date,
  slot,
  time: slot === 'Morning' ? '09:30–12:30' : '14:00–17:00',
  venue,
})

const examPapers: ExamPaper[] = [
  paper('may-2026', 'CSE-601', '2026-05-04', 'Morning'),
  paper('may-2026', 'CSE-602', '2026-05-07', 'Morning'),
  paper('may-2026', 'CSE-603', '2026-05-11', 'Morning'),
  paper('may-2026', 'CSE-604', '2026-05-14', 'Morning'),
  paper('may-2026', 'CSE-605', '2026-05-18', 'Morning'),
  paper('may-2026', 'ECE-601', '2026-05-05', 'Afternoon', 'Block C'),
  paper('may-2026', 'ECE-602', '2026-05-08', 'Afternoon', 'Block C'),
  paper('may-2026', 'ECE-603', '2026-05-12', 'Afternoon', 'Block C'),
  paper('may-2026', 'ECE-605', '2026-05-15', 'Afternoon', 'Block C'),
  paper('may-2026', 'ECE-606', '2026-05-19', 'Afternoon', 'Block C'),
  paper('oct-2026-summer', 'CSE-S11', '2026-10-20', 'Morning', 'Block B'),
  paper('nov-2026-bs', 'ECE-601', '2026-11-16', 'Morning', 'Block C'),
  paper('nov-2026-bs', 'ECE-602', '2026-11-18', 'Morning', 'Block C'),
  paper('nov-2026-bs', 'CSE-502', '2026-11-17', 'Afternoon', 'Block A'),
  paper('nov-2026-bs', 'CSE-602', '2026-11-19', 'Afternoon', 'Block A'),
  paper('dec-2026', 'CSE-701', '2026-12-01', 'Morning'),
  paper('dec-2026', 'CSE-702', '2026-12-03', 'Morning'),
  paper('dec-2026', 'CSE-703', '2026-12-07', 'Morning'),
  paper('dec-2026', 'CSE-704', '2026-12-10', 'Morning'),
  paper('dec-2026', 'ECE-701', '2026-12-02', 'Afternoon', 'Block C'),
  paper('dec-2026', 'ECE-702', '2026-12-04', 'Afternoon', 'Block C'),
  paper('dec-2026', 'ECE-703', '2026-12-08', 'Afternoon', 'Block C'),
]

const registrations = (studentId: string, sessionId: string, codes: string[], room: string) =>
  codes.map((courseCode, index) => ({
    id: `reg-${studentId}-${sessionId}-${courseCode}`,
    studentId,
    sessionId,
    courseCode,
    room,
    seat: sessionId === 'dec-2026' ? null : `${room.slice(-1)}-${String(index + 11)}`,
  }))

// two entries per paper, keyed by two different exam-cell staff from the signed sheet
function attendance(
  studentId: string,
  sessionId: string,
  code: string,
  first: ExamAttendanceStatus,
  second = first,
  on = '2026-05-21',
): ExamAttendance {
  return {
    id: `examatt-${studentId}-${sessionId}-${code}`,
    studentId,
    sessionId,
    courseCode: code,
    entry1: { status: first, by: 'Rakesh Kumar', at: `${on}T10:00:00Z` },
    entry2: { status: second, by: 'Priya Singh', at: `${on}T15:00:00Z` },
  }
}

// ── fees ────────────────────────────────────────────────────────────────────

const charge = (
  id: string,
  studentId: string,
  head: AppData['charges'][number]['head'],
  description: string,
  amount: number,
  dueDate: string,
  extra: Partial<AppData['charges'][number]> = {},
) => ({
  id,
  studentId,
  semester: studentId === 'rohan' ? 5 : 7,
  head,
  description,
  amount,
  concession: 0,
  dueDate,
  createdOn: '2026-07-01',
  ...extra,
})

const paid = (
  id: string,
  studentId: string,
  allocations: { chargeId: string; amount: number }[],
  on: string,
  extra: Partial<AppData['payments'][number]> = {},
): AppData['payments'][number] => ({
  id,
  studentId,
  amount: allocations.reduce((total, item) => total + item.amount, 0),
  method: 'UPI',
  status: 'Success',
  gatewayRef: `TEST-${id.slice(-6).toUpperCase()}`,
  receiptNo: `RCPT-2026-${id.slice(-6).toUpperCase()}`,
  createdOn: `${on}T10:15:00Z`,
  confirmedOn: `${on}T10:15:30Z`,
  allocations,
  idempotencyKey: `seed-${id}`,
  ...extra,
})

export const seedData: AppData = {
  version: 4,
  students,
  staff: [
    {
      id: 'staff-admin',
      name: 'IT Administrator',
      email: 'admin@galgotiasuniversity.ac.in',
      role: 'admin',
      department: '',
    },
    {
      id: 'staff-exam-1',
      name: 'Rakesh Kumar',
      email: 'exam.rakesh@galgotiasuniversity.ac.in',
      role: 'exam',
      department: '',
    },
    {
      id: 'staff-exam-2',
      name: 'Priya Singh',
      email: 'exam.priya@galgotiasuniversity.ac.in',
      role: 'exam',
      department: '',
    },
    {
      id: 'staff-accounts-1',
      name: 'Anil Mehta',
      email: 'accounts.anil@galgotiasuniversity.ac.in',
      role: 'accounts',
      department: '',
    },
    {
      id: 'staff-accounts-2',
      name: 'Sunita Rao',
      email: 'accounts.sunita@galgotiasuniversity.ac.in',
      role: 'accounts',
      department: '',
    },
    {
      id: 'staff-placement',
      name: 'Placement office',
      email: 'placement@galgotiasuniversity.ac.in',
      role: 'placement',
      department: '',
    },
    {
      id: 'mentor-avinash',
      name: 'Dr. Avinash Dwivedi',
      email: 'avinash.dwivedi@galgotiasuniversity.ac.in',
      role: 'mentor',
      department: CSE,
    },
    {
      id: 'mentor-neha',
      name: 'Dr. Neha Gupta',
      email: 'neha.gupta@galgotiasuniversity.ac.in',
      role: 'mentor',
      department: ECE,
    },
    {
      id: 'staff-hod-cse',
      name: 'Dr. Meena Sharma',
      email: 'hod.cse@galgotiasuniversity.ac.in',
      role: 'hod',
      department: CSE,
    },
    {
      id: 'staff-dean-scse',
      name: 'Dr. Rajeev Kapoor',
      email: 'dean.scse@galgotiasuniversity.ac.in',
      role: 'dean',
      department: SCSE,
    },
    {
      id: 'staff-registrar',
      name: 'Vikas Jain',
      email: 'registrar@galgotiasuniversity.ac.in',
      role: 'registrar',
      department: '',
    },
  ],
  mentors: [
    {
      id: 'mentor-avinash',
      name: 'Dr. Avinash Dwivedi',
      initials: 'AD',
      department: 'Department of Computer Science & Engineering',
      email: 'kartikchauhan0206@gmail.com',
      phone: '+91 70117 56999',
      officeHours: 'Tue & Thu · 2:00–4:00 PM',
      slots: ['Tue 14:00', 'Tue 15:00', 'Thu 14:00', 'Thu 15:00'],
      availability: 'Available this week',
      focus: 'Academic planning, rechecking support, and placement readiness',
    },
    {
      id: 'mentor-neha',
      name: 'Dr. Neha Gupta',
      initials: 'NG',
      department: 'Department of Electronics & Communication Engineering',
      email: 'neha.gupta@galgotiasuniversity.ac.in',
      phone: '+91 70117 56120',
      officeHours: 'Mon & Wed · 11:00 AM–1:00 PM',
      slots: ['Mon 11:00', 'Mon 12:00', 'Wed 11:00', 'Wed 12:00'],
      availability: 'Available this week',
      focus: 'Backlog recovery plans and core-company preparation',
    },
  ],
  notices: [
    {
      id: 'notice-bs-2026',
      title: 'Back & special exams – applications open',
      category: 'Exams',
      summary:
        'Apply for back (failed) and special (missed with a valid reason) exams on the Exams page. A subject can be taken only once per session.',
      date: '2026-10-20',
      deadline: '2026-11-05',
      priority: 'High',
      audience: 'Students with backlogs or missed papers',
      source: 'Controller of Examinations',
      mandatory: true,
    },
    {
      id: 'notice-recheck-may',
      title: 'Rechecking & revaluation – May 2026 results',
      category: 'Rechecking',
      summary:
        'Rechecking, revaluation and answer-sheet copies can be requested for ten days after the results.',
      date: '2026-10-19',
      deadline: '2026-10-29',
      priority: 'High',
      audience: 'Students with May 2026 results',
      source: 'Controller of Examinations',
    },
    {
      id: 'notice-exam-fee',
      title: 'December 2026 exam fee due',
      category: 'Fees',
      summary: 'Pay the semester exam fee by 15 November. Unpaid fees block the hall ticket.',
      date: '2026-10-15',
      deadline: '2026-11-15',
      priority: 'High',
      audience: '7th semester students',
      source: 'Accounts office',
      target: { semesters: [7] },
      mandatory: true,
    },
    {
      id: 'notice-2',
      title: 'Northstar Finance pre-placement talk',
      category: 'Placement',
      summary: 'Join the role briefing and live Q&A for the Associate Product Analyst opening.',
      date: '2026-10-07',
      deadline: '2026-10-30',
      priority: 'Medium',
      audience: 'Eligible final-year students',
      source: 'Training & Placement Cell',
      target: { batches: [2023] },
    },
    {
      id: 'notice-scse-lab',
      title: 'SCSE project lab extended hours',
      category: 'Academic',
      summary: 'Project labs in Block A stay open until 9 PM on weekdays until the end of the semester.',
      date: '2026-10-21',
      priority: 'Low',
      audience: 'School of Computing Science & Engineering',
      source: 'Dean, SCSE',
      target: { schools: [SCSE] },
    },
    {
      id: 'notice-5',
      title: 'Attendance correction window',
      category: 'Academic',
      summary: 'Review your attendance per course and report discrepancies through a Data correction ticket.',
      date: '2026-10-22',
      deadline: '2026-11-02',
      priority: 'Medium',
      audience: 'All enrolled students',
      source: 'Dean Academics',
    },
  ],
  noticeReads: [
    { id: 'read-kartik-bs', noticeId: 'notice-bs-2026', studentId: 'kartik', readOn: '2026-10-21' },
  ],
  notifications: [
    {
      id: 'notification-1',
      studentId: 'kartik',
      title: 'May 2026 results declared',
      body: 'Your semester 6 result is available.',
      view: 'results',
      createdOn: '2026-10-19T09:00:00Z',
      readOn: '2026-10-19T12:00:00Z',
    },
    {
      id: 'notification-2',
      studentId: 'kartik',
      title: 'Exam attendance recorded',
      body: 'Technical Writing (summer term) – 20 Oct: Absent. If you were present, raise a dispute within 7 days.',
      view: 'exams',
      createdOn: '2026-10-22T16:00:00Z',
    },
    {
      id: 'notification-3',
      studentId: 'shreyansh',
      title: 'Revaluation result published',
      body: 'Digital Signal Processing: 52 → 56 (B).',
      view: 'results',
      createdOn: '2026-10-25T11:00:00Z',
    },
  ],
  courses,
  courseResults,
  semesterResults,
  markChanges: [
    {
      id: 'markchange-cn-grace',
      resultId: 'result-kartik-CSE-603-may-2026',
      studentId: 'kartik',
      courseCode: 'CSE-603',
      fromTotal: 66,
      toTotal: 68,
      fromGrade: 'B+',
      toGrade: 'B+',
      reason: 'Grace marks',
      note: 'Ordinance 12(b): up to 2 grace marks in one course per semester.',
      changedOn: '2026-10-19',
    },
    {
      id: 'markchange-dsp-reval',
      resultId: 'result-shreyansh-ECE-605-may-2026',
      studentId: 'shreyansh',
      courseCode: 'ECE-605',
      fromTotal: 52,
      toTotal: 56,
      fromGrade: 'B',
      toGrade: 'B',
      reason: 'Revaluation',
      note: 'Re-evaluated by a second examiner; question 4(b) had not been marked.',
      changedOn: '2026-10-25',
    },
  ],
  creditTransfers: [
    {
      id: 'transfer-kartik-nptel',
      studentId: 'kartik',
      source: 'NPTEL',
      course: 'Programming in Java (12 weeks)',
      credits: 3,
      approvedOn: '2026-03-10',
    },
  ],
  issuedDocuments: [
    {
      id: 'doc-kartik-gs6',
      serial: 'C360-GS-7Q4K2M9X',
      studentId: 'kartik',
      kind: 'Grade sheet',
      title: 'Grade sheet – Semester 6',
      ref: '6',
      issuedOn: '2026-10-20',
    },
  ],
  documentRequests: [
    {
      id: 'docreq-kartik-bonafide',
      studentId: 'kartik',
      kind: 'Bonafide certificate',
      copies: 1,
      delivery: 'Collect',
      address: '',
      purpose: 'Passport application',
      requestedOn: '2026-10-21',
      status: 'Ready',
      remarks: 'Collect from the Registrar’s office, counter 3.',
    },
  ],
  courseAttendance: [
    ...(
      [
        ['kartik', 'CSE-701', 40, 35],
        ['kartik', 'CSE-702', 38, 32],
        ['kartik', 'CSE-703', 36, 31],
        ['kartik', 'CSE-704', 20, 18],
        ['shreyansh', 'ECE-701', 40, 37],
        ['shreyansh', 'ECE-702', 38, 35],
        ['shreyansh', 'ECE-703', 36, 32],
        ['aditi', 'CSE-701', 40, 33],
        ['aditi', 'CSE-702', 38, 26],
        ['rohan', 'CSE-501', 42, 35],
        ['rohan', 'CSE-502', 40, 31],
      ] as const
    ).map(([studentId, courseCode, held, attended]) => ({
      id: `att-${studentId}-${courseCode}`,
      studentId,
      courseCode,
      semester: courses.find((item) => item.code === courseCode)!.semester,
      held,
      attended,
      updatedOn: '2026-10-25',
    })),
  ],
  condonations: [
    {
      id: 'condonation-aditi',
      studentId: 'aditi',
      courseCode: 'CSE-702',
      reason: 'Medical',
      details: 'Hospitalised for dengue, 2–12 September.',
      files: [{ name: 'discharge-summary.pdf', size: 184_220, path: null }],
      requestedOn: '2026-10-23',
    },
  ],
  examSessions: [
    {
      id: 'dec-2025',
      name: 'End-term – Dec 2025',
      kind: 'End-term',
      semesterParity: 'Odd',
      startsOn: '2025-12-01',
      endsOn: '2025-12-15',
      hallTicketsFrom: '2025-11-24',
      resultDeclaredOn: '2026-02-05',
    },
    {
      id: 'may-2026',
      name: 'End-term – May 2026',
      kind: 'End-term',
      semesterParity: 'Even',
      startsOn: '2026-05-04',
      endsOn: '2026-05-20',
      hallTicketsFrom: '2026-04-27',
      resultDeclaredOn: '2026-10-19',
    },
    {
      id: 'oct-2026-summer',
      name: 'Summer term – Oct 2026',
      kind: 'End-term',
      semesterParity: 'Even',
      startsOn: '2026-10-20',
      endsOn: '2026-10-20',
      hallTicketsFrom: '2026-10-13',
      resultDeclaredOn: null,
    },
    {
      id: 'nov-2026-bs',
      name: 'Back & special exams – Nov 2026',
      kind: 'Back & special',
      semesterParity: 'Even',
      startsOn: '2026-11-16',
      endsOn: '2026-11-20',
      applicationOpens: '2026-10-20',
      applicationCloses: '2026-11-05',
      hallTicketsFrom: '2026-11-12',
      resultDeclaredOn: null,
    },
    {
      id: 'dec-2026',
      name: 'End-term – Dec 2026',
      kind: 'End-term',
      semesterParity: 'Odd',
      startsOn: '2026-12-01',
      endsOn: '2026-12-12',
      hallTicketsFrom: '2026-11-24',
      resultDeclaredOn: null,
    },
  ],
  examPapers,
  examRegistrations: [
    ...registrations(
      'kartik',
      'may-2026',
      ['CSE-601', 'CSE-602', 'CSE-603', 'CSE-604', 'CSE-605'],
      'Room A1',
    ),
    ...registrations('kartik', 'oct-2026-summer', ['CSE-S11'], 'Room B2'),
    ...registrations('kartik', 'dec-2026', ['CSE-701', 'CSE-702', 'CSE-703', 'CSE-704'], 'Room A1'),
    ...registrations(
      'shreyansh',
      'may-2026',
      ['ECE-601', 'ECE-602', 'ECE-603', 'ECE-605', 'ECE-606'],
      'Room C1',
    ),
    ...registrations('shreyansh', 'dec-2026', ['ECE-701', 'ECE-702', 'ECE-703'], 'Room C1'),
    ...registrations('aditi', 'may-2026', ['CSE-601', 'CSE-602', 'CSE-603', 'CSE-604', 'CSE-605'], 'Room A2'),
    ...registrations('aditi', 'dec-2026', ['CSE-701', 'CSE-702'], 'Room A2'),
  ],
  examAttendance: [
    ...['CSE-601', 'CSE-602', 'CSE-603', 'CSE-604', 'CSE-605'].map((code) =>
      attendance('kartik', 'may-2026', code, 'Present'),
    ),
    // marked absent by mistake on the summer-term sheet; Kartik can dispute until 29 Oct
    attendance('kartik', 'oct-2026-summer', 'CSE-S11', 'Absent', 'Absent', '2026-10-22'),
    ...['ECE-601', 'ECE-603', 'ECE-605', 'ECE-606'].map((code) =>
      attendance('shreyansh', 'may-2026', code, 'Present'),
    ),
    attendance('shreyansh', 'may-2026', 'ECE-602', 'Absent'),
    ...['CSE-601', 'CSE-602', 'CSE-603', 'CSE-605'].map((code) =>
      attendance('aditi', 'may-2026', code, 'Present'),
    ),
    // the two entries disagree, so the student sees nothing until the exam cell resolves it
    attendance('aditi', 'may-2026', 'CSE-604', 'Present', 'Absent'),
  ],
  examSheetScans: [
    {
      id: 'scan-may-ECE-602',
      sessionId: 'may-2026',
      courseCode: 'ECE-602',
      file: { name: 'ECE-602-attendance-sheet.pdf', size: 412_003, path: null },
      uploadedBy: 'Rakesh Kumar',
      uploadedOn: '2026-05-09',
    },
  ],
  attendanceDisputes: [],
  ufmCases: [
    {
      id: 'ufm-rohan',
      studentId: 'rohan',
      sessionId: 'dec-2025',
      courseCode: 'CSE-502',
      status: 'Hearing scheduled',
      hearingOn: '2026-11-04',
    },
  ],
  rechecks: [
    {
      id: 'recheck-1',
      studentId: 'kartik',
      service: 'Rechecking',
      sessionId: 'may-2026',
      subject: 'Operating Systems',
      code: 'CSE-601',
      requestDate: '2026-10-21',
      status: 'Under review',
      remarks: 'Answer script has been sent to the moderation desk.',
      expectedBy: '2026-11-04',
    },
    {
      id: 'recheck-2',
      studentId: 'kartik',
      service: 'Revaluation',
      sessionId: 'may-2026',
      subject: 'Computer Networks',
      code: 'CSE-603',
      requestDate: '2026-10-24',
      status: 'Submitted',
      remarks: 'Pay the fee to send this request for review.',
      expectedBy: '2026-11-07',
    },
    {
      id: 'recheck-3',
      studentId: 'shreyansh',
      service: 'Revaluation',
      sessionId: 'may-2026',
      subject: 'Digital Signal Processing',
      code: 'ECE-605',
      requestDate: '2026-10-20',
      status: 'Result published',
      remarks: 'Marks increased after revaluation.',
      expectedBy: '2026-11-03',
      outcome: '52 → 56 (B)',
      closedOn: '2026-10-25',
    },
    {
      id: 'recheck-4',
      studentId: 'aditi',
      service: 'Rechecking',
      sessionId: 'may-2026',
      subject: 'Compiler Design',
      code: 'CSE-602',
      requestDate: '2026-10-08',
      status: 'Under review',
      remarks: 'Requested through the ERP before Campus360; awaiting the evaluator.',
      expectedBy: '2026-10-22',
    },
  ],
  // applied in the ERP before Campus360 launched: the same subject twice (back and special)
  examApplications: [
    {
      id: 'examapp-shreyansh-back',
      studentId: 'shreyansh',
      sessionId: 'nov-2026-bs',
      kind: 'Back',
      details: '',
      files: [],
      submittedOn: '2026-10-15',
      source: 'ERP import',
    },
    {
      id: 'examapp-shreyansh-special',
      studentId: 'shreyansh',
      sessionId: 'nov-2026-bs',
      kind: 'Special',
      reason: 'Medical',
      missedSessionId: 'may-2026',
      details: 'Fever on the day of the Analog Circuits paper.',
      files: [{ name: 'medical-certificate.pdf', size: 96_512, path: null }],
      submittedOn: '2026-10-16',
      decision: 'Approved',
      decisionReason: 'Medical certificate verified.',
      decidedBy: 'Rakesh Kumar',
      decidedOn: '2026-10-17',
      source: 'ERP import',
    },
  ],
  examApplicationItems: [
    {
      id: 'examitem-shreyansh-back-602',
      applicationId: 'examapp-shreyansh-back',
      studentId: 'shreyansh',
      sessionId: 'nov-2026-bs',
      courseCode: 'ECE-602',
      kind: 'Back',
      fee: 1500,
      source: 'ERP import',
    },
    {
      id: 'examitem-shreyansh-special-602',
      applicationId: 'examapp-shreyansh-special',
      studentId: 'shreyansh',
      sessionId: 'nov-2026-bs',
      courseCode: 'ECE-602',
      kind: 'Special',
      fee: 2000,
      source: 'ERP import',
    },
  ],
  withdrawals: [
    {
      id: 'withdrawal-shreyansh-602',
      studentId: 'shreyansh',
      applicationId: 'examapp-shreyansh-back',
      itemIds: ['examitem-shreyansh-back-602'],
      reason: 'Applied for both back and special for Analog Circuits by mistake; keeping the special exam.',
      requestedOn: '2026-10-24',
      requestedBy: 'Shreyansh Pandey',
    },
  ],
  charges: [
    charge(
      'charge-kartik-tuition-1',
      'kartik',
      'Tuition',
      'Tuition 2026-27 – instalment 1',
      85_000,
      '2026-07-31',
    ),
    charge(
      'charge-kartik-tuition-2',
      'kartik',
      'Tuition',
      'Tuition 2026-27 – instalment 2',
      85_000,
      '2027-01-15',
      { concession: 17_000 },
    ),
    charge('charge-kartik-hostel', 'kartik', 'Hostel', 'Hostel 2026-27 (Block H2)', 60_000, '2026-10-20'),
    charge('charge-kartik-exam', 'kartik', 'Exam', 'Exam fee – End-term Dec 2026', 1_200, '2026-11-15', {
      ref: 'dec-2026',
      createdOn: '2026-10-15',
    }),
    charge('charge-kartik-library', 'kartik', 'Library', 'Library & lab fee 2026-27', 2_000, '2026-07-31'),
    charge(
      'charge-kartik-recheck-1',
      'kartik',
      'Rechecking',
      'Rechecking – Operating Systems (End-term – May 2026)',
      500,
      '2026-10-29',
      { ref: 'recheck-1', createdOn: '2026-10-21' },
    ),
    charge(
      'charge-kartik-recheck-2',
      'kartik',
      'Revaluation',
      'Revaluation – Computer Networks (End-term – May 2026)',
      1_000,
      '2026-10-29',
      { ref: 'recheck-2', createdOn: '2026-10-24' },
    ),
    charge(
      'charge-shreyansh-tuition-1',
      'shreyansh',
      'Tuition',
      'Tuition 2026-27 – instalment 1',
      85_000,
      '2026-07-31',
    ),
    charge(
      'charge-shreyansh-tuition-2',
      'shreyansh',
      'Tuition',
      'Tuition 2026-27 – instalment 2',
      85_000,
      '2027-01-15',
    ),
    charge(
      'charge-shreyansh-transport',
      'shreyansh',
      'Transport',
      'Transport 2026-27 (Route 14)',
      12_000,
      '2026-09-30',
    ),
    charge(
      'charge-shreyansh-exam',
      'shreyansh',
      'Exam',
      'Exam fee – End-term Dec 2026',
      1_200,
      '2026-11-15',
      { ref: 'dec-2026', createdOn: '2026-10-15' },
    ),
    charge(
      'charge-shreyansh-back-602',
      'shreyansh',
      'Back exam',
      'Back exam – Analog Circuits (Back & special exams – Nov 2026)',
      1_500,
      '2026-11-05',
      { ref: 'examitem-shreyansh-back-602', createdOn: '2026-10-15' },
    ),
    charge(
      'charge-shreyansh-special-602',
      'shreyansh',
      'Special exam',
      'Special exam – Analog Circuits (Back & special exams – Nov 2026)',
      2_000,
      '2026-11-05',
      { ref: 'examitem-shreyansh-special-602', createdOn: '2026-10-17' },
    ),
    charge(
      'charge-shreyansh-reval-605',
      'shreyansh',
      'Revaluation',
      'Revaluation – Digital Signal Processing (End-term – May 2026)',
      1_000,
      '2026-10-29',
      { ref: 'recheck-3', createdOn: '2026-10-20' },
    ),
    charge(
      'charge-aditi-tuition-1',
      'aditi',
      'Tuition',
      'Tuition 2026-27 – instalment 1',
      85_000,
      '2026-07-31',
    ),
    charge('charge-aditi-exam', 'aditi', 'Exam', 'Exam fee – End-term Dec 2026', 1_200, '2026-11-15', {
      ref: 'dec-2026',
      createdOn: '2026-10-15',
    }),
    charge(
      'charge-aditi-recheck-4',
      'aditi',
      'Rechecking',
      'Rechecking – Compiler Design (End-term – May 2026)',
      500,
      '2026-10-29',
      { ref: 'recheck-4', createdOn: '2026-10-08' },
    ),
    charge('charge-rohan-exam-may', 'rohan', 'Exam', 'Exam fee – End-term May 2026', 1_200, '2026-04-15', {
      ref: 'may-2026',
      semester: 4,
    }),
  ],
  payments: [
    // the gateway charged Kartik twice for instalment 1; reconciliation refunds the second payment
    paid(
      'payment-kartik-t1a',
      'kartik',
      [
        { chargeId: 'charge-kartik-tuition-1', amount: 85_000 },
        { chargeId: 'charge-kartik-library', amount: 2_000 },
      ],
      '2026-07-20',
    ),
    paid(
      'payment-kartik-t1b',
      'kartik',
      [{ chargeId: 'charge-kartik-tuition-1', amount: 85_000 }],
      '2026-07-20',
      { method: 'Net banking' },
    ),
    // debited by the bank on 24 Oct but not yet confirmed to the university
    paid(
      'payment-kartik-hostel',
      'kartik',
      [{ chargeId: 'charge-kartik-hostel', amount: 60_000 }],
      '2026-10-24',
      {
        status: 'Pending',
        receiptNo: null,
        confirmedOn: null,
        method: 'Card',
      },
    ),
    paid('payment-kartik-exam', 'kartik', [{ chargeId: 'charge-kartik-exam', amount: 1_200 }], '2026-10-18'),
    paid(
      'payment-kartik-recheck-1',
      'kartik',
      [{ chargeId: 'charge-kartik-recheck-1', amount: 500 }],
      '2026-10-21',
    ),
    paid(
      'payment-shreyansh-t1',
      'shreyansh',
      [{ chargeId: 'charge-shreyansh-tuition-1', amount: 85_000 }],
      '2026-07-25',
    ),
    paid(
      'payment-shreyansh-back',
      'shreyansh',
      [{ chargeId: 'charge-shreyansh-back-602', amount: 1_500 }],
      '2026-10-15',
    ),
    paid(
      'payment-shreyansh-special',
      'shreyansh',
      [{ chargeId: 'charge-shreyansh-special-602', amount: 2_000 }],
      '2026-10-17',
    ),
    paid(
      'payment-shreyansh-reval',
      'shreyansh',
      [{ chargeId: 'charge-shreyansh-reval-605', amount: 1_000 }],
      '2026-10-20',
    ),
    paid('payment-aditi-t1', 'aditi', [{ chargeId: 'charge-aditi-tuition-1', amount: 85_000 }], '2026-07-29'),
    paid(
      'payment-aditi-recheck',
      'aditi',
      [{ chargeId: 'charge-aditi-recheck-4', amount: 500 }],
      '2026-10-08',
    ),
  ],
  settlements: [],
  scholarships: [
    {
      id: 'scholarship-kartik-merit',
      studentId: 'kartik',
      name: 'Chancellor’s merit scholarship (20% of tuition instalment 2)',
      portal: 'University',
      amount: 17_000,
      status: 'Sanctioned',
      expectedOn: '2027-01-15',
    },
    {
      id: 'scholarship-shreyansh-postmatric',
      studentId: 'shreyansh',
      name: 'Post-matric scholarship',
      portal: 'UP Scholarship portal',
      amount: 30_000,
      status: 'Verified',
      expectedOn: '2027-02-28',
    },
  ],
  tickets: [
    {
      id: 'ticket-shreyansh-phone',
      studentId: 'shreyansh',
      category: 'Data correction',
      subject: 'Phone number on record is wrong',
      messages: [
        {
          by: 'Shreyansh Pandey',
          role: 'student',
          text: 'My record shows +91 98765 77826; my number is +91 98765 77862.',
          at: '2026-10-18T08:30:00Z',
        },
      ],
      createdOn: '2026-10-18',
      status: 'Open',
    },
    {
      id: 'ticket-aditi-grievance',
      studentId: 'aditi',
      category: 'Exams',
      subject: 'Lateral-entry credits not counted',
      messages: [
        {
          by: 'Aditi Sharma',
          role: 'student',
          text: 'My diploma credits from semester 3 are missing from the credit count.',
          at: '2026-09-02T09:00:00Z',
        },
        {
          by: 'Rakesh Kumar',
          role: 'staff',
          text: 'Credits are as per the ordinance; no change.',
          at: '2026-09-04T11:00:00Z',
        },
        {
          by: 'Aditi Sharma',
          role: 'student',
          text: 'I disagree – the admission letter says they transfer. Escalating.',
          at: '2026-09-05T10:00:00Z',
        },
      ],
      createdOn: '2026-09-02',
      status: 'With grievance committee',
      resolvedOn: '2026-09-04',
    },
  ],
  mentorBookings: [
    {
      id: 'booking-kartik-1',
      studentId: 'kartik',
      mentorId: 'mentor-avinash',
      date: '2026-10-27',
      slot: 'Tue 14:00',
      topic: 'Elective choice for semester 8',
      status: 'Requested',
    },
  ],
  mentorNotes: [
    {
      id: 'note-shreyansh-1',
      studentId: 'shreyansh',
      mentorId: 'mentor-neha',
      text: 'Two backlogs after semester 6. Agreed plan: special exam for Analog Circuits, back exam for EM2, weekly check-ins.',
      createdOn: '2026-10-21',
    },
  ],
  noDues: (['Library', 'Hostel', 'Accounts', 'Department', 'Placement cell'] as const).map((office) => ({
    id: `nodues-kartik-${office.toLowerCase().replace(/\s/g, '-')}`,
    studentId: 'kartik',
    office,
    status: office === 'Library' || office === 'Department' ? ('Cleared' as const) : ('Pending' as const),
    remarks: office === 'Hostel' ? 'Hostel fee payment is being confirmed.' : '',
    clearedOn: office === 'Library' || office === 'Department' ? '2026-10-10' : null,
  })),
  careerRecords: [
    {
      id: 'career-kartik-intern',
      studentId: 'kartik',
      kind: 'Internship',
      company: 'Student Innovation Lab',
      role: 'Frontend intern',
      from: '2026-06-01',
      to: '2026-07-31',
      file: { name: 'internship-certificate.pdf', size: 120_331, path: null },
      verified: true,
    },
  ],
  consents: [
    {
      id: 'consent-kartik',
      studentId: 'kartik',
      privacyAcceptedOn: '2026-10-10',
      parentAccess: true,
      parentEmail: 'parent.kartik@example.com',
      updatedOn: '2026-10-10',
    },
  ],
  companies: [
    {
      id: 'technova',
      name: 'TechNova Systems',
      initials: 'TN',
      sector: 'Product engineering',
      location: 'Bengaluru · India',
      website: 'technova.example',
      description: 'Builds developer tools and workflow software for fast-moving teams.',
      accent: '#4b5a8c',
    },
    {
      id: 'orbit',
      name: 'Orbit Labs',
      initials: 'OL',
      sector: 'Cloud & data',
      location: 'Pune · Hybrid',
      website: 'orbitlabs.example',
      description: 'A cloud data platform helping operations teams turn messy signals into decisions.',
      accent: '#2e6b66',
    },
    {
      id: 'northstar',
      name: 'Northstar Finance',
      initials: 'NF',
      sector: 'Fintech',
      location: 'Mumbai · India',
      website: 'northstar.example',
      description: 'A digital finance company focused on transparent, accessible financial products.',
      accent: '#94551d',
    },
  ],
  opportunities: [
    {
      id: 'opp-technova-frontend',
      companyId: 'technova',
      title: 'Frontend Engineer',
      location: 'Bengaluru',
      workMode: 'Hybrid',
      deadline: '2026-11-17',
      posted: '2026-10-04',
      minCgpa: 8,
      allowedBranches: [CSE, 'Information Technology'],
      maxActiveBacklogs: 0,
      graduationYears: [2027],
      requiredSkills: ['React', 'TypeScript', 'HTML/CSS'],
      preferredSkills: ['Testing', 'Git', 'Accessibility'],
      jobDescription:
        'Work with a product engineering team to build accessible, high-quality web experiences using React and TypeScript. You will partner with designers, write maintainable UI, and contribute to frontend testing and performance improvements.',
      package: '₹12–16 LPA',
      jobType: 'Full-time',
      status: 'Open',
      dream: true,
      criteriaVersion: 1,
    },
    {
      id: 'opp-orbit-data',
      companyId: 'orbit',
      title: 'Data Platform Intern',
      location: 'Pune',
      workMode: 'Hybrid',
      deadline: '2026-11-22',
      posted: '2026-10-06',
      minCgpa: 7.5,
      allowedBranches: [CSE, 'Information Technology', ECE],
      maxActiveBacklogs: 1,
      graduationYears: [2027, 2028],
      requiredSkills: ['Python', 'SQL'],
      preferredSkills: ['Data Analysis', 'Docker', 'AWS'],
      jobDescription:
        'Join the data platform team to prepare reliable datasets, build Python utilities, and query operational data with SQL. Curiosity, clear documentation, and a willingness to learn cloud tooling are valued.',
      package: '₹45k / month',
      jobType: 'Internship + PPO',
      status: 'Open',
      criteriaVersion: 2,
    },
    {
      id: 'opp-northstar-analyst',
      companyId: 'northstar',
      title: 'Associate Product Analyst',
      location: 'Mumbai',
      workMode: 'On-site',
      deadline: '2026-10-30',
      posted: '2026-10-01',
      minCgpa: 7.5,
      allowedBranches: [CSE, 'Information Technology', ECE, 'Electrical Engineering'],
      maxActiveBacklogs: 0,
      graduationYears: [2027],
      requiredSkills: ['SQL', 'Data Analysis', 'Communication'],
      preferredSkills: ['Excel', 'A/B Testing', 'Product Thinking'],
      jobDescription:
        'Support product decisions with clear analysis, SQL-based reporting, and user research. The role works closely with product managers and engineering teams to turn customer questions into measurable experiments.',
      package: '₹9–12 LPA',
      jobType: 'Full-time',
      status: 'Closing soon',
      criteriaVersion: 1,
    },
  ],
  applications: [
    {
      id: 'application-kartik-orbit',
      studentId: 'kartik',
      opportunityId: 'opp-orbit-data',
      stage: 'Technical',
      appliedOn: '2026-10-06',
      note: 'Technical round scheduled for 28 Oct.',
      // applied under version 1; the CGPA cut-off has since changed
      criteria: {
        version: 1,
        minCgpa: 7.0,
        allowedBranches: [CSE, 'Information Technology', ECE],
        maxActiveBacklogs: 1,
        graduationYears: [2027, 2028],
      },
      shared: ['Resume', 'CGPA', 'Email'],
    },
    {
      id: 'application-aditi-orbit',
      studentId: 'aditi',
      opportunityId: 'opp-orbit-data',
      stage: 'Selected',
      appliedOn: '2026-10-07',
      note: 'Offer released on 22 Oct.',
      criteria: {
        version: 1,
        minCgpa: 7.0,
        allowedBranches: [CSE, 'Information Technology', ECE],
        maxActiveBacklogs: 1,
        graduationYears: [2027, 2028],
      },
      shared: ['Resume', 'CGPA', 'Email', 'Phone'],
    },
  ],
  resumes: [
    {
      id: 'resume-kartik-product',
      studentId: 'kartik',
      name: 'Kartik · Product engineering resume',
      updatedAt: '2026-10-07',
      text: `Kartik Chauhan
Computer Science & Engineering | B.Tech | 2027
kartik.chauhan@galgotiasuniversity.ac.in | github.com/Kartik7011

SUMMARY
Product-minded frontend developer who builds accessible student tools and data-rich web experiences.

EDUCATION
B.Tech Computer Science & Engineering, 7.76 CGPA, graduating 2027

SKILLS
React, TypeScript, JavaScript, HTML/CSS, Node.js, SQL, Git

PROJECTS
Campus360 — Built a React and TypeScript dashboard that surfaces academic status, placement eligibility, and resume feedback for students. Added responsive design and local persistence.
StudySprint — Created a Node.js and SQL study planner with reminders and progress reporting.

EXPERIENCE
Frontend Intern, Student Innovation Lab — translated Figma flows into reusable React components and wrote basic UI tests.

ACHIEVEMENTS
Finalist in a university product hackathon; mentored two juniors during the web development sprint.`,
    },
    {
      id: 'resume-kartik-analyst',
      studentId: 'kartik',
      name: 'Kartik · Analytics-focused resume',
      updatedAt: '2026-10-02',
      text: `Kartik Chauhan
B.Tech Computer Science & Engineering · 2027 · 7.76 CGPA

EDUCATION
Bachelor of Technology, Computer Science & Engineering

SKILLS
SQL, Excel, Python, React, Data Analysis, Communication

PROJECTS
Campus analytics notebook — cleaned student survey data with Python and SQL and published a dashboard of attendance trends.
Campus360 — designed a transparent placement tracker for students.

EXPERIENCE
Student Research Assistant — interviewed users and documented requirements for a campus workflow tool.

ACHIEVEMENTS
Presented findings to a panel of four faculty members and reduced manual report preparation time by 30%.`,
    },
    {
      id: 'resume-shreyansh-iot',
      studentId: 'shreyansh',
      name: 'Shreyansh · Embedded systems resume',
      updatedAt: '2026-10-05',
      text: `Shreyansh Pandey
Electronics & Communication Engineering · 2027 · 7.20 CGPA

EDUCATION
B.Tech Electronics & Communication Engineering

SKILLS
Python, Embedded C, IoT, MATLAB, Data Analysis, SQL

PROJECTS
Smart campus energy monitor — built an IoT prototype to collect sensor readings and visualize usage trends.
Signal classifier — evaluated noisy sensor data in MATLAB and documented model accuracy.

EXPERIENCE
Hardware Lab Assistant — supported microcontroller experiments and maintained clear lab notes.

ACHIEVEMENTS
Won second place in the department prototype showcase.`,
    },
  ],
  audit: [],
}
