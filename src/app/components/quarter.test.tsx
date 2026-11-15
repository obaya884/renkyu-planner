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
import { TogetherList } from './TogetherList'

const qs = planningQuarters('2026-11-15')
const [q4, , q2] = buildQuarterViews(SHEET, qs)
const noop = () => {}
const html = (el: React.ReactElement) => renderToStaticMarkup(el)

test('F-502・F-108: 月カレンダーは月曜始まりで、印を data-mark に持つ。設定で日曜始まりになる', () => {
  const h = html(<MonthCalendar month={q4.months[1]} />)
  expect(h.replace(/<[^>]+>/g, '')).toContain('月火水木金土日')
  const sunday = buildQuarterViews({ ...SHEET, settings: { ...SHEET.settings, weekStart: 'sunday' } }, qs)[0].months[1]
  expect(html(<MonthCalendar month={sunday} />).replace(/<[^>]+>/g, '')).toContain('日月火水木金土')
  expect(h).toContain('11月')
  expect(h).toMatch(/data-mark="done"[^>]*>2</)
  expect(h).toMatch(/data-mark="candidate"[^>]*>20</)
  expect(h).not.toContain('<button')
})
const text = (h: string) => h.replace(/<[^>]+>/g, '')
const headings = (h: string) => [...h.matchAll(/<h4[^>]*>([^<]*)<\/h4>/g)].map((m) => m[1])
/** 「〜を休む」を含む候補 1 件の行（li）の HTML */
const rowOf = (h: string, take: string) => h.split('<li').find((x) => x.includes(`>${take}<`)) ?? ''
const kindsOf = (row: string) => [...row.matchAll(/data-kind="([a-z]+)"/g)].map((m) => m[1])
const candidateList = (v: typeof q4) => html(<CandidateList groups={v.groups} monthGaps={v.monthGaps} workMinutes={480} onAdd={noop} />)

