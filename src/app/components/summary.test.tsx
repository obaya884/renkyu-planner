import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { SHEET, UNSET } from '@/domain/view/fixture'
import { buildSummary } from '@/domain/view/summary'
import { T } from '@/app/texts'
import { BalanceCards } from './BalanceCards'
import { LongBreakStrip } from './LongBreakStrip'
import { Notices } from './Notices'

const html = (el: React.ReactElement) => renderToStaticMarkup(el)

test('F-401: 持ち分のカードに、残り・予定・未割り当てが出る', () => {
  const h = html(<BalanceCards summary={buildSummary(SHEET)} workMinutes={480} />)
  expect(h).toContain('9 日と 2 時間')
  expect(h).toContain('5 日')
  expect(h).toContain('4 日と 2 時間')
  expect(h).not.toContain(T.short)
})
test('F-211・R-11: 未割り当てが負なら「不足」と絶対値', () => {
  const s = buildSummary({ ...SHEET, settings: { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 9, entitlementMinutes: null } } } })
  const h = html(<BalanceCards summary={s} workMinutes={480} />)
  expect(h).toContain(T.short)
  expect(h).toContain('6 時間')
})
test('F-404: 年 5 日の取得に届いていなければ 1 行出す', () => {
  const s = buildSummary({ ...SHEET, entries: SHEET.entries.slice(0, 3) })
  expect(html(<BalanceCards summary={s} workMinutes={480} />)).toContain('あと 3日')
  expect(html(<BalanceCards summary={buildSummary(SHEET)} workMinutes={480} />)).not.toContain(T.fiveDaysLabel)
})
test('F-106: 付与日が無ければカードを描かない。長めの休暇の見出しに但し書き', () => {
  expect(html(<BalanceCards summary={buildSummary(UNSET)} workMinutes={480} />)).toBe('')
  expect(html(<LongBreakStrip summary={buildSummary(UNSET)} />)).toContain(T.longBreakHolidaysOnly)
  expect(html(<LongBreakStrip summary={buildSummary(SHEET)} />)).not.toContain(T.longBreakHolidaysOnly)
})
test('F-403: 4 つの四半期の あり・まだ', () => {
  const h = html(<LongBreakStrip summary={buildSummary(SHEET)} />)
  expect(h.match(new RegExp(T.has, 'g'))).toHaveLength(2)
  expect(h.match(new RegExp(T.notYet, 'g'))).toHaveLength(2)
  expect(h).toContain('10〜12月')
})
test('N-08・D-5: 保存できない・読めなかったときの 1 行', () => {
  expect(html(<Notices canSave={false} unreadable={false} />)).toContain(T.cannotSave)
  expect(html(<Notices canSave unreadable />)).toContain(T.unreadable)
  expect(html(<Notices canSave unreadable={false} />)).toBe('')
})

test('F-102・R-11: 所定労働時間が 7 時間 45 分なら、持ち分も 465 分を 1 日として出す', () => {
  const s = buildSummary({ ...SHEET, settings: { ...SHEET.settings, workMinutes: 465 } })
  const h = html(<BalanceCards summary={s} workMinutes={465} />)
  expect(h).toContain('9 日と 1 時間 45 分') // 残り 4290 分
  expect(h).toContain('4 日と 1 時間 45 分') // 未割り当て 1965 分
  expect(h).not.toContain(T.short)
})
