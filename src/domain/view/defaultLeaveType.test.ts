import { expect, test } from 'vitest'
import { SHEET, UNSET } from './fixture'
import { defaultLeaveTypeId } from './defaultLeaveType'

const type = (id: string, days: number, start: string, end: string) => ({ id, name: id, days, usable: { start, end }, grantDay: null, together: false })
const summer = (days: number) => type('summer', days, '07-01', '09-30')
const withTypes = (types: object[], base = SHEET) => ({ ...base, settings: { ...base.settings, leaveTypes: [...base.settings.leaveTypes, ...types] } }) as typeof SHEET

test('F-208・§5.1: 休む日が全部期間に入り、休む量ぶんの未割り当てがあれば、その休暇', () => {
  expect(defaultLeaveTypeId(withTypes([summer(1)]), ['2027-09-24'])).toBe('summer')
  expect(defaultLeaveTypeId(withTypes([summer(2)]), ['2027-09-21', '2027-09-22'])).toBe('summer')
})
test('F-208・§5.1: 足りない・期間の外・付与日が無いときは有休', () => {
  expect(defaultLeaveTypeId(withTypes([summer(1)]), ['2027-09-21', '2027-09-22'])).toBe('paid') // 1 日分しかない
  expect(defaultLeaveTypeId(withTypes([summer(0)]), ['2027-09-24'])).toBe('paid')
  expect(defaultLeaveTypeId(withTypes([summer(1)]), ['2026-11-20'])).toBe('paid')
  expect(defaultLeaveTypeId(withTypes([summer(1)]), ['2027-09-24', '2027-10-01'])).toBe('paid')
  expect(defaultLeaveTypeId(withTypes([summer(1)], UNSET), ['2027-09-24'])).toBe('paid')
})
test('F-208・§5.1: 2 つ以上当たるときは、設定画面の並びで上', () => {
  const refresh = type('refresh', 1, '09-01', '09-30')
  expect(defaultLeaveTypeId(withTypes([summer(1), refresh]), ['2027-09-24'])).toBe('summer')
  expect(defaultLeaveTypeId(withTypes([refresh, summer(1)]), ['2027-09-24'])).toBe('refresh')
})
test('F-208・§5.1: まとめて取る休暇の印がある種類は、期間の中で足りていても初期値にしない', () => {
  expect(defaultLeaveTypeId(withTypes([{ ...summer(1), together: true }]), ['2027-09-24'])).toBe('paid')
})

// 付与される日が 09-01 の種類。付与年は 2026-09-01〜2027-08-31 と 2027-09-01〜2028-08-31。日数 1 なので、どちらの持ち分も 1 × 480 = 480 分
const autumn = { id: 'autumn', name: 'autumn', days: 1, usable: { start: '07-01', end: '09-30' }, grantDay: '09-01', together: false }
const crossing = ['2027-08-31', '2027-09-01'] // 8/31 は前の付与年、9/1 は次の付与年に入る
test('F-208・R-13: 1 日しかない種類でも、休む日がその種類の付与年をまたげば、付与年ごとに足りるのでその種類', () => {
  // 2026-09-01 の付与年: 480 − 480 = 0 ≥ 0。2027-09-01 の付与年: 480 − 480 = 0 ≥ 0
  expect(defaultLeaveTypeId(withTypes([autumn]), crossing)).toBe('autumn')
})
test('F-208・R-13: 付与年をまたぐとき、片方の付与年にその種類の日程があって足りなければ有休', () => {
  // 2026-09-10 に取得済みの 1 日があるので、2026-09-01 の付与年の未割り当ては 480 − 480 = 0。8/31 を足すと 0 − 480 = −480 < 0
  const used = { id: 'a1', date: '2026-09-10', leaveTypeId: 'autumn', amount: { unit: 'day' }, title: '' } as const
  const input = { ...withTypes([autumn]), entries: [...SHEET.entries, used] }
  expect(defaultLeaveTypeId(input, crossing)).toBe('paid')
})