test('F-203・§3.7: 組ごとに見出しつきのカード。最良の候補は 1 件 1 行、残りはカードのいちばん下の開く行', () => {
  const h = candidateList(q4)
  // q4 の組は 12/30（12/25 を休むと 10 連休、効率 10）と 11/23（1 日で 4 連休、効率 4）。SHEET の会社の休日には名前が無い
  expect(headings(h)).toEqual(['会社の休日（12/30〜1/3）のまわり', '11/23(月) 勤労感謝の日 のまわり'])
  expect(h).toContain('>11/20(金) を休む<')
  expect(h).toContain('>11/24(火) を休む<')
  expect(h).toContain('もっと多く休む取り方（7）')
  expect(h).toContain(T.restHasLong)
  expect(h).toContain('<details')
  expect(h.indexOf('>12/25(金) を休む<')).toBeLessThan(h.indexOf('>11/20(金) を休む<')) // 効率の順
  expect(h.lastIndexOf('もっと多く休む取り方')).toBeGreaterThan(h.indexOf('>11/24(火) を休む<')) // カードのいちばん下
})
test('§3.7・F-204: 上の行の右に連休の日数。5 連休以上は長めの色の文字で、「長め」の札は付けない', () => {
  const h = candidateList(q4)
  expect(rowOf(h, '11/20(金) を休む')).toMatch(/<b[^>]*>4連休<\/b>/)
  expect(rowOf(h, '11/20(金) を休む')).not.toContain('text-long-ink')
  expect(rowOf(h, '12/25(金) を休む')).toMatch(/<b[^>]*text-long-ink[^>]*>10連休<\/b>/)
  expect(text(h)).not.toMatch(new RegExp(`${T.long}(?!あり)`))
})
test('§3.7・F-202: 日の並び。休む日、土日・祝日、会社の休日、予定を data-kind に持ち、期間の文字は出さない', () => {
  const h = candidateList(q4)
  // 11/20(金) 休む日、11/21(土)・11/22(日) 土日、11/23(月) 勤労感謝の日
  const nov = rowOf(h, '11/20(金) を休む')
  expect(kindsOf(nov)).toEqual(['take', 'off', 'off', 'off'])
  expect(nov).toContain('data-strip="normal"')
  expect(nov).toContain('w-[min(26px,') // 9 日以下も 26px を上限に行の幅に合わせて縮める
  // 12/25(金) 休む日、12/26・12/27 土日、12/28・12/29 予定、12/30〜1/3 会社の休日。10 日なので小さいマス
  const dec = rowOf(h, '12/25(金) を休む')
  expect(kindsOf(dec)).toEqual(['take', 'off', 'off', 'planned', 'planned', 'company', 'company', 'company', 'company', 'company'])
  expect(dec).toContain('data-strip="small"')
  expect(dec).toContain('--days:10')
  expect(text(nov)).toContain('金20土21日22月23')
  expect(text(h)).not.toContain('11/20〜11/23')
})
test('§3.7・F-212: まとめて取る休暇の日の並びは、行の連休の日', () => {
  const h = html(<TogetherList blocks={f4.together} onAdd={noop} />)
  // 12/19(土)〜1/3 の 16 日。休む日 5、土日 4、予定 2（12/28・12/29）、会社の休日 5（12/30〜1/3）
  const kinds = kindsOf(rowOf(h, '12/21(月)〜12/25(金) を休む'))
  expect(kinds).toHaveLength(16)
  expect(kinds.filter((k) => k === 'take')).toHaveLength(5)
  expect(kinds.filter((k) => k === 'off')).toHaveLength(4)
  expect(kinds.filter((k) => k === 'planned')).toHaveLength(2)
  expect(kinds.filter((k) => k === 'company')).toHaveLength(5)
})
test('§3.7: 日の並びは 1 つにまとめて読ませ、「入れる」はどの候補かを読ませる', () => {
  const nov = rowOf(candidateList(q4), '11/20(金) を休む')
  expect(nov).toContain('role="img" aria-label="11/20〜11/23 の 4連休。休む日は 11/20(金)"')
  expect(nov).toMatch(/aria-hidden="true"[^>]*data-strip/)
  expect(nov).toContain('aria-label="11/20(金) を休む 4連休 を日程に入れる"')
  expect(nov).toContain(`>${T.insert}</button>`)
  const free = rowOf(html(<TogetherList blocks={f4.together} onAdd={noop} />), '12/21(月)〜12/25(金) を休む')
  expect(free).toContain('aria-label="12/19〜1/3 の 16連休。休む日は 12/21(月)〜12/25(金)"')
  expect(free).toContain('aria-label="12/21(月)〜12/25(金) を休む 16連休 を日程に入れる"')
})
test('F-205・§3.7: 祝日のない月は、組のカードの下に「祝日のない月」のカード 1 枚。月ごとの開く行', () => {
  const [u4] = buildQuarterViews(UNSET, qs)
  const h = candidateList(u4)
  // UNSET の q4 の組は 11/23 と 1/1（12/31 を休む候補の四半期に置く。R-6）。12 月は祝日も会社の休日も無い（R-8）
  expect(headings(h)).toEqual(['11/23(月) 勤労感謝の日 のまわり', '1/1(金) 元日 のまわり', T.noHolidayMonths])
  expect(h).toContain('12月 金曜か月曜を休むと 3連休（8）')
  expect(h).toContain('>12/4(金) を休む<')
  // 12/4(金) を休むと 12/4〜12/6 の 3 連休（12/5・12/6 は土日）
  expect(rowOf(h, '12/4(金) を休む')).toMatch(/<b[^>]*>3連休<\/b>/)
  expect(h.indexOf('12月 金曜か月曜を休むと')).toBeLessThan(h.indexOf('>12/4(金) を休む<')) // 開く行の中
})
test('F-209・F-211・§3.7: 補足は並びの下。次の付与年から引く・足りない', () => {
  expect(candidateList(q2)).toContain(T.nextGrantYear)
  const tight = { ...SHEET, settings: { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 10, entitlementMinutes: null } } } }
  const [t4] = buildQuarterViews(tight, qs)
  const nov = rowOf(candidateList(t4), '11/20(金) を休む')
  expect(nov).toContain('有休が 6 時間足りません')
  expect(nov.indexOf('有休が 6 時間足りません')).toBeGreaterThan(nov.indexOf('data-strip'))
})
test('F-304・F-305・R-17: 日程の行。連休の見出し、取得済み・予定、重なり', () => {
  const h = html(<EntryList blocks={q4.entries} workMinutes={480} onOpen={noop} onAddDay={noop} />)
  expect(h.split('12/26〜1/3 の 9連休')).toHaveLength(2) // §3.8: 見出しだけ。各行の 2 行目には出さない
  expect(h).toContain('12/26〜1/3 の 9連休')
  expect(h).toContain('12/28(月)')
  expect(h).toContain('年末年始')
  expect(h).toContain('10/31〜11/3 の 4連休')
  const entries = [...SHEET.entries, { id: 'x', date: '2026-11-13', leaveTypeId: 'paid', amount: { unit: 'half' }, title: '通院' } as const, { id: 'y', date: '2026-11-23', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '' } as const]
  const [v] = buildQuarterViews({ ...SHEET, entries }, qs)
  const h2 = html(<EntryList blocks={v.entries} workMinutes={480} onOpen={noop} onAddDay={noop} />)
  // §3.8: 過ぎた日（11/13）の行は、警告もボタンも無い、ふつうの取得済みの行。11/23 は予定
  const row = (day: string) => h2.slice(h2.indexOf(day), h2.indexOf('</li>', h2.indexOf(day)))
  expect(row('11/13(金)')).toContain(T.done)
  expect(row('11/13(金)')).not.toContain('text-warn-ink')
  expect(row('11/13(金)')).toContain('›')
  expect(row('11/23(月)')).toContain(T.planned)
  expect(h2).not.toContain('日付を過ぎています')
  expect(h2).not.toContain('取得済みにする')
  expect(h2).toContain(T.overlap)
})
test('F-403・F-508: 節の見出しと長めの休暇。過ぎた四半期は候補の欄を描かない', () => {
  const props = { workMinutes: 480, onAdd: noop, onAddTogether: noop, onOpen: noop, onAddDay: noop, onEnterGrant: noop }
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
  const props = { workMinutes: 480, onAdd: noop, onAddTogether: noop, onOpen: noop, onAddDay: noop, onEnterGrant: noop }
  expect(html(<QuarterSection view={q2} {...props} />)).toContain(T.enterGrant)
  const entered = { ...SHEET, settings: { ...SHEET.settings, grantYears: { ...SHEET.settings.grantYears, '2027-05-01': { grantDays: 16, entitlementMinutes: null } } } }
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
  const s = buildSummary({ ...SHEET, settings: { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 9, entitlementMinutes: null } } } })
  expect(html(<StickySummary summary={s} workMinutes={480} />)).toContain('text-warn-ink')
  expect(html(<StickySummary summary={buildSummary(SHEET)} workMinutes={480} />)).not.toContain('text-warn-ink')
})
test('F-401: 持ち分の 1 行は有休だけ。不足なら不足と出す。設定なしは出さない', () => {
  expect(html(<StickySummary summary={buildSummary(SHEET)} workMinutes={480} />)).toContain('有休 残り 9 日と 2 時間・未割り当て 4 日と 2 時間')
  const s = buildSummary({ ...SHEET, settings: { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 9, entitlementMinutes: null } } } })
  expect(html(<StickySummary summary={s} workMinutes={480} />)).toContain('不足 6 時間')
  expect(html(<StickySummary summary={buildSummary(UNSET)} workMinutes={480} />)).toBe('')
})
test('§3.4・§4・F-401: 持ち分の 1 行は PC でも隠さず、流れの外（fixed）に置く。節の見出しは、1 行が出ているあいだその下に張り付く', () => {
  const line = html(<StickySummary summary={buildSummary(SHEET)} workMinutes={480} />)
  expect(line).not.toContain('lg:hidden')
  expect(line).toContain('fixed')
  expect(line).toContain('h-7')
  const props = { workMinutes: 480, onAdd: noop, onAddTogether: noop, onOpen: noop, onAddDay: noop, onEnterGrant: noop }
  expect(html(<QuarterSection view={q4} {...props} belowSummary />)).toContain('lg:top-7')
  const top = html(<QuarterSection view={q4} {...props} belowSummary={false} />)
  expect(top).toContain('lg:top-0')
  expect(top).not.toContain('lg:top-7')
})

