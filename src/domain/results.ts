import { patch, today as todayOf, uid, upsert, type Op } from '../ops'
import { notify } from './notify'
import type { AppData, CourseResult, MarkChangeReason, SemesterResult } from '../types'

// 10-point grading scale from the academic regulations
const scale: [number, string, number][] = [
  [90, 'O', 10],
  [80, 'A+', 9],
  [70, 'A', 8],
  [60, 'B+', 7],
  [50, 'B', 6],
  [45, 'C', 5],
  [40, 'P', 4],
  [0, 'F', 0],
]

export function gradeFor(total: number) {
  const [, grade, points] = scale.find(([min]) => total >= min) ?? scale[scale.length - 1]
  return { grade, gradePoints: points, passed: points > 0 }
}

const sessionOrder = (data: Pick<AppData, 'examSessions'>) =>
  new Map(data.examSessions.map((session) => [session.id, session.startsOn]))

// The attempt that counts for a course: the latest declared one.
export function latestResult(
  studentId: string,
  courseCode: string,
  data: Pick<AppData, 'courseResults' | 'examSessions'>,
) {
  const order = sessionOrder(data)
  return data.courseResults
    .filter(
      (row) => row.studentId === studentId && row.courseCode === courseCode && row.status === 'Declared',
    )
    .sort((a, b) => (order.get(b.sessionId) ?? '').localeCompare(order.get(a.sessionId) ?? ''))[0]
}

export function attemptsFor(
  studentId: string,
  courseCode: string,
  data: Pick<AppData, 'courseResults' | 'examSessions'>,
) {
  const order = sessionOrder(data)
  return data.courseResults
    .filter((row) => row.studentId === studentId && row.courseCode === courseCode)
    .sort((a, b) => (order.get(a.sessionId) ?? '').localeCompare(order.get(b.sessionId) ?? ''))
}

// shortcut: Campus360 recalculates SGPA/CGPA only to stand in for the ERP in sample mode;
// with a real ERP these values arrive from it and this is not used (FR-MRK-07).
export function recalculateSemester(
  studentId: string,
  semester: number,
  results: CourseResult[],
  courses: AppData['courses'],
  semesterResults: SemesterResult[],
) {
  const credits = (code: string) => courses.find((course) => course.code === code)?.credits ?? 0
  const counted = (sem?: number) => {
    const latest = new Map<string, CourseResult>()
    // a cleared back or special attempt replaces the failed one, so the best attempt counts
    for (const row of results.filter(
      (item) =>
        item.studentId === studentId &&
        item.status === 'Declared' &&
        (sem === undefined || item.semester === sem),
    ))
      if ((latest.get(row.courseCode)?.gradePoints ?? -1) < (row.gradePoints ?? 0))
        latest.set(row.courseCode, row)
    return [...latest.values()]
  }
  const gpa = (rows: CourseResult[]) => {
    const total = rows.reduce((sum, row) => sum + credits(row.courseCode), 0)
    return total
      ? Math.round(
          (rows.reduce((sum, row) => sum + (row.gradePoints ?? 0) * credits(row.courseCode), 0) / total) *
            100,
        ) / 100
      : null
  }
  const semesterRows = counted(semester)
  const sgpa = gpa(semesterRows)
  // CGPA: credit-weighted SGPAs of every declared semester up to this one, with this semester's new SGPA
  const semesters = semesterResults
    .filter((row) => row.studentId === studentId && row.semester <= semester)
    .map((row) => (row.semester === semester ? { ...row, sgpa } : row))
    .filter((row) => row.sgpa !== null)
  const weight = semesters.reduce((total, row) => total + row.creditsRegistered, 0)
  const cgpa = weight
    ? Math.round(
        (semesters.reduce((total, row) => total + (row.sgpa ?? 0) * row.creditsRegistered, 0) / weight) * 100,
      ) / 100
    : null
  const failed = semesterRows.filter((row) => !row.passed).length
  return {
    sgpa,
    cgpa,
    creditsEarned: semesterRows
      .filter((row) => row.passed)
      .reduce((sum, row) => sum + credits(row.courseCode), 0),
    status: (failed ? 'Pass with backlog' : 'Pass') as SemesterResult['status'],
  }
}

