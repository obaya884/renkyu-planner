import { expect, test } from 'vitest'
import { SHEET } from './fixture'
import { previewRange } from './rangePreview'

test('F-307・F-306・§5.2: 全部を足したあとの未割り当てと連休。日程がある日を含めば知らせる', () => {
  const p = previewRange(SHEET, '2026-12-28', '2027-01-04', 'paid')
  expect(p.days).toEqual(['2026-12-28', '2026-12-29', '2027-01-04'])
  expect(p.overOneDay).toBe(true) // 12/28・12/29 にはすでに 1 日分の予定がある
  expect(p.run).toEqual({ start: '2026-12-26', end: '2027-01-04', days: 10 })
  expect(p.deltas).toEqual([{ grantYearStart: '2026-05-01', before: 2040, after: 600, position: 'current' }]) // 3 日 = 1440 分
  const q = previewRange(SHEET, '2026-11-19', '2026-11-24', 'paid')
  expect(q).toMatchObject({ overOneDay: false, run: { start: '2026-11-19', end: '2026-11-24', days: 6 } })
  expect(previewRange(SHEET, '2026-12-30', '2027-01-03', 'paid')).toEqual({ days: [], errors: ['noDays'], overOneDay: false, run: null, deltas: [] })
})

test('F-307・F-209・§5.1: 過ぎた付与年にかかる期間では、その付与年の行を前（previous）、今日が入る付与年の行を今（current）にする', () => {
  // 今日 2026-11-15、付与日 05-01。2026-04-27〜2026-05-08 の営業日は、4/27・4/28・4/30（4/29 は昭和の日）と、
  // 5/1・5/7・5/8（5/2〜5/6 は土日・憲法記念日の振替休日・みどりの日・こどもの日）の 6 日。
  // 2025-05-01 の付与年: 設定がいちばん古い 2026-05-01 より前なので、持ち分 0・日程なし → before 0、3 日足して after 0 − 3 × 480
  // 2026-05-01 の付与年: before 2040（SHEET の未割り当て）、3 日足して after 2040 − 3 × 480 = 600
  const p = previewRange(SHEET, '2026-04-27', '2026-05-08', 'paid')
  expect(p.days).toEqual(['2026-04-27', '2026-04-28', '2026-04-30', '2026-05-01', '2026-05-07', '2026-05-08'])
  expect(p.deltas).toEqual([
    { grantYearStart: '2025-05-01', before: 0, after: 0 - 3 * 480, position: 'previous' },
    { grantYearStart: '2026-05-01', before: 2040, after: 2040 - 3 * 480, position: 'current' },
  ])
})
