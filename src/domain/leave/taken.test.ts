import { expect, test } from 'vitest'
import { isTaken } from './taken'

test('F-305・R-13: 日付が今日以前なら取得済み、今日より後なら予定', () => {
  expect(isTaken({ date: '2026-11-14' }, '2026-11-15')).toBe(true)
  expect(isTaken({ date: '2026-11-15' }, '2026-11-15')).toBe(true) // 今日の日程は取得済み
  expect(isTaken({ date: '2026-11-16' }, '2026-11-15')).toBe(false)
})
test('F-305: 日付が変わると、同じ日程が予定から取得済みになる', () => {
  expect([isTaken({ date: '2026-11-16' }, '2026-11-15'), isTaken({ date: '2026-11-16' }, '2026-11-16')]).toEqual([false, true])
})
