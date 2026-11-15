import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { T } from '@/app/texts'
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
