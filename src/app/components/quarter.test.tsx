import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { planningQuarters } from '@/domain/quarters/quarters'
import { SHEET, UNSET } from '@/domain/view/fixture'
import { buildQuarterViews } from '@/domain/view/quarterView'
import { buildSummary } from '@/domain/view/summary'
import { T } from '@/app/texts'
import { CandidateList } from './CandidateList'
import { EntryList } from './EntryList'
import { MonthCalendar } from './MonthCalendar'
import { QuarterSection } from './QuarterSection'
import { QuarterTabs } from './QuarterTabs'
import { StickySummary } from './StickySummary'

const qs = planningQuarters('2026-11-15')
const [q4, , q2] = buildQuarterViews(SHEET, qs)
const noop = () => {}
const html = (el: React.ReactElement) => renderToStaticMarkup(el)

test('F-502: 月カレンダーは日曜始まりで、印を data-mark に持つ', () => {
  const h = html(<MonthCalendar month={q4.months[1]} />)
  expect(h).toContain('11月')
  expect(h).toMatch(/data-mark="done"[^>]*>2</)
  expect(h).toMatch(/data-mark="candidate"[^>]*>20</)
  expect(h).not.toContain('<button')
})
test('F-203: 最良の候補は 1 件 1 行。残りは 1 行にまとめ、長めがあれば添える', () => {
  const h = html(<CandidateList blocks={q4.candidates} workMinutes={480} onAdd={noop} />)
  expect(h).toContain('11/20(金) を休むと 4連休')
  expect(h).toContain('11/24(火) を休むと 4連休')
  expect(h).toContain('2 日以上休む取り方（7）')
  expect(h).toContain(T.restHasLong)
  expect(h).toContain('<details')
  expect(h.indexOf('12/25(金) を休むと 10連休')).toBeLessThan(h.indexOf('11/20(金) を休むと 4連休')) // 効率の順
})
test('F-205: 祝日のない月は、押して開く 1 行', () => {
  const [u4] = buildQuarterViews(UNSET, qs)
  const h = html(<CandidateList blocks={u4.candidates} workMinutes={480} onAdd={noop} />)
  expect(h).toContain('12月は祝日がありません。金曜か月曜を休むと 3連休（8）')
  expect(h).toContain('12/4(金) を休むと 3連休')
})
test('F-209・F-211: 次の付与年から引く・足りない、の添え書き', () => {
  expect(html(<CandidateList blocks={q2.candidates} workMinutes={480} onAdd={noop} />)).toContain(T.nextGrantYear)
  const tight = { ...SHEET, settings: { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 10, carryOverMinutes: 0 } } } }
  const [t4] = buildQuarterViews(tight, qs)
  expect(html(<CandidateList blocks={t4.candidates} workMinutes={480} onAdd={noop} />)).toContain('有休が 6 時間足りません')
})
test('F-304・F-305・R-17: 日程の行。連休の見出し、過ぎた予定、重なり', () => {
  const h = html(<EntryList blocks={q4.entries} workMinutes={480} onOpen={noop} onMarkDone={noop} onAddDay={noop} />)
  expect(h.split('12/26〜1/3 の 9連休')).toHaveLength(2) // §3.8: 見出しだけ。各行の 2 行目には出さない
  expect(h).toContain('12/26〜1/3 の 9連休')
  expect(h).toContain('12/28(月)')
  expect(h).toContain('年末年始')
  expect(h).toContain('10/31〜11/3 の 4連休')
  expect(h).not.toContain(T.overdue)
  const entries = [...SHEET.entries, { id: 'x', date: '2026-11-13', leaveTypeId: 'paid', amount: { unit: 'half' }, title: '通院', done: false } as const, { id: 'y', date: '2026-11-23', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false } as const]
  const [v] = buildQuarterViews({ ...SHEET, entries }, qs)
  const h2 = html(<EntryList blocks={v.entries} workMinutes={480} onOpen={noop} onMarkDone={noop} onAddDay={noop} />)
  expect(h2).toContain(T.overdue)
  expect(h2).toContain(T.markDone)
  expect(h2).toContain(T.overlap)
})
test('F-403・F-508: 節の見出しと長めの休暇。過ぎた四半期は候補の欄を描かない', () => {
  const props = { workMinutes: 480, onAdd: noop, onOpen: noop, onMarkDone: noop, onAddDay: noop, onEnterGrant: noop }
  const h = html(<QuarterSection view={q4} {...props} />)
  expect(h).toContain('2026年 10〜12月')
  expect(h).toContain('12/26〜1/3（9連休）')
  const [past] = buildQuarterViews(SHEET, planningQuarters('2026-11-15', -1))
  const hp = html(<QuarterSection view={past} {...props} />)
  expect(hp).not.toContain(T.candidates)
  expect(hp).toContain(T.addDay)
  expect(html(<QuarterSection view={q2} {...props} />)).toContain('前の年と同じ 14日で計算中')
})
test('§3.6: 付与日の 1 行。入力済みなら有休の日数を出す', () => {
  const props = { workMinutes: 480, onAdd: noop, onOpen: noop, onMarkDone: noop, onAddDay: noop, onEnterGrant: noop }
  expect(html(<QuarterSection view={q2} {...props} />)).toContain(T.enterGrant)
  const entered = { ...SHEET, settings: { ...SHEET.settings, grantYears: { ...SHEET.settings.grantYears, '2027-05-01': { grantDays: 16, carryOverMinutes: 0 } } } }
  const [, , e2] = buildQuarterViews(entered, qs)
  const h = html(<QuarterSection view={e2} {...props} />)
  expect(h).toContain('5/1 から次の付与年（有休 16日）')
  expect(h).not.toContain(T.enterGrant)
})
test('F-507・§3.4: タブ。年と月の 2 行、前・次の出し分け', () => {
  const props = { quarters: qs, selected: qs[0].start, onSelect: noop, onBack: noop, onForward: noop }
  const h = html(<QuarterTabs {...props} canGoBack={false} canGoForward={false} />)
  expect(h).toContain('2026年')
  expect(h).toContain('10〜12月')
  expect(h).toContain('aria-selected="true"')
  expect(h).not.toContain(T.back)
  expect(h).not.toContain(T.forward)
  const h2 = html(<QuarterTabs {...props} canGoBack canGoForward />)
  expect(h2).toContain(T.back)
  expect(h2).toContain(T.forward)
})
test('§3.4: 持ち分の 1 行は不足のとき警告の色', () => {
  const s = buildSummary({ ...SHEET, settings: { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 9, carryOverMinutes: 0 } } } })
  expect(html(<StickySummary summary={s} workMinutes={480} />)).toContain('text-warn-ink')
  expect(html(<StickySummary summary={buildSummary(SHEET)} workMinutes={480} />)).not.toContain('text-warn-ink')
})
test('F-401: 持ち分の 1 行は有休だけ。不足なら不足と出す。設定なしは出さない', () => {
  expect(html(<StickySummary summary={buildSummary(SHEET)} workMinutes={480} />)).toContain('有休 残り 9 日と 2 時間・未割り当て 4 日と 2 時間')
  const s = buildSummary({ ...SHEET, settings: { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 9, carryOverMinutes: 0 } } } })
  expect(html(<StickySummary summary={s} workMinutes={480} />)).toContain('不足 6 時間')
  expect(html(<StickySummary summary={buildSummary(UNSET)} workMinutes={480} />)).toBe('')
})
