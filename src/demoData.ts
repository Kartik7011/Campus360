import { seedData } from './data'
import type { AppData } from './types'

export const STORAGE_KEY = 'campus360-data'

export function loadAppData(): AppData {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return seedData
    const parsed = JSON.parse(stored) as AppData
    if (parsed.version !== seedData.version || !parsed.students || !parsed.opportunities || !parsed.notices)
      return seedData
    return parsed
  } catch {
    return seedData
  }
}
