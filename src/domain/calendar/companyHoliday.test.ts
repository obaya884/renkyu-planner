import { describe, expect, test } from 'vitest'
import { isValidCompanyHoliday } from './companyHoliday'

const yearly = (start: string, end: string) => ({ kind: 'yearly', start, end }) as const
const once = (start: string, end: string) => ({ kind: 'once', start, end }) as const

describe('会社の休日の受け付け（R-15）', () => {
  test('R-15: 会社の休日は 1 件 31 日まで（毎年同じ月日）', () => {
    expect(isValidCompanyHoliday(yearly('12-30', '01-03'))).toBe(true)
    expect(isValidCompanyHoliday(yearly('01-01', '12-31'))).toBe(false)
    expect(isValidCompanyHoliday(yearly('08-13', '08-12'))).toBe(false)
    expect(isValidCompanyHoliday(yearly('08-15', '08-12'))).toBe(false)
    expect(isValidCompanyHoliday(yearly('02-01', '03-02'))).toBe(true)
    expect(isValidCompanyHoliday(yearly('02-01', '03-03'))).toBe(false)
    expect(isValidCompanyHoliday(yearly('02-29', '02-29'))).toBe(true)
    expect(isValidCompanyHoliday(yearly('02-30', '03-01'))).toBe(false)
    expect(isValidCompanyHoliday(yearly('13-01', '13-02'))).toBe(false)
  })
  test('R-15: 会社の休日は 1 件 31 日まで（その年だけ）', () => {
    expect(isValidCompanyHoliday(once('2026-08-01', '2026-08-31'))).toBe(true)
    expect(isValidCompanyHoliday(once('2026-08-01', '2026-09-01'))).toBe(false)
    expect(isValidCompanyHoliday(once('2026-08-14', '2026-08-12'))).toBe(false)
    expect(isValidCompanyHoliday(once('2026-02-30', '2026-03-01'))).toBe(false)
    expect(isValidCompanyHoliday(once('2026-08-12', '2026-08-12'))).toBe(true)
  })
})
