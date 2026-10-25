import { fromRow, toRow } from './api'
import { seedData } from './data'
import type { Opportunity } from './types'

describe('database row mapping', () => {
  it('maps camelCase fields to snake_case columns and back without losing anything', () => {
    const opportunity = seedData.opportunities[0]
    const row = toRow(opportunity)

    expect(row).toMatchObject({ company_id: opportunity.companyId, min_cgpa: opportunity.minCgpa })
    expect(Object.keys(row).every((key) => key === key.toLowerCase())).toBe(true)
    expect(fromRow<Opportunity>(row)).toEqual(opportunity)
  })

  it('leaves out undefined fields, so a partial update only touches what changed', () => {
    expect(toRow({ remarks: 'Done', expectedBy: undefined })).toEqual({ remarks: 'Done' })
  })
})
