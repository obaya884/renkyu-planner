import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { T } from '@/app/texts'
import { buildGrantSection } from '@/domain/view/settingsView'
import { SHEET } from '@/domain/view/fixture'
import { GrantSection } from './GrantSection'
import { Header } from './Header'
import { HolidayAbout } from './HolidayAbout'
import { HolidayNote } from './StaticCandidates'
import { WeekStartRow } from './WeekStartRow'
import { WorkMinutesRow } from './WorkMinutesRow'

const html = (el: React.ReactElement) => renderToStaticMarkup(el)

test('F-504: ヘッダーの「設定」は /settings へ', () => {
  expect(html(<Header />)).toMatch(/<a[^>]*href="\/settings"[^>]*>設定</)
})
test('F-605・§3.10: 祝日の 1 行の「くわしく」は、設定画面の「祝日について」へ', () => {
  const h = html(<HolidayNote confirmedUntil="2027-12-31" />)
  expect(h).toContain('祝日は内閣府の公表データです。2027年12月31日まで確定。')
  expect(h).toMatch(/<a[^>]*href="\/settings#holidays"[^>]*>くわしく</)
})
test('F-605・§6: 「祝日について」の節。最終更新は updatedAt', () => {
  const h = html(<HolidayAbout confirmedUntil="2027-12-31" updatedAt="2026-11-15" />)
  expect(h).toContain('id="holidays"')
  expect(h).toContain(T.aboutHolidays)
  expect(h).toContain('祝日は内閣府の公表データです。2027年12月31日まで確定しています。それより先は未確定で、候補が変わることがあります。祝日データの最終更新: 2026年11月15日')
})

test('F-102: 所定労働時間の行は時間と分の欄', () => {
  const h = html(<WorkMinutesRow workMinutes={465} onChange={() => {}} />)
  expect(h).toContain('value="7"')
  expect(h).toContain('value="45"')
})
test('F-108: 週の始まりの行。選んでいる方に印', () => {
  const h = html(<WeekStartRow weekStart="sunday" onChange={() => {}} />)
  const input = (v: string) => h.match(new RegExp(`<input[^>]*value="${v}"[^>]*>`))?.[0] ?? ''
  expect(input('sunday')).toContain('checked')
  expect(input('monday')).not.toContain('checked')
})

test('§6: 付与年の行の文', () => {
  const h = html(<GrantSection view={buildGrantSection(SHEET)} workMinutes={480} onOpen={() => {}} onFirst={() => {}} />)
  expect(h).toContain('5月1日')
  expect(h).toContain('2026/5/1〜2027/4/30')
  expect(h).toContain('付与 14日・使える日数 14 日')
  expect(h).toContain('2027/5/1〜2028/4/30')
  expect(h).toContain('日数を入れる（いまは 14日で計算）')
  expect(h).not.toContain(T.viewPastGrantYears)
  expect(html(<GrantSection view={null} workMinutes={480} onOpen={() => {}} onFirst={() => {}} />)).toContain(T.grantDayUnset)
})
test('F-405・§6: 過ぎた付与年は <details> に入り、押せない', () => {
  const settings = { ...SHEET.settings, grantYears: { '2025-05-01': { grantDays: 12, entitlementMinutes: null }, '2026-05-01': { grantDays: 14, entitlementMinutes: null } } }
  const h = html(<GrantSection view={buildGrantSection({ ...SHEET, settings })} workMinutes={480} onOpen={() => {}} onFirst={() => {}} />)
  expect(h).toMatch(/<details>.*過ぎた付与年を見る.*2025\/5\/1〜2026\/4\/30.*付与 12日・使える日数 12 日.*<\/details>/)
  expect(h.match(/<button/g)).toHaveLength(2)
})
