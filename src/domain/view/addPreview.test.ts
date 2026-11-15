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

test('R-13・F-209: 次の付与年に使える日数の上書きがあれば、今の付与年に足した日は次の付与年の未割り当てを減らさない', () => {
  // 次の付与年（2027-05-01）に使える日数 20 日（9600 分）を入れると、持ち分はその値で、繰り越しを数えない（R-13）。
  // 次の付与年の日程は SHEET に無いので before = 9600。足した 2027-05-06 の 1 日分だけ減って after = 9600 − 480。
  // 今の付与年に足した 2027-04-28 は繰り越しを通らないので、差は 1 日分だけ
  const input = { ...SHEET, settings: { ...SHEET.settings, grantYears: { ...SHEET.settings.grantYears, '2027-05-01': { grantDays: 14, entitlementMinutes: 20 * 480 } } } }
  const [now, next] = previewAdd(input, ['2027-04-28', '2027-05-06'], 'paid')
  expect(now).toEqual({ grantYearStart: '2026-05-01', before: 2040, after: 1560, current: true })
  expect(next).toEqual({ grantYearStart: '2027-05-01', before: 9600, after: 9600 - 480, current: false })
})
test('R-13・F-209: 次の付与年に付与日数だけ入れたときは、繰り越しを通って今の付与年に足した日の分も減る', () => {
  // 次の付与年（2027-05-01）に付与日数 16 日だけを入れる。繰り越し = min(今の付与年の未割り当て, 14 × 480)。
  // 足す前: 繰り越し min(2040, 6720) = 2040 → before = 16 × 480 + 2040。
  // 足した後: 今の付与年の未割り当て 1560 → 繰り越し 1560。次の付与年の 5/6 も 1 日分引くので after = 16 × 480 + 1560 − 480
  const input = { ...SHEET, settings: { ...SHEET.settings, grantYears: { ...SHEET.settings.grantYears, '2027-05-01': { grantDays: 16, entitlementMinutes: null } } } }
  expect(previewAdd(input, ['2027-04-28', '2027-05-06'], 'paid')[1]).toEqual({ grantYearStart: '2027-05-01', before: 16 * 480 + 2040, after: 16 * 480 + 1560 - 480, current: false })
})
