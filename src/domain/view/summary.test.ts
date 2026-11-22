import { expect, test } from 'vitest'
import { SHEET, UNSET } from './fixture'
import { LONG_BREAK_DAYS } from '../quarters/quarters'
import { buildSummary } from './summary'

test('F-401: 有休のカード。残り 9 日と 2 時間、予定 5 日、未割り当て 4 日と 2 時間', () => {
  const s = buildSummary(SHEET)
  expect(s.state).toBe('set')
  expect(s.cards).toEqual([{ leaveTypeId: 'paid', name: '有休', remaining: 9 * 480 + 120, planned: 5 * 480, unassigned: 4 * 480 + 120, short: false, usable: null, usedUp: false }])
})
test('F-404・R-18: シートの記録は取得済み 4 日・予定 5 日で届いているので出さない', () => {
  expect(buildSummary(SHEET).fiveDays).toBeNull()
  const few = { ...SHEET, entries: SHEET.entries.slice(0, 3) } // 取得済みの 1 日分が 2 件
  expect(buildSummary(few).fiveDays).toEqual({ doneDays: 2, plannedDays: 0, remainingDays: 3, warn: false })
})
test('F-403・R-14: 今日からの 4 つの四半期の長めの休暇', () => {
  const s = buildSummary(SHEET)
  expect(s.longBreaks.map((c) => [c.quarter.start, c.has])).toEqual([
    ['2026-10-01', true],  // 12/26〜1/3 の 9 連休
    ['2027-01-01', false],
    ['2027-04-01', true],  // 4/30 を休んで 4/29〜5/5 の 7 連休
    ['2027-07-01', false],
  ])
  expect(s.longBreakDays).toBe(LONG_BREAK_DAYS) // 見出しの「5」は R-14 の日数
  expect(LONG_BREAK_DAYS).toBe(5)
})
test('F-106: 付与日が無ければカードを出さない', () => {
  const s = buildSummary(UNSET)
  expect(s).toMatchObject({ state: 'unset', cards: [], fiveDays: null })
  expect(s.longBreaks.map((c) => c.has)).toEqual([false, false, true, false]) // 2027 年の 5/1〜5/5
})
test('F-211: 持ち分を超えると short', () => {
  const s = buildSummary({ ...SHEET, settings: { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 9, entitlementMinutes: null } } } })
  expect(s.cards[0]).toMatchObject({ unassigned: -360, short: true })
})

const only = (keys: string[]) => ({ ...SHEET, settings: { ...SHEET.settings, grantYears: Object.fromEntries(keys.map((k) => [k, { grantDays: 14, entitlementMinutes: null }])) } })
test('F-407: 今の付与年に設定が無く、前の年にあれば知らせる', () => {
  expect(buildSummary(only(['2025-05-01'])).newGrantYearStart).toBe('2026-05-01')
  expect(buildSummary(SHEET).newGrantYearStart).toBeNull()
  expect(buildSummary(only(['2027-05-01'])).newGrantYearStart).toBeNull() // 前の年に設定が無い
  expect(buildSummary(only(['2025-05-01', '2026-05-01'])).newGrantYearStart).toBeNull()
  expect(buildSummary(UNSET).newGrantYearStart).toBeNull()
})

const free = (grantDay: string | null) => ({ id: 'free', name: 'フリーバカンス', days: 5, usable: null, grantDay, together: true })
const freeEntries = [
  { id: 'f1', date: '2026-12-10', leaveTypeId: 'free', amount: { unit: 'day' }, title: '' },
  { id: 'f2', date: '2027-02-03', leaveTypeId: 'free', amount: { unit: 'day' }, title: '' },
] as const
test('§3.2・R-13: 足した休暇のカードは、その種類の付与される日で区切った、今日が入る付与年で数える', () => {
  const s = buildSummary({
    ...SHEET,
    settings: { ...SHEET.settings, leaveTypes: [...SHEET.settings.leaveTypes, free('01-01')] },
    entries: [...SHEET.entries, ...freeEntries],
  })
  expect(s.cards[0]).toEqual(buildSummary(SHEET).cards[0])
  // 2026-01-01〜2026-12-31。12/10 は今日（11/15）より後なので予定（R-13）
  expect(s.cards[1]).toMatchObject({ leaveTypeId: 'free', remaining: 2400, planned: 480, unassigned: 1920 })
})

