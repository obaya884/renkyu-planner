import { expect, test } from 'vitest'
import { grantYearOf, grantYearStartOf, isValidGrantDay } from './grantYear'

test('F-402・R-12: 付与年は付与日から次の付与日の前日まで', () => {
  expect(grantYearOf('2026-11-15', '05-01')).toEqual({ start: '2026-05-01', end: '2027-04-30' })
  expect(grantYearOf('2026-04-30', '05-01')).toEqual({ start: '2025-05-01', end: '2026-04-30' })
  expect(grantYearOf('2026-05-01', '05-01')).toEqual({ start: '2026-05-01', end: '2027-04-30' })
  expect(grantYearOf('2027-10-16', '10-17')).toEqual({ start: '2026-10-17', end: '2027-10-16' })
})
test('R-12: 2 月 29 日と存在しない月日は付与日にできない', () => {
  expect(isValidGrantDay('02-29')).toBe(false)
  expect(isValidGrantDay('04-31')).toBe(false)
  expect(isValidGrantDay('05-01')).toBe(true)
})
test('R-12: grantYearStartOf は grantYearOf の開始日と同じ', () => {
  for (const d of ['2026-04-30', '2026-05-01', '2026-12-31', '2027-01-01', '0001-01-01', '9999-12-31']) {
    for (const g of ['05-01', '01-01', '12-31', '04-01'] as const) expect(grantYearStartOf(d, g)).toBe(grantYearOf(d, g).start)
  }
})
