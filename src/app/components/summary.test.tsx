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
  const h = html(<BalanceCards summary={buildSummary(SHEET)} workMinutes={480} onConfirmNewYear={() => {}} />)
  expect(h).toContain('9 日と 2 時間')
  expect(h).toContain('5 日')
  expect(h).toContain('4 日と 2 時間')
  expect(h).not.toContain(T.short)
})
test('F-211・R-11: 未割り当てが負なら「不足」と絶対値', () => {
  const s = buildSummary({ ...SHEET, settings: { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 9, entitlementMinutes: null } } } })
  const h = html(<BalanceCards summary={s} workMinutes={480} onConfirmNewYear={() => {}} />)
  expect(h).toContain(T.short)
  expect(h).toContain('6 時間')
})
test('F-404: 年 5 日の取得に届いていなければ 1 行出す', () => {
  const s = buildSummary({ ...SHEET, entries: SHEET.entries.slice(0, 3) })
  expect(html(<BalanceCards summary={s} workMinutes={480} onConfirmNewYear={() => {}} />)).toContain('あと 3日')
  expect(html(<BalanceCards summary={buildSummary(SHEET)} workMinutes={480} onConfirmNewYear={() => {}} />)).not.toContain(T.fiveDaysLabel)
})
test('F-106: 付与日が無ければカードを描かない。長めの休暇の見出しに但し書き', () => {
  expect(html(<BalanceCards summary={buildSummary(UNSET)} workMinutes={480} onConfirmNewYear={() => {}} />)).toBe('')
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
  const h = html(<BalanceCards summary={s} workMinutes={465} onConfirmNewYear={() => {}} />)
  expect(h).toContain('9 日と 1 時間 45 分') // 残り 4290 分
  expect(h).toContain('4 日と 1 時間 45 分') // 未割り当て 1965 分
  expect(h).not.toContain(T.short)
})

test('F-407・§3.2: 知らせの 1 行は、年 5 日の取得の 1 行より上', () => {
  const s = buildSummary({ ...SHEET, entries: SHEET.entries.slice(0, 3), settings: { ...SHEET.settings, grantYears: { '2025-05-01': { grantDays: 14, entitlementMinutes: null } } } })
  const h = html(<BalanceCards summary={s} workMinutes={480} onConfirmNewYear={() => {}} />)
  expect(h).toContain(T.newGrantYear)
  expect(h.indexOf(T.newGrantYear)).toBeLessThan(h.indexOf(T.fiveDaysLabel))
  expect(html(<BalanceCards summary={buildSummary(SHEET)} workMinutes={480} onConfirmNewYear={() => {}} />)).not.toContain(T.newGrantYear)
})

test('§3.2: 使える期間のある休暇のカードに期間を添え、残りが 0 なら使い切り', () => {
  const summer = { id: 'summer', name: '夏季休暇', days: 1, usable: { start: '07-01', end: '09-30' }, grantDay: null, together: false } as const
  const done = { id: 's1', date: '2026-07-15', leaveTypeId: 'summer', amount: { unit: 'day' }, title: '', done: true } as const
  const input = (entries: typeof SHEET.entries) => ({ ...SHEET, settings: { ...SHEET.settings, leaveTypes: [...SHEET.settings.leaveTypes, summer] }, entries })
  const used = html(<BalanceCards summary={buildSummary(input([...SHEET.entries, done]))} workMinutes={480} onConfirmNewYear={() => {}} />)
  expect(used).toContain('7〜9月')
  expect(used).toContain(T.usedUp)
  const left = html(<BalanceCards summary={buildSummary(input(SHEET.entries))} workMinutes={480} onConfirmNewYear={() => {}} />)
  expect(left).toContain('7〜9月')
  expect(left).not.toContain(T.usedUp)
})
