import { expect, test } from 'vitest'
import { DEFAULT_SETTINGS } from '@/domain/types'
import { balanceOf } from './balance'

const e = (date: string, amount: object, done: boolean, leaveTypeId = 'paid') => ({ id: date, date, leaveTypeId, amount, title: '', done }) as never
const D = { unit: 'day' }
const H2 = { unit: 'minutes', minutes: 120 }
const settings = { ...DEFAULT_SETTINGS, grantDay: '05-01', grantYears: { '2026-05-01': { grantDays: 14, carryOverMinutes: 0 } } }
// オーナーのシートと同じ記録: 取得済み 4 日と 6 時間、予定 5 日
const sheet = [
  e('2026-05-15', D, true), e('2026-05-21', H2, true), e('2026-06-22', D, true), e('2026-08-10', D, true),
  e('2026-09-04', H2, true), e('2026-10-07', H2, true), e('2026-11-02', D, true),
  e('2026-12-28', D, false), e('2026-12-29', D, false), e('2027-02-12', D, false), e('2027-02-22', D, false), e('2027-04-30', D, false),
]

test('F-401・R-13: シートと同じ残り 9 日と 2 時間、未割り当て 4 日と 2 時間になる', () => {
  expect(balanceOf({ settings, entries: sheet, leaveTypeId: 'paid', grantYearStart: '2026-05-01' })).toEqual({
    entitlement: 14 * 480, taken: 4 * 480 + 360, planned: 5 * 480, remaining: 9 * 480 + 120, unassigned: 4 * 480 + 120,
  })
})
test('F-402: 別の付与年の日程は数えない', () => {
  const b = balanceOf({ settings, entries: [...sheet, e('2027-05-06', D, false)], leaveTypeId: 'paid', grantYearStart: '2026-05-01' })
  expect(b?.planned).toBe(5 * 480)
})
test('F-405: 次の付与年は、前の年の付与日数と未割り当てを初期値にする', () => {
  const b = balanceOf({ settings, entries: sheet, leaveTypeId: 'paid', grantYearStart: '2027-05-01' })
  expect(b?.entitlement).toBe(14 * 480 + 4 * 480 + 120)
})
test('Review Focus 4: 持ち分を超えると未割り当てが負になる', () => {
  const s = { ...settings, grantYears: { '2026-05-01': { grantDays: 1, carryOverMinutes: 0 } } }
  const b = balanceOf({ settings: s, entries: [e('2026-06-01', D, false), e('2026-06-02', D, false)], leaveTypeId: 'paid', grantYearStart: '2026-05-01' })
  expect(b?.unassigned).toBe(-480)
})
test('足した休暇の種類は 日数 × 所定労働時間。付与日が未設定なら null', () => {
  const summer = { id: 'summer', name: '夏季休暇', days: 3, usable: { start: '07-01', end: '09-30' } }
  const s = { ...settings, leaveTypes: [...settings.leaveTypes, summer] }
  expect(balanceOf({ settings: s, entries: [e('2026-08-12', D, true, 'summer')], leaveTypeId: 'summer', grantYearStart: '2026-05-01' })?.remaining).toBe(2 * 480)
  expect(balanceOf({ settings: DEFAULT_SETTINGS, entries: [], leaveTypeId: 'paid', grantYearStart: '2026-05-01' })).toBeNull()
})
test('F-405: 直前の付与年も設定が無ければ持ち分は 0（それより前へはたどらない）', () => {
  const b = balanceOf({ settings, entries: [], leaveTypeId: 'paid', grantYearStart: '2028-05-01' })
  expect(b?.entitlement).toBe(0)
})
test('F-405: 直前の年の未割り当てが負なら繰り越しは 0', () => {
  const s = { ...settings, grantYears: { '2026-05-01': { grantDays: 1, carryOverMinutes: 0 } } }
  const b = balanceOf({ settings: s, entries: [e('2026-06-01', D, false), e('2026-06-02', D, false)], leaveTypeId: 'paid', grantYearStart: '2027-05-01' })
  expect(b?.entitlement).toBe(480)
})
test('種類が settings に無ければ（有休以外）持ち分は 0', () => {
  const b = balanceOf({ settings, entries: [], leaveTypeId: 'unknown', grantYearStart: '2026-05-01' })
  expect(b?.entitlement).toBe(0)
})
