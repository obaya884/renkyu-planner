import { expect, test } from 'vitest'
import { SHEET } from '@/domain/view/fixture'
import { rangeDays } from './entryRange'

test('F-307・§5.2: 期間の、土日・祝日・会社の休日でない日。1 日分の日程がある日にも足す', () => {
  // 12/30〜1/3 は会社の休日。12/28・12/29 には有休の予定がある
  expect(rangeDays(SHEET, '2026-12-28', '2027-01-04')).toEqual({ days: ['2026-12-28', '2026-12-29', '2027-01-04'], errors: [] })
  expect(rangeDays(SHEET, '2026-11-19', '2026-11-24')).toEqual({ days: ['2026-11-19', '2026-11-20', '2026-11-24'], errors: [] }) // 11/23 は祝日
  expect(rangeDays(SHEET, '2026-11-20', '2026-11-20')).toEqual({ days: ['2026-11-20'], errors: [] })
  expect(rangeDays(SHEET, '2026-11-21', '2026-11-24')).toEqual({ days: ['2026-11-24'], errors: [] }) // H-1: 日付が土曜でも飛ばす
})
test('F-307・R-19・§5.2: 保存できない 4 つの場合', () => {
  expect(rangeDays(SHEET, '2026-11-24', '2026-11-19')).toEqual({ days: [], errors: ['endBeforeStart'] })
  expect(rangeDays(SHEET, '2027-09-27', '2027-10-01')).toEqual({ days: [], errors: ['tooFar'] }) // R-19 の末日は 2027-09-30
  expect(rangeDays(SHEET, '2026-12-30', '2027-01-03')).toEqual({ days: [], errors: ['noDays'] }) // 全部が会社の休日
  expect(rangeDays(SHEET, '2026-11-02', '2026-12-16').days).toHaveLength(31) // ちょうど 31 日は足せる（11/2 の取得済みの日程の日も数える）
  expect(rangeDays(SHEET, '2026-11-02', '2026-12-17')).toEqual({ days: [], errors: ['tooManyDays'] }) // 32 日
  expect(rangeDays(SHEET, '1900-01-01', '2026-11-20')).toEqual({ days: [], errors: ['tooManyDays'] }) // 遠い過去からでも固まらない
  expect(rangeDays(SHEET, '2026-11-20', '')).toEqual({ days: [], errors: ['invalidDate'] })
})
