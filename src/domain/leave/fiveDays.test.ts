import { expect, test } from 'vitest'
import { DEFAULT_SETTINGS } from '@/domain/types'
import { fiveDayStatus } from './fiveDays'

const e = (date: string, amount: object, done: boolean, leaveTypeId = 'paid') => ({ id: date, date, leaveTypeId, amount, title: '', done }) as never
const D = { unit: 'day' }, H = { unit: 'half' }, M = { unit: 'minutes', minutes: 120 }
const settings = { ...DEFAULT_SETTINGS, grantDay: '05-01', grantYears: { '2026-05-01': { grantDays: 14, entitlementMinutes: null } } }
const base = { settings, grantYearStart: '2026-05-01', today: '2026-11-15' }

test('R-18: 1 日分は 1 日、半日は 0.5 日。時間単位は数えない', () => {
  const s = fiveDayStatus({ ...base, entries: [e('2026-05-15', D, true), e('2026-06-01', H, true), e('2026-06-02', M, true), e('2026-12-28', D, false)] })
  expect(s).toEqual({ doneDays: 1.5, plannedDays: 1, remainingDays: 2.5, warn: false })
})
test('R-18: 予定を含めて 5 日に届けば残りは 0', () => {
  const entries = ['2026-06-01', '2026-06-02', '2026-06-03'].map((d) => e(d, D, true)).concat(['2026-12-28', '2026-12-29'].map((d) => e(d, D, false)))
  expect(fiveDayStatus({ ...base, entries })?.remainingDays).toBe(0)
})
test('R-18: 付与年の末日まで 90 日以内で届いていなければ警告', () => {
  expect(fiveDayStatus({ ...base, today: '2027-01-29', entries: [] })?.warn).toBe(false) // 末日 4/30 まで 91 日
  expect(fiveDayStatus({ ...base, today: '2027-01-30', entries: [] })?.warn).toBe(true)  // 90 日
  expect(fiveDayStatus({ ...base, today: '2027-04-30', entries: [] })?.warn).toBe(true)
})
test('R-18: 付与日数が 10 未満・付与日が未設定・ほかの休暇の種類・別の付与年', () => {
  const few = { ...settings, grantYears: { '2026-05-01': { grantDays: 9, entitlementMinutes: null } } }
  expect(fiveDayStatus({ ...base, settings: few, entries: [] })).toBeNull()
  expect(fiveDayStatus({ ...base, settings: DEFAULT_SETTINGS, entries: [] })).toBeNull()
  const s = fiveDayStatus({ ...base, entries: [e('2026-08-12', D, true, 'summer'), e('2027-05-06', D, false)] })
  expect(s?.remainingDays).toBe(5)
})
