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
