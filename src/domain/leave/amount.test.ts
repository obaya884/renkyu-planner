import { expect, test } from 'vitest'
import { formatMinutes, isShort, toMinutes } from './amount'

test('R-11: 量を分に直す', () => {
  expect(toMinutes({ unit: 'day' }, 480)).toBe(480)
  expect(toMinutes({ unit: 'half' }, 465)).toBe(232.5)
  expect(toMinutes({ unit: 'minutes', minutes: 120 }, 480)).toBe(120)
})
test('F-401・R-11: 日と時間で出し、小数にしない', () => {
  expect(formatMinutes(9 * 480 + 120, 480)).toBe('9 日と 2 時間')
  expect(formatMinutes(3 * 480, 480)).toBe('3 日')
  expect(formatMinutes(150, 480)).toBe('2 時間 30 分')
  expect(formatMinutes(0, 480)).toBe('0 日')
  expect(formatMinutes(465 + 232.5, 465)).toBe('1 日と 3 時間 52 分')
  expect(formatMinutes(-600, 480)).toBe('1 日と 2 時間')
})
test('R-11: 1 時間に満たない量は分だけで出す', () => {
  expect(formatMinutes(45, 480)).toBe('45 分')
})
test('§3.2・F-211: 不足は 1 分以上足りないとき。0.5 分の端数は不足にしない', () => {
  expect(isShort(-1)).toBe(true)
  expect(isShort(-480)).toBe(true)
  expect(isShort(-0.5)).toBe(false)
  expect(isShort(0)).toBe(false)
  expect(isShort(120)).toBe(false)
})
