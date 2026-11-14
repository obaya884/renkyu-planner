import { expect, test } from 'vitest'
import { SHEET } from '@/domain/view/fixture'
import { planningQuarters } from '@/domain/quarters/quarters'
import { defaultDayFor } from './defaultDay'

const [q4, q1] = planningQuarters('2026-11-15')
const past = planningQuarters('2026-11-15', -1)[0]

test('F-302: 日を足す日付の初期値。今の四半期は、今日以降で最も早い平日', () => {
  // 11/15 は日曜。16 日（月）が最初の平日
  expect(defaultDayFor(SHEET, q4)).toBe('2026-11-16')
})
test('F-302: 先の四半期は、初日以降の最初の平日。祝日と会社の休日は飛ばす', () => {
  // 1/1 は祝日、1/2・1/3 は会社の休日と週末。1/4（月）が最初の平日
  expect(defaultDayFor(SHEET, q1)).toBe('2027-01-04')
})
test('F-302: 過ぎた四半期は、その四半期の最後の平日', () => {
  // 7〜9月の最後の平日。9/30(水)
  expect(defaultDayFor(SHEET, past)).toBe('2026-09-30')
})
