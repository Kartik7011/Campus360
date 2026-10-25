import { uid, upsert } from '../ops'
import type { ViewKey } from '../types'

// In-app notification for one student; workflows add one wherever requirement.md FR-NOT-04 lists an event.
export const notify = (studentId: string, view: ViewKey, title: string, body: string, now = new Date()) =>
  upsert('notifications', {
    id: uid('notification'),
    studentId,
    title,
    body,
    view,
    createdOn: now.toISOString(),
    readOn: null,
  })
