import { loadAppData, STORAGE_KEY } from './App'
import { seedData } from './data'

describe('loadAppData', () => {
  beforeEach(() => localStorage.clear())

  it('keeps saved changes made on the current sample version', () => {
    const edited = { ...seedData, notices: [] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(edited))
    expect(loadAppData().notices).toEqual([])
  })

  it('discards saved data from an older version, so updated sample accounts can sign in', () => {
    const stale = { ...seedData, version: seedData.version - 1, students: [] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stale))
    expect(loadAppData()).toBe(seedData)
  })
})
