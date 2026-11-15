import { expect, test } from 'vitest'
import { balanceOf } from '@/domain/leave/balance'
import { PAID_LEAVE_TYPE_ID } from '@/domain/types'
import { SHEET, UNSET } from '@/domain/view/fixture'
import {
  clampGrantDay,
  computedEntitlement,
  entitlementToSave,
  grantDayChoices,
  grantSheetMode,
  enteredEntitlement,
  grantEntitlementToSave,
  joinDaysHours,
  losesOtherGrantYears,
  settingsAfterGrant,
  splitDaysHours,
} from './grantInput'

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
test('§5.3・R-13: 計算した持ち分は、そのモーダルの付与日数 × 所定労働時間 + 繰り越し', () => {
  expect(computedEntitlement(SHEET, '2027-05-01', 16)).toBe(16 * 480 + 2040)
  expect(computedEntitlement(SHEET, '2026-05-01', 15)).toBe(15 * 480)
  expect(computedEntitlement(UNSET, '2026-04-01', 10)).toBe(10 * 480)
})
test('§5.3: 開き方。付与年の指定が無ければ初めて、始まった付与年なら started、まだなら next', () => {
  expect(grantSheetMode(SHEET, null)).toBe('first')
  expect(grantSheetMode(SHEET, '2026-05-01')).toBe('started')
  expect(grantSheetMode(SHEET, '2027-05-01')).toBe('next')
  // 付与日を直すときは、今日が入る付与年を渡して changeDay
  expect(grantSheetMode(SHEET, '2026-05-01', true)).toBe('changeDay')
})
test('§5.3: 付与日を変えて消える設定があるか。今日の付与年の設定は欄に出ていて新しい付与年に入るので数えない', () => {
  const { settings } = SHEET
  const loses = (s: typeof settings, grantDay: '05-01' | '04-01', newStart: '2026-05-01' | '2026-04-01') =>
    losesOtherGrantYears({ mode: 'changeDay', settings: s, grantDay, currentStart: '2026-05-01', newStart })
  // 付与日が同じなら消えない
  expect(loses(settings, '05-01', '2026-05-01')).toBe(false)
  // 設定が今日の付与年の 1 つだけなら、付与日を変えても消えない
  expect(loses(settings, '04-01', '2026-04-01')).toBe(false)
  // 次の付与年の設定があれば消える
  const withNext = { ...settings, grantYears: { ...settings.grantYears, '2027-05-01': { grantDays: 16, entitlementMinutes: null } } }
  expect(loses(withNext, '04-01', '2026-04-01')).toBe(true)
  // 過ぎた付与年の設定があっても消える
  const withPast = { ...settings, grantYears: { ...settings.grantYears, '2025-05-01': { grantDays: 12, entitlementMinutes: null } } }
  expect(loses(withPast, '04-01', '2026-04-01')).toBe(true)
  // 設定が 1 つも無ければ消えない
  expect(loses({ ...settings, grantYears: {} }, '04-01', '2026-04-01')).toBe(false)
  // 付与日を直すモーダルでないとき、付与日の欄が受け付けない値で新しい付与年が決まらないときは出さない
  expect(losesOtherGrantYears({ mode: 'started', settings: withNext, grantDay: '04-01', currentStart: '2026-05-01', newStart: '2026-04-01' })).toBe(false)
  expect(losesOtherGrantYears({ mode: 'changeDay', settings: withNext, grantDay: '04-01', currentStart: '2026-05-01', newStart: null })).toBe(false)
  expect(losesOtherGrantYears({ mode: 'changeDay', settings: withNext, grantDay: '04-01', currentStart: null, newStart: '2026-04-01' })).toBe(false)
})
test('§5.3: 保存したあとの設定。付与日が同じなら、ほかの付与年の設定を残し、その付与年の設定を入れる', () => {
  const settings = { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 14, entitlementMinutes: null }, '2027-05-01': { grantDays: 16, entitlementMinutes: null } } }
  expect(settingsAfterGrant(settings, { grantDay: '05-01', grantDays: 15, entitlementMinutes: 7000 }, '2026-05-01')).toEqual({
    ...settings,
    grantYears: { '2026-05-01': { grantDays: 15, entitlementMinutes: 7000 }, '2027-05-01': { grantDays: 16, entitlementMinutes: null } },
  })
})
test('§5.3: 保存したあとの設定。付与日を変えると、ほかの付与年の設定は消え、新しい付与年の 1 つだけになる', () => {
  const settings = { ...SHEET.settings, grantYears: { '2025-05-01': { grantDays: 12, entitlementMinutes: null }, '2026-05-01': { grantDays: 14, entitlementMinutes: null } } }
  expect(settingsAfterGrant(settings, { grantDay: '04-01', grantDays: 14, entitlementMinutes: null }, '2026-04-01')).toEqual({
    ...settings,
    grantDay: '04-01',
    grantYears: { '2026-04-01': { grantDays: 14, entitlementMinutes: null } },
  })
  // 付与日が未設定のときの初めての入力
  expect(settingsAfterGrant(UNSET.settings, { grantDay: '04-01', grantDays: 10, entitlementMinutes: null }, '2026-04-01').grantYears).toEqual({
    '2026-04-01': { grantDays: 10, entitlementMinutes: null },
  })
})
test('§5.3・R-13: 付与日を変えるとき、計算した持ち分は保存したあとの設定で数え、保存前の設定で数えた値とは違う', () => {
  // 前の付与年（2025-05-01〜2026-04-30）に 10 日の設定と、取得済みの 1 日（2026-02-10）がある。今日は 2026-11-15
  const settings = { ...SHEET.settings, grantYears: { '2025-05-01': { grantDays: 10, entitlementMinutes: null }, '2026-05-01': { grantDays: 14, entitlementMinutes: null } } }
  const entries = [{ id: 'e1', date: '2026-02-10', leaveTypeId: PAID_LEAVE_TYPE_ID, amount: { unit: 'day' }, title: '', done: true }] as const
  const input = { ...SHEET, settings, entries }
  // 付与日を 06-01 に変えると、今日が入る新しい付与年は 2026-06-01〜
  const after = settingsAfterGrant(settings, { grantDay: '06-01', grantDays: 14, entitlementMinutes: null }, '2026-06-01')
  // 保存したあと: 設定は 2026-06-01 の 1 つだけで、いちばん古い付与年なので繰り越し 0 → 14 × 480 = 6720
  expect(computedEntitlement({ ...input, settings: after }, '2026-06-01', 14)).toBe(14 * 480)
  // 保存前の設定（付与日 05-01、2025-05-01 の設定が残る）で数えると、直前の付与年 2025-06-01 の持ち分は
  // 付与日数 10 × 480 = 4800、取得済み 480（2026-02-10）で未割り当て 4320。繰り越し = min(4320, 10 × 480) = 4320
  // → 14 × 480 + 4320 = 11040
  expect(computedEntitlement(input, '2026-06-01', 14)).toBe(14 * 480 + 4320)
})

