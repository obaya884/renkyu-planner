import { expect, test } from 'vitest'
import { DEFAULT_SETTINGS } from '@/domain/types'
import { balanceOf, carryOverOf, grantDaysOf } from './balance'

const e = (date: string, amount: object, done: boolean, leaveTypeId = 'paid') => ({ id: date, date, leaveTypeId, amount, title: '', done }) as never
const D = { unit: 'day' }
const H2 = { unit: 'minutes', minutes: 120 }
const settings = { ...DEFAULT_SETTINGS, grantDay: '05-01', grantYears: { '2026-05-01': { grantDays: 14, entitlementMinutes: null } } }
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
  const s = { ...settings, grantYears: { '2026-05-01': { grantDays: 1, entitlementMinutes: null } } }
  const b = balanceOf({ settings: s, entries: [e('2026-06-01', D, false), e('2026-06-02', D, false)], leaveTypeId: 'paid', grantYearStart: '2026-05-01' })
  expect(b?.unassigned).toBe(-480)
})
test('足した休暇の種類は 日数 × 所定労働時間。付与日が未設定なら null', () => {
  const summer = { id: 'summer', name: '夏季休暇', days: 3, usable: { start: '07-01', end: '09-30' } }
  const s = { ...settings, leaveTypes: [...settings.leaveTypes, summer] }
  expect(balanceOf({ settings: s, entries: [e('2026-08-12', D, true, 'summer')], leaveTypeId: 'summer', grantYearStart: '2026-05-01' })?.remaining).toBe(2 * 480)
  expect(balanceOf({ settings: DEFAULT_SETTINGS, entries: [], leaveTypeId: 'paid', grantYearStart: '2026-05-01' })).toBeNull()
})
test('F-405・R-13: 直前の付与年に設定が無くても、いちばん古い設定から順にたどる', () => {
  // 2026: 14 日。2027: 14 + 繰り越し 14 = 28 日。2028: 14 + 繰り越し（28 日のうち付与日数の 14 日まで）= 28 日
  const b = balanceOf({ settings, entries: [], leaveTypeId: 'paid', grantYearStart: '2028-05-01' })
  expect(b?.entitlement).toBe(28 * 480)
})
test('F-405: 直前の年の未割り当てが負なら繰り越しは 0', () => {
  const s = { ...settings, grantYears: { '2026-05-01': { grantDays: 1, entitlementMinutes: null } } }
  const b = balanceOf({ settings: s, entries: [e('2026-06-01', D, false), e('2026-06-02', D, false)], leaveTypeId: 'paid', grantYearStart: '2027-05-01' })
  expect(b?.entitlement).toBe(480)
})
test('種類が settings に無ければ（有休以外）持ち分は 0', () => {
  const b = balanceOf({ settings, entries: [], leaveTypeId: 'unknown', grantYearStart: '2026-05-01' })
  expect(b?.entitlement).toBe(0)
})

test('F-405・R-13: carryOverOf。いちばん古い設定の年は 0、後の年は直前の未割り当て（負なら 0、付与日数まで）、付与日が未設定なら 0', () => {
  expect(carryOverOf({ settings: { ...settings, grantYears: { '2026-05-01': { grantDays: 14, entitlementMinutes: 90 } } }, entries: [], grantYearStart: '2026-05-01' })).toBe(0)
  expect(carryOverOf({ settings, entries: sheet, grantYearStart: '2027-05-01' })).toBe(4 * 480 + 120)
  const over = { ...settings, grantYears: { '2026-05-01': { grantDays: 1, entitlementMinutes: null } } }
  expect(carryOverOf({ settings: over, entries: [e('2026-06-01', D, false), e('2026-06-02', D, false)], grantYearStart: '2027-05-01' })).toBe(0)
  // 2027 の持ち分は 14 日 + 2040 分で日程が無いので、2028 への繰り越しは付与日数の 14 日まで
  expect(carryOverOf({ settings, entries: sheet, grantYearStart: '2028-05-01' })).toBe(14 * 480)
  expect(carryOverOf({ settings: DEFAULT_SETTINGS, entries: [], grantYearStart: '2026-05-01' })).toBe(0)
})