const freeType = { id: 'free', name: 'フリーバカンス', days: 5, usable: null, grantDay: '01-01', together: true } as const
const withFree = { ...SHEET, settings: { ...SHEET.settings, leaveTypes: [...SHEET.settings.leaveTypes, freeType] } }
const [f4, f1] = buildQuarterViews(withFree, qs)

test('F-212・§3.7: まとめて取る休暇の組。見出しつきのカード、先頭の 1 件、残りの開く行', () => {
  const h = html(<TogetherList blocks={f4.together} onAdd={noop} />)
  expect(headings(h)).toEqual(['フリーバカンス（5日）をまとめて取る'])
  expect(rowOf(h, '12/21(月)〜12/25(金) を休む')).toMatch(/<b[^>]*text-long-ink[^>]*>16連休<\/b>/)
  expect(text(h)).not.toContain('12/19〜1/3')
  expect(h).toContain('ほかの取り方（4）')
  expect(h).toContain('<details')
  expect(h).not.toContain(T.nextGrantYear)
  expect(h.indexOf('12/21(月)〜12/25(金)')).toBeLessThan(h.indexOf('ほかの取り方（4）'))
  expect(h.indexOf('ほかの取り方（4）')).toBeLessThan(h.indexOf('>11/16(月)〜11/20(金) を休む<'))
  expect(rowOf(h, '11/16(月)〜11/20(金) を休む')).toMatch(/>10連休<\/b>/)
  const n = html(<TogetherList blocks={f1.together} onAdd={noop} />)
  const jan = rowOf(n, '1/4(月)〜1/8(金) を休む')
  expect(jan).toMatch(/>17連休<\/b>/)
  expect(text(jan)).toContain(T.nextGrantYear)
})
test('§3.7: まとめて取る休暇の組は、ふつうの候補と祝日のない月の候補の下。種類が無ければ出さない', () => {
  const props = { workMinutes: 480, onAdd: noop, onAddTogether: noop, onOpen: noop, onAddDay: noop, onEnterGrant: noop }
  const h = html(<QuarterSection view={f4} {...props} />)
  const heading = h.indexOf('フリーバカンス（5日）をまとめて取る')
  expect(heading).toBeGreaterThan(h.indexOf('>11/20(金) を休む<'))
  expect(heading).toBeGreaterThan(h.lastIndexOf('もっと多く休む取り方'))
  // 祝日のない月の候補は CandidateList の中の最後に出るので、組はその下になる（この fixture の 12 月には 1 日分の日程があり、祝日のない月の行は出ない）
  expect(html(<QuarterSection view={q4} {...props} />)).not.toContain('をまとめて取る')
})
test('§3.7: 候補の見出しのすぐ下に凡例。候補が無い四半期には出さない', () => {
  const props = { workMinutes: 480, onAdd: noop, onAddTogether: noop, onOpen: noop, onAddDay: noop, onEnterGrant: noop }
  const h = html(<QuarterSection view={q4} {...props} />)
  const legend = h.indexOf('data-legend="candidates"')
  expect(legend).toBeGreaterThan(h.indexOf(`>${T.candidates}</h3>`))
  expect(legend).toBeLessThan(h.indexOf('<h4'))
  expect(text(h.slice(h.indexOf('>', legend) + 1, h.indexOf('<h4')))).toBe(`${T.restDays}${T.legendOff}${T.legendCompany}`)
  const none = html(<QuarterSection view={{ ...q4, groups: [], monthGaps: [], together: [], noCandidates: true }} {...props} />)
  expect(none).toContain(T.noCandidates)
  expect(none).not.toContain('data-legend="candidates"')
})
