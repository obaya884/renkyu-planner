import { expect, test } from 'vitest'
import { calendarEventTitle } from '@/app/texts'
import { SHEET } from '@/domain/view/fixture'
import { calendarEventOf, calendarEventsOf } from './calendarEvents'

const base = { id: 'x', date: '2026-12-28', leaveTypeId: 'paid', title: '', done: false } as const
test('F-506・§6: 予定の題', () => {
  expect(calendarEventTitle({ ...base, title: '年末年始', amount: { unit: 'day' } }, '有休', 480)).toBe('年末年始')
  expect(calendarEventTitle({ ...base, title: '  ', amount: { unit: 'day' } }, '有休', 480)).toBe('有休')
  expect(calendarEventTitle({ ...base, amount: { unit: 'half' } }, '有休', 480)).toBe('有休（半日）')
  expect(calendarEventTitle({ ...base, amount: { unit: 'minutes', minutes: 120 } }, '有休', 480)).toBe('有休（2 時間）')
})
test('F-506・E-1・E-3: 記録から予定を作る', () => {
  expect(calendarEventsOf(SHEET.entries, SHEET.settings, '2026-11-15').slice(0, 3)).toEqual([
    { uid: '2026-12-28@renkyu-planner', date: '2026-12-28', summary: '年末年始' },
    { uid: '2026-12-29@renkyu-planner', date: '2026-12-29', summary: '年末年始' },
    { uid: '2027-02-12@renkyu-planner', date: '2027-02-12', summary: '有休' },
  ])
  expect(calendarEventOf(SHEET.entries.find((e) => e.date === '2026-12-28')!, SHEET.settings)).toEqual({ uid: '2026-12-28@renkyu-planner', date: '2026-12-28', summary: '年末年始' })
})
test('F-506・E-1: これからの予定が無ければ 0 件', () => {
  expect(calendarEventsOf(SHEET.entries, SHEET.settings, '2027-05-01')).toEqual([])
})
