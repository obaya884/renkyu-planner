import { expect, test } from 'vitest'
import { SHEET, UNSET } from './fixture'
import { buildSummary } from './summary'

test('F-401: 有休のカード。残り 9 日と 2 時間、予定 5 日、未割り当て 4 日と 2 時間', () => {
  const s = buildSummary(SHEET)
  expect(s.state).toBe('set')
  expect(s.cards).toEqual([{ leaveTypeId: 'paid', name: '有休', remaining: 9 * 480 + 120, planned: 5 * 480, unassigned: 4 * 480 + 120, short: false, usable: null }])
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
  expect(s.holidaysOnly).toBe(false)
})
test('F-106: 付与日が無ければカードを出さない。会社の休日も日程も無ければ「土日と祝日だけ」', () => {
  const s = buildSummary(UNSET)
  expect(s).toMatchObject({ state: 'unset', cards: [], fiveDays: null, holidaysOnly: true })
  expect(s.longBreaks.map((c) => c.has)).toEqual([false, false, true, false]) // 2027 年の 5/1〜5/5
})
test('F-211: 持ち分を超えると short', () => {
  const s = buildSummary({ ...SHEET, settings: { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 9, carryOverMinutes: 0 } } } })
  expect(s.cards[0]).toMatchObject({ unassigned: -360, short: true })
})
