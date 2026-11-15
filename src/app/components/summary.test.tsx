import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { SHEET, UNSET } from '@/domain/view/fixture'
import { buildSummary } from '@/domain/view/summary'
import { T } from '@/app/texts'
import { BalanceCards } from './BalanceCards'
import { LongBreakStrip } from './LongBreakStrip'
import { Notices } from './Notices'
import { StickySummary } from './StickySummary'

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
test('§3.3: 長めの休暇の札は、4 つを同じ幅で 1 列に並べ、月とあり・まだを分けて持つ', () => {
  const h = html(<LongBreakStrip summary={buildSummary(SHEET)} />)
  expect(h).toMatch(/<ul[^>]*grid-cols-4/)
  expect(h).not.toMatch(/[\s"]flex-wrap/) // 折り返すのは PC（lg:）だけ
  expect(h.match(/<li/g)).toHaveLength(4)
  expect(h).toMatch(/<li[^>]*><span[^>]*>10〜12月<\/span>\s*<span[^>]*>(あり|まだ)<\/span><\/li>/)
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

const extra = (id: string, name: string, days: number, usable: { start: string; end: string } | null = null) =>
  ({ id, name, days, usable, grantDay: null, together: false }) as const
const withTypes = (types: ReturnType<typeof extra>[], entries: typeof SHEET.entries = SHEET.entries) => ({
  ...SHEET,
  settings: { ...SHEET.settings, leaveTypes: [...SHEET.settings.leaveTypes, ...types] },
  entries,
})
const cardsHtml = (input: typeof SHEET) => html(<BalanceCards summary={buildSummary(input)} workMinutes={480} onConfirmNewYear={() => {}} />)
/** カードの要素を、<div の入れ子を数えて閉じタグまで切り出す */
const paidCard = (h: string) => {
  const start = h.indexOf('<div data-testid="paid-card"')
  let depth = 0
  for (const m of h.slice(start).matchAll(/<div\b|<\/div>/g)) {
    depth += m[0] === '</div>' ? -1 : 1
    if (depth === 0) return h.slice(start, start + m.index + m[0].length)
  }
  throw new Error('カードが閉じていない')
}

test('§3.2: 有休だけなら、カードは 1 枚で足した休暇の行は出ない', () => {
  const h = cardsHtml(SHEET)
  expect(h.match(/data-testid="paid-card"/g)).toHaveLength(1)
  expect(h).not.toContain('<li')
})

test('§3.2・F-401: 足した休暇が 3 種類なら、3 行が縦に並び、カードは 1 枚だけで横スクロールしない', () => {
  const h = cardsHtml(withTypes([extra('a', '休暇あ', 5), extra('b', '休暇い', 5), extra('c', '休暇う', 5)]))
  expect(h.match(/data-testid="paid-card"/g)).toHaveLength(1)
  expect(h.match(/<li/g)).toHaveLength(3)
  expect(h).not.toContain('overflow-x-auto')
  expect(h.indexOf('休暇あ')).toBeLessThan(h.indexOf('休暇い'))
  expect(h.indexOf('休暇い')).toBeLessThan(h.indexOf('休暇う'))
  expect(h).toContain('休暇あ　残り 5 日・未割り当て 5 日')
})

test('§3.2・F-404・F-407: 年 5 日の行と新しい付与年の知らせは、有休のカードの要素の中。足した休暇の行はカードの外', () => {
  const s = withTypes([extra('a', '休暇あ', 5)], SHEET.entries.slice(0, 3))
  const h = cardsHtml({ ...s, settings: { ...s.settings, grantYears: { '2025-05-01': { grantDays: 14, entitlementMinutes: null } } } })
  const card = paidCard(h)
  expect(card).toContain(T.newGrantYear)
  expect(card).toContain(T.fiveDaysLabel)
  expect(card.indexOf(T.newGrantYear)).toBeLessThan(card.indexOf(T.fiveDaysLabel))
  expect(card).not.toContain('休暇あ')
  expect(h.indexOf('休暇あ')).toBeGreaterThan(h.indexOf(T.fiveDaysLabel))
})

test('§3.2・F-211: 足した休暇の未割り当てが負なら「不足」と警告の色', () => {
  const plan = { id: 'p1', date: '2026-07-15', leaveTypeId: 'a', amount: { unit: 'day' }, title: '', done: false } as const
  const plan2 = { ...plan, id: 'p2', date: '2026-07-16' } as const
  const h = cardsHtml(withTypes([extra('a', '休暇あ', 1)], [...SHEET.entries, plan, plan2]))
  const li = h.slice(h.indexOf('<li'), h.indexOf('</li>'))
  expect(li).toContain(`${T.short} 1 日`)
  expect(li).toContain('text-warn-ink')
  expect(li).not.toContain(T.unassigned)
})

test('§3.2: 足した休暇に使える期間があれば行の終わりに添え、残りが 0 なら残りと未割り当ての代わりに使い切り', () => {
  const done = { id: 's1', date: '2026-07-15', leaveTypeId: 'summer', amount: { unit: 'day' }, title: '', done: true } as const
  const summer = extra('summer', '夏季休暇', 1, { start: '07-01', end: '09-30' })
  const left = cardsHtml(withTypes([summer]))
  expect(left).toContain('夏季休暇　残り 1 日・未割り当て 1 日')
  expect(left).toContain('7〜9月')
  const used = cardsHtml(withTypes([summer], [...SHEET.entries, done]))
  const li = used.slice(used.indexOf('<li'), used.indexOf('</li>'))
  expect(li).toContain(`夏季休暇　${T.usedUp}`)
  expect(li).not.toContain(T.remaining)
  expect(li).not.toContain(T.unassigned)
  expect(li.indexOf('7〜9月')).toBeGreaterThan(li.indexOf(T.usedUp))
})

test('§3.2・F-211: 使い切りと不足が重なるときは、不足を優先して出す', () => {
  const plan = { id: 'p1', date: '2026-07-15', leaveTypeId: 'summer', amount: { unit: 'day' }, title: '', done: true } as const
  const plan2 = { ...plan, id: 'p2', date: '2026-07-16' } as const
  const h = cardsHtml(withTypes([extra('summer', '夏季休暇', 1, { start: '07-01', end: '09-30' })], [...SHEET.entries, plan, plan2]))
  const li = h.slice(h.indexOf('<li'), h.indexOf('</li>'))
  expect(li).toContain(`${T.short} 1 日`)
  expect(li).toContain('text-warn-ink')
  expect(li).not.toContain(T.usedUp)
})

test('§3.2・I-2: 残りが負のときは、足した休暇の 1 行も、有休のカードも、上に張り付く 1 行も「残り 0 日」と出す', () => {
  // 夏季休暇 1 日に取得済み 2 件: 計算の残り −1 日 → 「残り 0 日」。不足 1 日は未割り当ての側に出る
  const done = (id: string, date: string, leaveTypeId: string) => ({ id, date, leaveTypeId, amount: { unit: 'day' }, title: '', done: true }) as const
  const h = cardsHtml(withTypes([extra('summer', '夏季休暇', 1)], [...SHEET.entries, done('a', '2026-07-15', 'summer'), done('b', '2026-07-16', 'summer')]))
  const li = h.slice(h.indexOf('<li'), h.indexOf('</li>'))
  expect(li).toContain(`夏季休暇　${T.remaining} 0 日・${T.short} 1 日`)
  // 有休 付与 5 日 = 2400 分、取得済み 2280 + 960 = 3240 分 → 計算の残り −840 分 → 「0 日」
  const over = { ...SHEET, settings: { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 5, entitlementMinutes: null } } }, entries: [...SHEET.entries, done('x', '2026-11-04', 'paid'), done('y', '2026-11-05', 'paid')] }
  const card = paidCard(cardsHtml(over))
  expect(card).toContain('<div class="text-xl font-bold">0 日</div>')
  expect(html(<StickySummary summary={buildSummary(over)} workMinutes={480} />)).toContain(`有休 ${T.remaining} 0 日・${T.short}`)
})