// Changes a declared mark, keeping the old value in the history and superseding issued grade sheets.
export function changeMarks(
  result: CourseResult,
  newTotal: number,
  reason: MarkChangeReason,
  note: string,
  data: Pick<AppData, 'courseResults' | 'semesterResults' | 'courses' | 'issuedDocuments' | 'students'>,
  now = new Date(),
): Op[] {
  if (result.total === newTotal) return []
  const today = todayOf(now)
  const grade = gradeFor(newTotal)
  const updated: CourseResult = { ...result, total: newTotal, ...grade }
  const ops: Op[] = [
    patch('courseResults', result.id, { total: newTotal, ...grade }),
    upsert('markChanges', {
      id: uid('markchange'),
      resultId: result.id,
      studentId: result.studentId,
      courseCode: result.courseCode,
      fromTotal: result.total ?? 0,
      toTotal: newTotal,
      fromGrade: result.grade ?? '',
      toGrade: grade.grade,
      reason,
      note,
      changedOn: today,
    }),
  ]
  const results = data.courseResults.map((row) => (row.id === result.id ? updated : row))
  const semesterRow = data.semesterResults.find(
    (row) => row.studentId === result.studentId && row.semester === result.semester,
  )
  if (semesterRow) {
    const totals = recalculateSemester(
      result.studentId,
      result.semester,
      results,
      data.courses,
      data.semesterResults,
    )
    ops.push(patch('semesterResults', semesterRow.id, totals))
    const student = data.students.find((item) => item.id === result.studentId)
    if (
      student &&
      semesterRow.semester ===
        Math.max(
          ...data.semesterResults.filter((row) => row.studentId === student.id).map((row) => row.semester),
        )
    )
      ops.push(patch('students', student.id, { cgpa: totals.cgpa }))
  }
  for (const doc of data.issuedDocuments)
    if (
      doc.studentId === result.studentId &&
      !doc.supersededOn &&
      ((doc.kind === 'Grade sheet' && doc.ref === String(result.semester)) ||
        doc.kind === 'Consolidated marks statement')
    )
      ops.push(patch('issuedDocuments', doc.id, { supersededOn: today }))
  return ops
}

// Publishes a session's declared course results: semester SGPA/CGPA, the student's CGPA, and a notification each.
export function declareResults(
  sessionId: string,
  data: Pick<AppData, 'courseResults' | 'semesterResults' | 'courses' | 'students' | 'examSessions'>,
  now = new Date(),
): Op[] {
  const session = data.examSessions.find((row) => row.id === sessionId)
  if (!session) return []
  const declared = data.courseResults.filter(
    (row) => row.sessionId === sessionId && row.status === 'Declared',
  )
  const ops: Op[] = [patch('examSessions', session.id, { resultDeclaredOn: todayOf(now) })]
  for (const studentId of [...new Set(declared.map((row) => row.studentId))]) {
    const semester = declared.find((row) => row.studentId === studentId)!.semester
    const registered = data.courseResults
      .filter((row) => row.studentId === studentId && row.semester === semester)
      .reduce(
        (sum, row) => sum + (data.courses.find((course) => course.code === row.courseCode)?.credits ?? 0),
        0,
      )
    const existing = data.semesterResults.find(
      (row) => row.studentId === studentId && row.semester === semester,
    )
    const base: SemesterResult = existing ?? {
      id: uid('sem'),
      studentId,
      semester,
      sessionId,
      sgpa: null,
      cgpa: null,
      creditsEarned: 0,
      creditsRegistered: registered,
      status: 'Awaited',
      declaredOn: null,
    }
    const others = data.semesterResults.filter((row) => row.id !== base.id)
    const totals = recalculateSemester(studentId, semester, data.courseResults, data.courses, [
      ...others,
      { ...base, creditsRegistered: registered },
    ])
    const row = { ...base, ...totals, creditsRegistered: registered, declaredOn: todayOf(now) }
    ops.push(existing ? patch('semesterResults', existing.id, row) : upsert('semesterResults', row))
    const latest = Math.max(
      semester,
      ...others.filter((item) => item.studentId === studentId).map((item) => item.semester),
    )
    if (semester === latest) ops.push(patch('students', studentId, { cgpa: totals.cgpa }))
    ops.push(
      notify(
        studentId,
        'results',
        `${session.name} results declared`,
        'Your result is on the Results page. Rechecking is open for 10 days.',
        now,
      ),
    )
  }
  return ops
}

export const sgpaTrend = (studentId: string, semesterResults: SemesterResult[]) =>
  semesterResults
    .filter((row) => row.studentId === studentId && row.sgpa !== null && row.declaredOn)
    .sort((a, b) => a.semester - b.semester)
    .map((row) => ({ semester: row.semester, sgpa: row.sgpa as number }))
