export type ViewKey = 'dashboard' | 'academic' | 'notices' | 'placements' | 'resume' | 'admin'

export type NoticeCategory = 'Academic' | 'Placement' | 'Rechecking'
export type Priority = 'High' | 'Medium' | 'Low'
export type EligibilityStatus = 'Eligible' | 'Not Eligible' | 'Cannot Determine'
export type RuleStatus = 'Pass' | 'Fail' | 'Unknown'
export type PlacementStage = 'Applied' | 'Aptitude' | 'Technical' | 'HR' | 'Selected' | 'Rejected'

export interface Student {
  id: string
  name: string
  initials: string
  email: string
  phone: string
  semester: number
  branch: string
  program: string
  cgpa: number | null
  activeBacklogs: number | null
  backlogSubjects?: string[]
  debarred: boolean | null
  graduationYear: number | null
  attendance: number
  creditsCompleted: number
  totalCredits: number
  skills: string[]
  profileNote: string
}

export interface Mentor {
  id: string
  name: string
  initials: string
  department: string
  email: string
  phone: string
  officeHours: string
  availability: string
  focus: string
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
}

export interface RecheckRequest {
  id: string
  studentId: string
  subject: string
  code: string
  requestDate: string
  status: 'Submitted' | 'Under Review' | 'Resolved'
  remarks: string
  expectedBy: string
}

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
}

export interface PlacementApplication {
  id: string
  studentId: string
  opportunityId: string
  stage: PlacementStage
  appliedOn: string
  note: string
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

export interface ResumeAnalysis {
  score: number
  categories: ResumeCategory[]
  matchedSkills: string[]
  missingSkills: string[]
  strengths: string[]
  weakAreas: string[]
  suggestions: string[]
}

export interface AppData {
  // bump in data.ts whenever the sample data changes; saved data with another version is discarded
  version: number
  students: Student[]
  mentor: Mentor
  notices: Notice[]
  rechecks: RecheckRequest[]
  companies: Company[]
  opportunities: Opportunity[]
  applications: PlacementApplication[]
  resumes: ResumeSample[]
}
