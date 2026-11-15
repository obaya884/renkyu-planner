import { expect, test } from 'vitest'
import { checkCompanyHoliday, isValidWorkMinutes, workMinutesFrom } from './settingsInput'

test('F-102・D-4: 時間と分から所定労働時間（分）', () => {
  expect(workMinutesFrom('7', '45')).toBe(465)
  expect(workMinutesFrom('8', '0')).toBe(480)
  expect(workMinutesFrom('', '0')).toBeNaN()
  expect(workMinutesFrom('7.5', '0')).toBeNaN()
  expect(workMinutesFrom('7', '60')).toBeNaN()
  expect(isValidWorkMinutes(workMinutesFrom('24', '0'))).toBe(true)
  expect(isValidWorkMinutes(1441)).toBe(false)
  expect(isValidWorkMinutes(workMinutesFrom('0', '0'))).toBe(false)
})

// 長さは R-15 の数え方（2 月 29 日がある年）で手で数えた。
// 02-01〜03-02 は 2000 年（2 月 29 日あり）で、2/1〜2/29 の 29 日 + 3/1〜3/2 の 2 日 = 31 日。
// 08-01〜09-01 は 8 月 31 日 + 9/1 の 1 日 = 32 日。2026-08-01〜08-31 は 31 日、〜09-01 は 32 日。
test('R-15: 会社の休日の検証', () => {
  expect(checkCompanyHoliday({ kind: 'yearly', start: '12-30', end: '01-03' })).toEqual([]) // 年をまたぐ
  expect(checkCompanyHoliday({ kind: 'yearly', start: '02-01', end: '03-02' })).toEqual([]) // 2 月 29 日がある年で 31 日
  expect(checkCompanyHoliday({ kind: 'yearly', start: '08-01', end: '09-01' })).toEqual(['tooLong'])
  expect(checkCompanyHoliday({ kind: 'once', start: '2026-08-13', end: '2026-08-12' })).toEqual(['reversed'])
  expect(checkCompanyHoliday({ kind: 'once', start: '2026-08-01', end: '2026-08-31' })).toEqual([])
  expect(checkCompanyHoliday({ kind: 'once', start: '2026-08-01', end: '2026-09-01' })).toEqual(['tooLong'])
  expect(checkCompanyHoliday({ kind: 'once', start: '2027-02-30', end: '2027-03-01' })).toEqual(['invalidDate'])
})
