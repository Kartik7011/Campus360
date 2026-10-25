import type {
  Company,
  EligibilityResult,
  EligibilityRule,
  Opportunity,
  RecheckRequest,
  ResumeAnalysis,
  ResumeCategory,
  SkillEvidence,
  Student,
} from './types'

// shortcut: picked from ~25 spot-checked pairs (ReactJS↔React 0.87, NodeJS↔Node.js 0.93, Vue.js↔React 0.37,
// MySQL↔SQL 0.68); calibrate on hand-labelled (skill, phrase) pairs before reporting v2 results.
export const SEMANTIC_THRESHOLD = 0.75

export function getCompanyByOpportunity(opportunity: Opportunity, companies: Company[]) {
  return companies.find((company) => company.id === opportunity.companyId)
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(`${value}T12:00:00`))
}

export function formatDateShort(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${value}T12:00:00`))
}

export function daysUntil(value: string, reference = new Date()) {
  const deadline = new Date(`${value}T12:00:00`)
  const today = new Date(reference)
  today.setHours(12, 0, 0, 0)
  return Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000)
}

export function deadlineLabel(value: string) {
  const days = daysUntil(value)
  if (days < 0) return 'Closed'
  if (days === 0) return 'Due today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

function display(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return 'Not available'
  return String(value)
}

export function evaluateEligibility(student: Student, opportunity: Opportunity): EligibilityResult {
  const rules: EligibilityRule[] = []

  if (student.cgpa === null || opportunity.minCgpa === null) {
    rules.push({
      label: 'CGPA',
      requirement:
        opportunity.minCgpa === null
          ? 'Requirement not published'
          : `At least ${opportunity.minCgpa.toFixed(2)}`,
      actual: display(student.cgpa),
      status: opportunity.minCgpa === null ? 'Unknown' : 'Unknown',
      detail: 'The official record or company threshold is missing, so this rule cannot be confirmed.',
    })
  } else {
    const passes = student.cgpa >= opportunity.minCgpa
    rules.push({
      label: 'CGPA',
      requirement: `At least ${opportunity.minCgpa.toFixed(2)}`,
      actual: student.cgpa.toFixed(2),
      status: passes ? 'Pass' : 'Fail',
      detail: passes
        ? 'Your recorded CGPA meets the published threshold.'
        : 'Your recorded CGPA is below the published threshold.',
    })
  }

  if (!student.branch || opportunity.allowedBranches.length === 0) {
    rules.push({
      label: 'Branch',
      requirement: opportunity.allowedBranches.length
        ? opportunity.allowedBranches.join(', ')
        : 'Requirement not published',
      actual: display(student.branch),
      status: 'Unknown',
      detail: 'Branch data or the company branch list is incomplete.',
    })
  } else {
    const passes = opportunity.allowedBranches.some(
      (branch) => branch.toLowerCase() === student.branch.toLowerCase(),
    )
    rules.push({
      label: 'Branch',
      requirement: opportunity.allowedBranches.join(', '),
      actual: student.branch,
      status: passes ? 'Pass' : 'Fail',
      detail: passes
        ? 'Your branch is listed in the opportunity criteria.'
        : 'Your branch is not listed in the opportunity criteria.',
    })
  }

  if (student.activeBacklogs === null || opportunity.maxActiveBacklogs === null) {
    rules.push({
      label: 'Active backlogs',
      requirement:
        opportunity.maxActiveBacklogs === null
          ? 'Requirement not published'
          : `At most ${opportunity.maxActiveBacklogs}`,
      actual: display(student.activeBacklogs),
      status: 'Unknown',
      detail: 'The official backlog record or company limit is missing.',
    })
  } else {
    const passes = student.activeBacklogs <= opportunity.maxActiveBacklogs
    rules.push({
      label: 'Active backlogs',
      requirement: `At most ${opportunity.maxActiveBacklogs}`,
      actual: String(student.activeBacklogs),
      status: passes ? 'Pass' : 'Fail',
      detail: passes
        ? 'Your active backlog count is within the published limit.'
        : 'Your active backlog count is above the published limit.',
    })
  }

  if (
    !opportunity.graduationYears ||
    opportunity.graduationYears.length === 0 ||
    student.graduationYear === null
  ) {
    rules.push({
      label: 'Graduation year',
      requirement: opportunity.graduationYears?.length
        ? opportunity.graduationYears.join(', ')
        : 'Not specified',
      actual: display(student.graduationYear),
      status: opportunity.graduationYears?.length && student.graduationYear === null ? 'Unknown' : 'Pass',
      detail:
        opportunity.graduationYears?.length && student.graduationYear === null
          ? 'Graduation year is missing from the student record.'
          : 'No graduation-year restriction was published for this opening.',
    })
  } else {
    const passes = opportunity.graduationYears.includes(student.graduationYear)
    rules.push({
      label: 'Graduation year',
      requirement: opportunity.graduationYears.join(', '),
      actual: String(student.graduationYear),
      status: passes ? 'Pass' : 'Fail',
      detail: passes
        ? 'Your graduation year is included in the company criteria.'
        : 'Your graduation year is outside the company criteria.',
    })
  }

  if (student.debarred === true) {
    rules.push({
      label: 'Debarment status',
      requirement: 'Must not be debarred',
      actual: 'Debarred',
      status: 'Fail',
      detail: 'The student record currently marks you as debarred.',
    })
  } else if (student.debarred === null) {
    rules.push({
      label: 'Debarment status',
      requirement: 'Must not be debarred',
      actual: 'Not available',
      status: 'Unknown',
      detail: 'Debarment status is missing from the student record.',
    })
  } else {
    rules.push({
      label: 'Debarment status',
      requirement: 'Must not be debarred',
      actual: 'Clear',
      status: 'Pass',
      detail: 'The student record does not show a debarment.',
    })
  }

  const hasFail = rules.some((rule) => rule.status === 'Fail')
  const hasUnknown = rules.some((rule) => rule.status === 'Unknown')
  const status = hasFail ? 'Not Eligible' : hasUnknown ? 'Cannot Determine' : 'Eligible'
  const summary = hasFail
    ? 'At least one published rule is not satisfied. Review the failed rules below.'
    : hasUnknown
      ? 'Some required student or company data is missing. This is not an official eligibility decision.'
      : 'Every published rule matches your current record. Confirm with the placement cell before applying.'

  return { status, rules, summary }
}

function normalized(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9+#/.\s-]/g, ' ')
}

function hasTerm(text: string, term: string) {
  const haystack = normalized(text)
  const needle = normalized(term).trim()
  return needle.length > 0 && haystack.includes(needle)
}

function safePercent(numerator: number, denominator: number, fallback = 0) {
  if (denominator <= 0) return fallback
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)))
}

function categoryNote(score: number, strong: string, improve: string) {
  if (score >= 80) return strong
  if (score >= 55) return 'Good signal, with room to make the evidence more specific.'
  return improve
}

// Without semanticEvidence this is the v1 keyword checker. With it (v2), a skill also counts as matched when
// a resume phrase is close enough in meaning; everything else is scored the same way in both versions.
export function analyzeResume(
  resumeText: string,
  opportunity: Opportunity,
  student: Student,
  semanticEvidence?: Record<string, SkillEvidence>,
): ResumeAnalysis {
  const text = normalized(resumeText)
  const required = opportunity.requiredSkills
  const preferred = opportunity.preferredSkills
  const semanticMatches: ResumeAnalysis['semanticMatches'] = []
  const hasSkill = (skill: string) => {
    if (hasTerm(text, skill)) return true
    const evidence = semanticEvidence?.[skill]
    if (!evidence || evidence.similarity < SEMANTIC_THRESHOLD) return false
    if (!semanticMatches.some((match) => match.skill === skill)) semanticMatches.push({ skill, ...evidence })
    return true
  }
  const matchedSkills = required.filter(hasSkill)
  const missingSkills = required.filter((skill) => !hasSkill(skill))
  const matchedPreferred = preferred.filter(hasSkill)
  const requiredScore = safePercent(matchedSkills.length, required.length, 100)

  const projectTerms = [opportunity.title, ...required, ...preferred]
  const projectHits = projectTerms.filter((term) => hasTerm(text, term)).length
  const projectScore = safePercent(projectHits, Math.min(projectTerms.length, 6), 0)

  const keywordTerms = [
    opportunity.title,
    ...required,
    ...preferred,
    ...opportunity.jobDescription
      .split(/\s+/)
      .filter((word) => word.length > 6)
      .slice(0, 8),
  ]
  const keywordHits = keywordTerms.filter(
    (term, index, all) => all.findIndex((candidate) => candidate === term) === index && hasTerm(text, term),
  ).length
  const keywordScore = safePercent(keywordHits, Math.min(new Set(keywordTerms).size, 12), 0)

  const educationSignals = [
    student.branch,
    student.program,
    String(student.graduationYear ?? ''),
    'education',
  ]
  const educationScore = safePercent(
    educationSignals.filter((signal) => hasTerm(text, signal)).length,
    educationSignals.length,
    0,
  )

  const structureSignals = ['summary', 'education', 'skills', 'projects', 'experience', 'achievements']
  const structureScore = safePercent(
    structureSignals.filter((signal) => hasTerm(text, signal)).length,
    structureSignals.length,
    0,
  )

  const lineCount = resumeText.split(/\r?\n/).filter((line) => line.trim()).length
  const longLineCount = resumeText.split(/\r?\n/).filter((line) => line.length > 140).length
  const atsScore = Math.max(
    0,
    Math.min(100, 70 + (lineCount >= 18 ? 15 : 0) - longLineCount * 10 - (resumeText.includes('|') ? 5 : 0)),
  )

  const achievementSignals = [
    'achieved',
    'built',
    'created',
    'reduced',
    'won',
    'finalist',
    'mentored',
    'improved',
    '%',
    'second place',
  ]
  const achievementScore = Math.max(
    20,
    Math.min(
      100,
      35 +
        achievementSignals.filter((signal) => hasTerm(text, signal)).length * 8 +
        (/[0-9]/.test(resumeText) ? 12 : 0),
    ),
  )

  const categories: ResumeCategory[] = [
    {
      key: 'required',
      label: 'Required skills match',
      score: requiredScore,
      note: categoryNote(
        requiredScore,
        'Most required skills are evidenced in the resume.',
        'Add clear evidence for the role’s required skills.',
      ),
    },
    {
      key: 'projects',
      label: 'Project relevance',
      score: projectScore,
      note: categoryNote(
        projectScore,
        'Projects connect well with the selected role.',
        'Make project outcomes and role-specific tools easier to find.',
      ),
    },
    {
      key: 'keywords',
      label: 'Keyword match',
      score: keywordScore,
      note: categoryNote(
        keywordScore,
        'The resume uses language aligned with the job description.',
        'Mirror important job-description terms where they truthfully apply.',
      ),
    },
    {
      key: 'education',
      label: 'Education alignment',
      score: educationScore,
      note: categoryNote(
        educationScore,
        'Degree, branch, and graduation details are visible.',
        'Make degree and graduation details prominent near the top.',
      ),
    },
    {
      key: 'structure',
      label: 'Structure',
      score: structureScore,
      note: categoryNote(
        structureScore,
        'Core resume sections are easy to scan.',
        'Add conventional headings so reviewers and parsers can scan quickly.',
      ),
    },
    {
      key: 'ats',
      label: 'ATS readability',
      score: atsScore,
      note: categoryNote(
        atsScore,
        'Text is mostly clean and parser-friendly.',
        'Keep lines concise and avoid dense visual formatting or tables.',
      ),
    },
    {
      key: 'achievements',
      label: 'Achievements',
      score: achievementScore,
      note: categoryNote(
        achievementScore,
        'The resume includes evidence of outcomes and initiative.',
        'Add more measurable outcomes, scale, or impact to project bullets.',
      ),
    },
  ]

  const weights: Record<string, number> = {
    required: 0.25,
    projects: 0.15,
    keywords: 0.15,
    education: 0.1,
    structure: 0.1,
    ats: 0.15,
    achievements: 0.1,
  }
  const score = Math.round(
    categories.reduce((total, category) => total + category.score * (weights[category.key] ?? 0), 0),
  )

  const strengths = [
    requiredScore >= 65 &&
      `${matchedSkills.length} of ${required.length} required skills are visible: ${matchedSkills.join(', ')}.`,
    projectScore >= 60 && 'At least one project uses language that connects to this role.',
    structureScore >= 65 && 'The resume has recognizable sections that are easy to scan.',
    achievementScore >= 60 && 'There is evidence of initiative, outcomes, or measurable work.',
  ].filter(Boolean) as string[]

  const weakAreas = [
    missingSkills.length > 0 && `Required skills not clearly evidenced: ${missingSkills.join(', ')}.`,
    matchedPreferred.length === 0 &&
      preferred.length > 0 &&
      `Preferred skills are not visible yet: ${preferred.join(', ')}.`,
    projectScore < 60 &&
      'Projects could connect more explicitly to the selected role and its day-to-day work.',
    achievementScore < 60 && 'Several bullets would be stronger with numbers, outcomes, or scope.',
    atsScore < 80 && 'Some formatting or line-length choices may reduce ATS readability.',
  ].filter(Boolean) as string[]

  const suggestions = [
    missingSkills.length > 0
      ? `Add one honest project bullet or coursework line that demonstrates ${missingSkills[0]}.`
      : 'Keep the strongest required skills in a dedicated, easy-to-scan skills line.',
    matchedPreferred.length === 0 && preferred.length > 0
      ? `If applicable, add evidence for ${preferred.slice(0, 2).join(' and ')} from coursework or projects.`
      : 'Move the most role-relevant project directly below the summary.',
    projectScore < 70
      ? 'Rewrite one project bullet using action + tool + outcome, for example: “Built X with Y, reducing Z by N%.”'
      : 'Make project outcomes as measurable as the implementation details.',
    educationScore < 80
      ? 'Put branch, degree, CGPA, and graduation year together near the top.'
      : 'Keep education details consistent with the placement form.',
    'Use this score as an editing guide, then ask your mentor or placement cell for a human review.',
  ]

  return {
    score,
    scoringVersion: semanticEvidence ? 'v2-semantic' : 'v1-keyword',
    semanticMatches,
    categories,
    matchedSkills,
    missingSkills,
    strengths,
    weakAreas,
    suggestions,
  }
}

export function createRecheckRequest(
  studentId: string,
  subject: string,
  code: string,
  today = new Date(),
): RecheckRequest | null {
  if (!subject.trim() || !code.trim()) return null
  const requestDate = today.toISOString().slice(0, 10)
  // the published rechecking window is two weeks from the request date
  const expectedBy = new Date(today.getTime() + 14 * 86_400_000).toISOString().slice(0, 10)
  return {
    id: `recheck-${studentId}-${today.getTime()}`,
    studentId,
    subject: subject.trim(),
    code: code.trim().toUpperCase(),
    requestDate,
    status: 'Submitted',
    remarks: 'Request received. Awaiting fee verification.',
    expectedBy,
  }
}
