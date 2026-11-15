import { expect, test } from 'vitest'
import { SHEET, UNSET } from './fixture'
import { previewAdd, remainingFor } from './addPreview'

test('F-206: 1 日入れると未割り当てが 1 日分減る', () => {
  expect(previewAdd(SHEET, ['2026-11-20'], 'paid')).toEqual([{ grantYearStart: '2026-05-01', before: 2040, after: 1560, current: true }])
})
test('Review Focus 2・F-209: 付与日をまたぐと、付与年ごとに分けて引く', () => {
  expect(previewAdd(SHEET, ['2027-04-28', '2027-05-06'], 'paid')).toEqual([
    { grantYearStart: '2026-05-01', before: 2040, after: 1560, current: true },
    // 次の付与年の繰り越しの初期値は、今の付与年の未割り当て（R-13）。4/28 を入れると、その初期値も 1 日分減る
    { grantYearStart: '2027-05-01', before: 14 * 480 + 2040, after: 14 * 480 + 1560 - 480, current: false },
  ])
})
test('F-211: 足りなくても計算は続け、after が負になる', () => {
  expect(previewAdd(SHEET, ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-24', '2026-11-25'], 'paid')[0].after).toBe(2040 - 2400)
})
test('F-106: 付与日が未設定なら空', () => {
  expect(previewAdd(UNSET, ['2026-11-20'], 'paid')).toEqual([])
})

const free = (grantDay: string | null) => ({ id: 'free', name: 'フリーバカンス', days: 5, usable: null, grantDay, together: true })
const withFree = (grantDay: string | null) => ({ ...SHEET.settings, leaveTypes: [...SHEET.settings.leaveTypes, free(grantDay)] })

test('F-209・R-13: 足した休暇の付与年の区切りは、その種類の付与される日', () => {
  const input = { ...SHEET, settings: withFree('01-01') }
  expect(previewAdd(input, ['2026-12-28', '2027-01-04'], 'free')).toEqual([
    { grantYearStart: '2026-01-01', before: 2400, after: 1920, current: true },
    { grantYearStart: '2027-01-01', before: 2400, after: 1920, current: false },
  ])
  expect(previewAdd(SHEET, ['2026-11-20'], 'paid')).toEqual([{ grantYearStart: '2026-05-01', before: 2040, after: 1560, current: true }])
  expect(remainingFor(input, 'free', ['2026-12-28'])).toBe(2400)
  expect(remainingFor(input, 'free', ['2026-12-28', '2027-01-04'])).toBeNull()
  expect(remainingFor(input, 'paid', ['2026-12-28', '2027-01-04'])).toBe(4440) // 有休は 1 つの付与年に入る
})
