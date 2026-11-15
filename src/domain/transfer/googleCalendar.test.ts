import { expect, test } from 'vitest'
import { googleCalendarUrl } from './googleCalendar'

test('F-506: Google カレンダーの予定作成の URL。終日で、終わりの日は翌日', () => {
  expect(googleCalendarUrl({ date: '2026-12-28', summary: '年末年始' })).toBe(
    'https://calendar.google.com/calendar/render?action=TEMPLATE&text=%E5%B9%B4%E6%9C%AB%E5%B9%B4%E5%A7%8B&dates=20261228/20261229',
  )
  expect(googleCalendarUrl({ date: '2026-12-31', summary: 'x' })).toContain('&dates=20261231/20270101')
})
test('N-05・悪意のある題: & # 改行 + を入れても、行き先とパラメータの区切りが変わらない', () => {
  const summary = 'A&B#C\nD+E'
  const url = googleCalendarUrl({ date: '2026-12-28', summary })
  expect(url).toBe('https://calendar.google.com/calendar/render?action=TEMPLATE&text=A%26B%23C%0AD%2BE&dates=20261228/20261229')
  const u = new URL(url)
  expect([u.origin, u.pathname, u.hash]).toEqual(['https://calendar.google.com', '/calendar/render', ''])
  expect([...u.searchParams.keys()]).toEqual(['action', 'text', 'dates'])
  expect(u.searchParams.get('text')).toBe(summary)
  expect(u.searchParams.get('dates')).toBe('20261228/20261229')
})
test('N-05・悪意のある題: ? % javascript: //evil.example を入れても、行き先のホストとパスが変わらない', () => {
  for (const summary of ['?a=b', '100%', '%E5%', 'javascript:alert(1)', '//evil.example/x', 'https://evil.example', '?&#%\n']) {
    const u = new URL(googleCalendarUrl({ date: '2026-12-28', summary }))
    expect([u.origin, u.pathname, u.hash]).toEqual(['https://calendar.google.com', '/calendar/render', ''])
    expect([...u.searchParams.keys()]).toEqual(['action', 'text', 'dates'])
    expect(u.searchParams.get('text')).toBe(summary)
    expect(u.searchParams.get('dates')).toBe('20261228/20261229')
  }
})
test('§5.2・壊れた文字: 対になっていないサロゲートは U+FFFD に置き換え、例外を投げない', () => {
  for (const [summary, expected] of [['\ud800', '\ufffd'], ['a\udc00b', 'a\ufffdb'], ['😀\ud83d', '😀\ufffd']]) {
    const u = new URL(googleCalendarUrl({ date: '2026-12-28', summary }))
    expect([u.origin, u.pathname, u.hash]).toEqual(['https://calendar.google.com', '/calendar/render', ''])
    expect([...u.searchParams.keys()]).toEqual(['action', 'text', 'dates'])
    expect(u.searchParams.get('text')).toBe(expected)
  }
})
test('F-506・§5.1: 複数の日は最初の日から最後の日までの 1 件。終わりは最後の日の翌日（月末・年末・うるう年をまたぐ）', () => {
  expect(googleCalendarUrl({ date: '2026-12-28', lastDate: '2027-01-04', summary: 'x' })).toContain('&dates=20261228/20270105')
  expect(googleCalendarUrl({ date: '2026-11-27', lastDate: '2026-11-30', summary: 'x' })).toContain('&dates=20261127/20261201')
  expect(googleCalendarUrl({ date: '2027-12-30', lastDate: '2027-12-31', summary: 'x' })).toContain('&dates=20271230/20280101')
  expect(googleCalendarUrl({ date: '2028-02-28', lastDate: '2028-02-29', summary: 'x' })).toContain('&dates=20280228/20280301')
  expect(googleCalendarUrl({ date: '2026-12-28', lastDate: '2026-12-28', summary: 'x' })).toContain('&dates=20261228/20261229')
})
