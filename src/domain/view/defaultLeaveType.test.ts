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
