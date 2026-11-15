import { expect, test } from 'vitest'
import { SHEET, UNSET } from '@/domain/view/fixture'
import { clampGrantDay, computedEntitlement, entitlementToSave, grantDayChoices, grantSheetMode, enteredEntitlement, joinDaysHours, splitDaysHours } from './grantInput'

test('R-12・§5.3: 付与日の「日」の選択肢は、選んだ月に合わせる。2 月は 1〜28', () => {
  expect(grantDayChoices(2)).toHaveLength(28)
  expect(grantDayChoices(2).at(-1)).toBe(28)
  expect(grantDayChoices(4).at(-1)).toBe(30)
  expect(grantDayChoices(5).at(-1)).toBe(31)
  expect(grantDayChoices(1)[0]).toBe(1)
})
test('§5.3: 月を変えて日が無くなったら、その月の末日に直す', () => {
  expect(clampGrantDay(2, 31)).toBe(28)
  expect(clampGrantDay(4, 31)).toBe(30)
  expect(clampGrantDay(6, 15)).toBe(15)
})
test('§5.3: この年に使える日数は、日と時間で入れて分に直す。時間に満たない端数は切り捨てて見せる', () => {
  expect(joinDaysHours(16, 2, 480)).toBe(16 * 480 + 120)
  expect(splitDaysHours(16 * 480 + 120, 480)).toEqual({ days: 16, hours: 2 })
  expect(splitDaysHours(465 + 232, 465)).toEqual({ days: 1, hours: 3 }) // 232 分 → 3 時間（52 分は切り捨て）
})
test('§5.3・R-13: 触らなかったか、計算した値と同じなら、上書きを持たない', () => {
  expect(entitlementToSave(false, 17 * 480, 14 * 480, null)).toBeNull()
  expect(entitlementToSave(true, 14 * 480, 14 * 480, null)).toBeNull()
  expect(entitlementToSave(true, 17 * 480, 14 * 480, null)).toBe(17 * 480)
  // すでに上書きがある付与年は、触らなければその上書きを保つ
  expect(entitlementToSave(false, 18 * 480, 14 * 480, 18 * 480)).toBe(18 * 480)
  expect(entitlementToSave(true, 14 * 480, 14 * 480, 18 * 480)).toBeNull()
  expect(entitlementToSave(true, 16 * 480, 14 * 480, 18 * 480)).toBe(16 * 480)
})
test('§5.3・R-13: 計算した持ち分は、その面の付与日数 × 所定労働時間 + 繰り越し', () => {
  expect(computedEntitlement(SHEET, '2027-05-01', 16)).toBe(16 * 480 + 2040)
  expect(computedEntitlement(SHEET, '2026-05-01', 15)).toBe(15 * 480)
  expect(computedEntitlement(UNSET, '2026-04-01', 10)).toBe(10 * 480)
})
test('§5.3: 開き方。付与年の指定が無ければ初めて、始まった付与年なら started、まだなら next', () => {
  expect(grantSheetMode(SHEET, null)).toBe('first')
  expect(grantSheetMode(SHEET, '2026-05-01')).toBe('started')
  expect(grantSheetMode(SHEET, '2027-05-01')).toBe('next')
})

test('§5.3: 使える日数の日の欄が空なら数にしない。時間の欄が空なら 0 時間', () => {
  expect(enteredEntitlement('', '', 480)).toBeNaN()
  expect(enteredEntitlement('', '2', 480)).toBeNaN()
  expect(enteredEntitlement('16', '', 480)).toBe(16 * 480)
  expect(enteredEntitlement('16', '2', 480)).toBe(16 * 480 + 120)
  expect(enteredEntitlement('0', '0', 480)).toBe(0)
})