test('§5.3: 使える日数の日の欄が空なら数にしない。時間の欄が空なら 0 時間', () => {
  expect(enteredEntitlement('', '', 480)).toBeNaN()
  expect(enteredEntitlement('', '2', 480)).toBeNaN()
  expect(enteredEntitlement('16', '', 480)).toBe(16 * 480)
  expect(enteredEntitlement('16', '2', 480)).toBe(16 * 480 + 120)
  expect(enteredEntitlement('0', '0', 480)).toBe(0)
})

test('§5.3: 付与日を変えて保存するときは、欄に出ている使える日数を、触らなくてもそのまま保存する。いまの付与年の上書きは新しい付与年に入る', () => {
  // いまの付与年（2026-05-01〜）に 18 日の上書きがある
  const settings = { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 14, entitlementMinutes: 18 * 480 } } }
  // 欄に出る値は、いまの付与年の持ち分 = 上書きの 18 × 480
  const shown = balanceOf({ settings, entries: SHEET.entries, leaveTypeId: PAID_LEAVE_TYPE_ID, grantYearStart: '2026-05-01' })?.entitlement
  expect(shown).toBe(18 * 480)
  // 保存後はほかの付与年の設定が無く繰り越しが 0 なので、計算した持ち分 = 14 × 480。新しい付与年 2026-04-01 にはまだ上書きが無い（null）
  const toSave = { mode: 'changeDay', settings, grantDay: '04-01', touched: false, enteredMinutes: 18 * 480, computedMinutes: 14 * 480, existing: null } as const
  expect(grantEntitlementToSave(toSave)).toBe(18 * 480)
})
test('§5.3: 上書きも繰り越しも無ければ、付与日だけ変えて保存しても上書きは持たない', () => {
  // SHEET のいまの付与年は上書きが無く、いちばん古い設定なので繰り越しも 0。欄の値 = 14 × 480、保存後の計算 = 14 × 480 + 0
  const toSave = { mode: 'changeDay', settings: SHEET.settings, grantDay: '04-01', touched: false, enteredMinutes: 14 * 480, computedMinutes: 14 * 480, existing: null } as const
  expect(grantEntitlementToSave(toSave)).toBeNull()
})
test('§5.3: 付与日を変えないで保存するときは、始まった付与年と同じく、触らなければすでにある上書きを保つ', () => {
  const settings = { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 14, entitlementMinutes: 18 * 480 } } }
  const same = { mode: 'changeDay', settings, grantDay: '05-01', touched: false, enteredMinutes: 18 * 480, computedMinutes: 14 * 480, existing: 18 * 480 } as const
  expect(grantEntitlementToSave(same)).toBe(18 * 480)
  // 始まった付与年のモーダルは、触らなければ欄の値に関係なく、すでにある上書き（ここでは null）を保つ
  expect(grantEntitlementToSave({ ...same, mode: 'started', enteredMinutes: 16 * 480, existing: null })).toBeNull()
  // 触ったときは、計算した値と同じなら上書きを持たない
  expect(grantEntitlementToSave({ ...same, touched: true, enteredMinutes: 14 * 480 })).toBeNull()
})
