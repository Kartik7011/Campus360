import publicDemoSeed from './publicDemoSeed.json'
import type { AppData } from './types'

const STORAGE_KEY = 'campus360-public-demo-data'
const seed = publicDemoSeed as AppData

export function loadPublicDemoData(): AppData {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as AppData
      if (parsed.version === seed.version && parsed.students?.[0]?.email === 'student@campus360.example') return parsed
    }
  } catch {
    // Start with the curated synthetic fixture when session storage is unavailable or invalid.
  }
  return structuredClone(seed)
}

export function savePublicDemoData(data: AppData) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // The demo remains usable in memory when browser storage is disabled.
  }
}
