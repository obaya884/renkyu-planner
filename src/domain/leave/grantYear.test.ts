import { expect, test } from 'vitest'
import { grantYearOf, isValidGrantDay } from './grantYear'

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
