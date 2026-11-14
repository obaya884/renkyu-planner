import { expect, test } from 'vitest'
import { SHEET, UNSET } from './fixture'
import { previewAdd } from './addPreview'

test('F-206: 1 日入れると未割り当てが 1 日分減る', () => {
  expect(previewAdd(SHEET, ['2026-11-20'], 'paid')).toEqual([{ grantYearStart: '2026-05-01', before: 2040, after: 1560 }])
})
test('Review Focus 2・F-209: 付与日をまたぐと、付与年ごとに分けて引く', () => {
  expect(previewAdd(SHEET, ['2027-04-28', '2027-05-06'], 'paid')).toEqual([
    { grantYearStart: '2026-05-01', before: 2040, after: 1560 },
    // 次の付与年の繰り越しの初期値は、今の付与年の未割り当て（R-13）。4/28 を入れると、その初期値も 1 日分減る
    { grantYearStart: '2027-05-01', before: 14 * 480 + 2040, after: 14 * 480 + 1560 - 480 },
  ])
})
test('F-211: 足りなくても計算は続け、after が負になる', () => {
  expect(previewAdd(SHEET, ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-24', '2026-11-25'], 'paid')[0].after).toBe(2040 - 2400)
})
test('F-106: 付与日が未設定なら空', () => {
  expect(previewAdd(UNSET, ['2026-11-20'], 'paid')).toEqual([])
})
