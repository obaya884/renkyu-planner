import { expect, test } from 'vitest'
import { SHEET } from './fixture'
import { previewRange } from './rangePreview'

test('F-307・F-306・§5.2: 全部を足したあとの未割り当てと連休。日程がある日を含めば知らせる', () => {
  const p = previewRange(SHEET, '2026-12-28', '2027-01-04', 'paid')
  expect(p.days).toEqual(['2026-12-28', '2026-12-29', '2027-01-04'])
  expect(p.overOneDay).toBe(true) // 12/28・12/29 にはすでに 1 日分の予定がある
  expect(p.run).toEqual({ start: '2026-12-26', end: '2027-01-04', days: 10 })
  expect(p.deltas).toEqual([{ grantYearStart: '2026-05-01', before: 2040, after: 600, current: true }]) // 3 日 = 1440 分
  const q = previewRange(SHEET, '2026-11-19', '2026-11-24', 'paid')
  expect(q).toMatchObject({ overOneDay: false, run: { start: '2026-11-19', end: '2026-11-24', days: 6 } })
  expect(previewRange(SHEET, '2026-12-30', '2027-01-03', 'paid')).toEqual({ days: [], errors: ['noDays'], overOneDay: false, run: null, deltas: [] })
})
