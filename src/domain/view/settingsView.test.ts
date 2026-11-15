import { expect, test } from 'vitest'
import { SHEET, UNSET } from './fixture'
import { buildGrantSection, companyHolidayRows, leaveTypeRows } from './settingsView'

test('F-405・§6: 今の付与年と次の付与年の行。次は前の年の付与日数で計算', () => {
  expect(buildGrantSection(SHEET)).toEqual({
    grantDay: '05-01',
    current: { start: '2026-05-01', end: '2027-04-30', entered: true, grantDays: 14, entitlement: 6720 },
    next: { start: '2027-05-01', end: '2028-04-30', entered: false, grantDays: 14, entitlement: 8760 }, // 14 日 + 繰り越し 2040 分
    past: [],
  })
  expect(buildGrantSection(UNSET)).toBeNull()
})
test('F-405・R-13: 過ぎた付与年。前の年の未割り当てが繰り越される', () => {
  const settings = { ...SHEET.settings, grantYears: { '2025-05-01': { grantDays: 12, entitlementMinutes: null }, '2026-05-01': { grantDays: 14, entitlementMinutes: null } } }
  const v = buildGrantSection({ ...SHEET, settings })
  expect(v?.past).toEqual([{ start: '2025-05-01', end: '2026-04-30', entered: true, grantDays: 12, entitlement: 5760 }])
  expect(v?.current.entitlement).toBe(12480) // 14 日 + 2025 年の未割り当て 12 日
})
test('F-405・§6: 過ぎた付与年は、日程の日付が入るいちばん古い年から今の年の 1 つ前まで、新しい順', () => {
  // 設定は 2026 のみ。有休の日程が 2024-06-01 にあるので、2024・2025 の 2 年が出る（新しい 2025 が先）
  const entries = [...SHEET.entries, { ...SHEET.entries[0], id: 'old', date: '2024-06-01' }]
  const v = buildGrantSection({ ...SHEET, entries })
  expect(v?.past.map((r) => r.start)).toEqual(['2025-05-01', '2024-05-01'])
  // 有休でない日程は数えない
  const other = [{ ...SHEET.entries[0], id: 'o', date: '2024-06-01', leaveTypeId: 'summer' }]
  expect(buildGrantSection({ ...SHEET, entries: other })?.past).toEqual([])
})

test('§6: 会社の休日の行は、毎年を月日の順、そのあとその年だけを日付の順', () => {
  const companyHolidays = [
    { kind: 'once', start: '2027-08-13', end: '2027-08-16' },
    { kind: 'yearly', start: '12-30', end: '01-03' },
    { kind: 'once', start: '2026-08-13', end: '2026-08-14' },
    { kind: 'yearly', start: '08-13', end: '08-16' },
  ] as const
  expect(companyHolidayRows({ ...SHEET.settings, companyHolidays }).map((r) => r.index)).toEqual([3, 1, 2, 0])
})

test('F-104・§6: 休暇の種類の行は設定の並びのまま。日程が 1 件でもあれば hasEntries（取得済みかと日付は問わない）', () => {
  const summer = { id: 'summer', name: '夏季休暇', days: 3, usable: null, grantDay: null, together: false }
  const winter = { id: 'winter', name: '冬季休暇', days: 3, usable: null, grantDay: null, together: false }
  const settings = { ...SHEET.settings, leaveTypes: [...SHEET.settings.leaveTypes, summer, winter] }
  const entries = [...SHEET.entries, { id: 's', date: '2030-01-01', leaveTypeId: 'summer', amount: { unit: 'day' }, title: '' } as const]
  const rows = leaveTypeRows({ settings, entries })
  expect(rows.map((r) => [r.type.id, r.paid, r.hasEntries])).toEqual([
    ['paid', true, true],
    ['summer', false, true],
    ['winter', false, false],
  ])
})