const summer = { id: 'summer', name: '夏季休暇', days: 1, usable: { start: '07-01', end: '09-30' }, grantDay: null, together: false } as const
const summerDone = { id: 's1', date: '2026-07-15', leaveTypeId: 'summer', amount: { unit: 'day' }, title: '' } as const
const withSummer = (entries: typeof SHEET.entries) => ({ ...SHEET, settings: { ...SHEET.settings, leaveTypes: [...SHEET.settings.leaveTypes, summer] }, entries })
test('§3.2: 使える期間があり、残りが 0 なら使い切り', () => {
  expect(buildSummary(withSummer([...SHEET.entries, summerDone])).cards[1]).toMatchObject({ remaining: 0, usable: { start: '07-01', end: '09-30' }, usedUp: true })
  expect(buildSummary(withSummer(SHEET.entries)).cards[1]).toMatchObject({ remaining: 480, usedUp: false })
  expect(buildSummary(SHEET).cards[0].usedUp).toBe(false) // 使える期間が無い
})

test('§3.2・F-211: paid は有休の 1 件、extras は足した休暇。使い切りは不足でないときだけ真', () => {
  const s = buildSummary(SHEET)
  expect(s.paid?.leaveTypeId).toBe('paid')
  expect(s.extras).toEqual([])
  const summer = { id: 'summer', name: '夏季休暇', days: 1, usable: { start: '07-01', end: '09-30' }, grantDay: null, together: false } as const
  const e = (id: string, date: string) => ({ id, date, leaveTypeId: 'summer', amount: { unit: 'day' }, title: '' }) as const
  const over = buildSummary({ ...SHEET, settings: { ...SHEET.settings, leaveTypes: [...SHEET.settings.leaveTypes, summer] }, entries: [...SHEET.entries, e('a', '2026-07-15'), e('b', '2026-07-16')] })
  expect(over.extras[0]).toMatchObject({ leaveTypeId: 'summer', short: true, usedUp: false })
})

test('§3.2・I-2: 取得済みが持ち分を超えて残りが負なら、残りは 0。未割り当ては負のまま（不足で出す）', () => {
  // 夏季休暇 1 日（480 分）に取得済みの 1 日分が 2 件: 計算の残り 480 − 960 = −480 → 出す残りは 0。未割り当て −480 − 0 = −480
  const e = (id: string, date: string) => ({ id, date, leaveTypeId: 'summer', amount: { unit: 'day' }, title: '' }) as const
  const over = buildSummary(withSummer([...SHEET.entries, e('a', '2026-07-15'), e('b', '2026-07-16')]))
  expect(over.extras[0]).toMatchObject({ remaining: 0, unassigned: -480, short: true, usedUp: false })
  // 有休: 付与 5 日（2400 分）に、SHEET の取得済み 4 日と 6 時間（4 × 480 + 3 × 120 = 2280 分）と、取得済みの 1 日分 2 件（960 分）
  // 計算の残り 2400 − 3240 = −840 → 出す残りは 0
  const p = (id: string, date: string) => ({ id, date, leaveTypeId: 'paid', amount: { unit: 'day' }, title: '' }) as const
  const paid = buildSummary({ ...SHEET, settings: { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 5, entitlementMinutes: null } } }, entries: [...SHEET.entries, p('x', '2026-11-04'), p('y', '2026-11-05')] })
  expect(paid.paid).toMatchObject({ remaining: 0, short: true })
})