// 以下 Task 11: 持ち分を主役にした R-13
test('R-13: 持ち分 = 付与日数 + 繰り越し。繰り越しは前の年の未割り当て', () => {
  // 2027-05-01 の付与年: 付与日数は前の年の 14、繰り越しは 2040
  expect(balanceOf({ settings, entries: sheet, leaveTypeId: 'paid', grantYearStart: '2027-05-01' })?.entitlement).toBe(14 * 480 + 2040)
})
test('R-13: 繰り越しは、前の年の付与日数までを上限とする', () => {
  // 前の年に日程が 1 件も無く、前の年の持ち分が上書きで 30 日のとき: 未割り当ては 30 日だが、繰り越せるのは付与日数の 14 日まで
  const s = { ...settings, grantYears: { '2026-05-01': { grantDays: 14, entitlementMinutes: 30 * 480 } } }
  expect(carryOverOf({ settings: s, entries: [], grantYearStart: '2027-05-01' })).toBe(14 * 480)
})
test('R-13: 3 年目以降も、いちばん古い設定から順に計算する', () => {
  // 日程なし、設定は 2026-05-01 の 14 日だけ。2027 は 14 + 14 = 28 日、2028 は 14 + 繰り越し 14（前の年の未割り当て 28 日のうち、付与日数 14 日まで）= 28 日
  expect(balanceOf({ settings, entries: [], leaveTypeId: 'paid', grantYearStart: '2028-05-01' })?.entitlement).toBe(28 * 480)
  expect(grantDaysOf(settings, '2029-05-01')).toBe(14)
})
test('R-13: 持ち分の上書きがあれば、その値を使う', () => {
  const s = { ...settings, grantYears: { '2026-05-01': { grantDays: 14, entitlementMinutes: 17 * 480 } } }
  expect(balanceOf({ settings: s, entries: [], leaveTypeId: 'paid', grantYearStart: '2026-05-01' })?.entitlement).toBe(17 * 480)
})
test('R-13: いちばん古い設定より前の付与年は、付与日数も繰り越しも 0', () => {
  expect(balanceOf({ settings, entries: [], leaveTypeId: 'paid', grantYearStart: '2025-05-01' })?.entitlement).toBe(0)
})
test('R-13: 付与日数を途中の年で直すと、その年から後に使う', () => {
  const s = { ...settings, grantYears: { '2026-05-01': { grantDays: 14, entitlementMinutes: null }, '2027-05-01': { grantDays: 16, entitlementMinutes: null } } }
  expect(grantDaysOf(s, '2028-05-01')).toBe(16)
})
test('R-13・§5.1: いちばん古い設定より 100 年以上先の付与年は、繰り越し 0 として打ち切る', () => {
  expect(carryOverOf({ settings, entries: [], grantYearStart: '2126-05-01' })).toBe(0)
  expect(balanceOf({ settings, entries: [], leaveTypeId: 'paid', grantYearStart: '2126-05-01' })?.entitlement).toBe(14 * 480)
  expect(carryOverOf({ settings, entries: [], grantYearStart: '2125-05-01' })).toBe(14 * 480)
})
test('R-13: 設定のある付与年が 3 つあるとき、3 つ目の繰り越しは 2 つ目の未割り当てから決まる', () => {
  // 設定: 2026 は 14 日、2027 は 16 日、2028 は 10 日（所定 480 分）。日程は 2027 年だけ: 取得済み 1 日、予定 3 日
  // 2026: 持ち分 14 × 480 = 6720。日程なしで未割り当て 6720。2027 への繰り越し = min(6720, 14 × 480) = 6720
  // 2027: 持ち分 16 × 480 + 6720 = 14400。残り 14400 − 480 = 13920、未割り当て 13920 − 3 × 480 = 12480。
  //       2028 への繰り越し = min(12480, 2027 の付与日数 16 × 480 = 7680) = 7680
  // 2028: 持ち分 10 × 480 + 7680 = 12480（2026 の未割り当てを引き継ぐ誤りなら 4800 + 6720 = 11520 になる）
  const s = {
    ...settings,
    grantYears: {
      '2026-05-01': { grantDays: 14, entitlementMinutes: null },
      '2027-05-01': { grantDays: 16, entitlementMinutes: null },
      '2028-05-01': { grantDays: 10, entitlementMinutes: null },
    },
  }
  const entries = [e('2027-06-01', D, true), e('2027-07-01', D, false), e('2027-07-02', D, false), e('2027-07-03', D, false)]
  expect(carryOverOf({ settings: s, entries, grantYearStart: '2027-05-01' })).toBe(6720)
  expect(carryOverOf({ settings: s, entries, grantYearStart: '2028-05-01' })).toBe(7680)
  expect(balanceOf({ settings: s, entries, leaveTypeId: 'paid', grantYearStart: '2028-05-01' })?.entitlement).toBe(12480)
})
