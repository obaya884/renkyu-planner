import { expect, test } from 'vitest'
import { icsFileName, recordFileName } from './fileName'

test('D-11・E-5: 書き出すファイルの名前は、今日の日付を入れる', () => {
  expect(recordFileName('2026-11-15')).toBe('renkyu-planner-2026-11-15.json')
  expect(icsFileName('2026-11-15')).toBe('renkyu-planner-2026-11-15.ics')
})
