import { expect, test } from 'vitest'
import { DEFAULT_SETTINGS } from '@/domain/types'
import { SHEET } from '@/domain/view/fixture'
import { fiveDayStatus } from './fiveDays'

const e = (date: string, amount: object, leaveTypeId = 'paid') => ({ id: date, date, leaveTypeId, amount, title: '' }) as never
const D = { unit: 'day' }, H = { unit: 'half' }, M = { unit: 'minutes', minutes: 120 }
const settings = { ...DEFAULT_SETTINGS, grantDay: '05-01', grantYears: { '2026-05-01': { grantDays: 14, entitlementMinutes: null } } }
const base = { settings, grantYearStart: '2026-05-01', today: '2026-11-15' }

test('R-18: 1 日分は 1 日、半日は 0.5 日。時間単位は数えない', () => {
  const s = fiveDayStatus({ ...base, entries: [e('2026-05-15', D), e('2026-06-01', H), e('2026-06-02', M), e('2026-12-28', D)] })
  expect(s).toEqual({ doneDays: 1.5, plannedDays: 1, remainingDays: 2.5, warn: false })
})
test('R-18・R-13: 取得済みか予定かは日付で決める。今日の日程は取得済み', () => {
  const entries = [e('2026-11-15', D), e('2026-11-16', D)]
  expect(fiveDayStatus({ ...base, entries })).toEqual({ doneDays: 1, plannedDays: 1, remainingDays: 3, warn: false })
  expect(fiveDayStatus({ ...base, today: '2026-11-16', entries })).toEqual({ doneDays: 2, plannedDays: 0, remainingDays: 3, warn: false })
})
test('R-18: 予定を含めて 5 日に届けば残りは 0', () => {
  const entries = ['2026-06-01', '2026-06-02', '2026-06-03'].map((d) => e(d, D)).concat(['2026-12-28', '2026-12-29'].map((d) => e(d, D)))
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
  const s = fiveDayStatus({ ...base, entries: [e('2026-08-12', D, 'summer'), e('2027-05-06', D)] })
  expect(s?.remainingDays).toBe(5)
})

// 手計算: 2026-05-01〜2027-04-30 の paid の 1 日分。取得済みは 5/15・6/22・8/10・11/2 の 4 日（5/21・9/4・10/7 は時間単位で数えない）。
// 予定は 12/28・12/29・2/12・2/22・4/30 の 5 日。残り = max(0, 5 - 4 - 5) = 0。今日 11/15 は末日 4/30 まで 166 日で警告なし
test('R-18: 付与日数がちょうど 10 の付与年は対象になる', () => {
  const ten = { ...settings, grantYears: { '2026-05-01': { grantDays: 10, entitlementMinutes: null } } }
  expect(fiveDayStatus({ ...base, settings: ten, entries: SHEET.entries })).toEqual({ doneDays: 4, plannedDays: 5, remainingDays: 0, warn: false })
})
test('R-18: 今の付与年に設定が無ければ、前の付与年の付与日数（14）で対象になる', () => {
  const prev = { ...settings, grantYears: { '2025-05-01': { grantDays: 14, entitlementMinutes: null } } }
  expect(fiveDayStatus({ ...base, settings: prev, entries: SHEET.entries })).toEqual({ doneDays: 4, plannedDays: 5, remainingDays: 0, warn: false })
})
