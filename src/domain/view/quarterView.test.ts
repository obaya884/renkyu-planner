import { expect, test } from 'vitest'
import { planningQuarters } from '@/domain/quarters/quarters'
import { previewAdd } from './addPreview'
import { SHEET, UNSET } from './fixture'
import { buildQuarterViews } from './quarterView'

const qs = planningQuarters('2026-11-15')
const [q4, , q2] = buildQuarterViews(SHEET, qs)
const cell = (v: typeof q4, d: string) => v.months.flatMap((m) => m.weeks.flat()).find((c) => c?.date === d)

test('F-502: 月カレンダーの印と優先', () => {
  expect(q4.months.map((m) => m.month)).toEqual(['2026-10-01', '2026-11-01', '2026-12-01'])
  expect(q4.months[1].weeks[0].map((c) => c?.day ?? null)).toEqual([1, 2, 3, 4, 5, 6, 7]) // 2026-11-01 は日曜
  expect(cell(q4, '2026-11-02')?.mark).toBe('done')
  expect(cell(q4, '2026-10-07')?.mark).toBe('done')      // 時間単位の日程にも印
  expect(cell(q4, '2026-12-28')?.mark).toBe('planned')
  expect(cell(q4, '2026-11-20')?.mark).toBe('candidate')
  expect(cell(q4, '2026-12-30')?.mark).toBe('company')
  expect(cell(q4, '2026-11-03')?.mark).toBe('off')
  expect(cell(q4, '2026-11-04')?.mark).toBeNull()
  expect(q4.marks).toEqual(['done', 'planned', 'candidate', 'company', 'off'])
})
test('F-203・R-7: 候補の組。効率が同じ最良の候補を全部 primary に、残りを rest に', () => {
  const groups = q4.candidates.filter((b) => b.kind === 'group')
  expect(groups.map((g) => g.core)).toEqual(['2026-12-30', '2026-11-23']) // 12/25 を休むと 10 連休（効率 10）が先
  const nov = groups[1]
  expect(nov.primary.map((r) => r.leaveDays)).toEqual([['2026-11-20'], ['2026-11-24']])
  expect(nov.primary[0]).toMatchObject({ run: { start: '2026-11-20', end: '2026-11-23', days: 4 }, long: false, unconfirmed: false, nextGrantYear: false, shortMinutes: null })
  expect(nov.rest).toHaveLength(7)
  expect(nov.restHasLong).toBe(true)
  expect(q4.candidates.some((b) => b.kind === 'monthGap')).toBe(false) // 12 月は平日に会社の休日がある
})
test('F-205・R-8: 祝日のない月は、組の後ろに 1 日ずつ', () => {
  const [u4] = buildQuarterViews(UNSET, qs)
  const gap = u4.candidates.at(-1)
  expect(gap).toMatchObject({ kind: 'monthGap', month: '2026-12-01', unconfirmed: false })
  expect(gap?.kind === 'monthGap' && gap.rows.map((r) => r.leaveDays[0])).toEqual(['2026-12-04', '2026-12-07', '2026-12-11', '2026-12-14', '2026-12-18', '2026-12-21', '2026-12-25', '2026-12-28'])
  expect(gap?.kind === 'monthGap' && gap.rows[0].run).toEqual({ start: '2026-12-04', end: '2026-12-06', days: 3 })
})
test('F-304: 日程の塊。同じ連休の 2 件は 1 つの塊、1 件だけなら行に連休を持つ', () => {
  expect(q4.entries.map((b) => [b.run?.start ?? null, b.rows.map((r) => r.entry.date)])).toEqual([
    [null, ['2026-10-07']],
    [null, ['2026-11-02']],
    ['2026-12-26', ['2026-12-28', '2026-12-29']],
  ])
  expect(q4.entries[1].rows[0].run).toEqual({ start: '2026-10-31', end: '2026-11-03', days: 4 })
  expect(q4.entries[0].rows[0].run).toBeNull()
  expect(q4.longBreak).toEqual({ start: '2026-12-26', end: '2027-01-03', days: 9 })
})
test('F-209: 付与日の印と、次の付与年に入る候補', () => {
  expect(cell(q2, '2027-05-01')?.grantDay).toBe(true)
  expect(q2.grantNote).toEqual({ date: '2027-05-01', entered: false, grantDays: 14 })
  expect(q4.grantNote).toBeNull()
  const rows = q2.candidates.flatMap((b) => (b.kind === 'group' ? [...b.primary, ...b.rest] : b.rows))
  expect(rows.find((r) => r.leaveDays[0] === '2027-05-06')?.nextGrantYear).toBe(true)
  expect(rows.filter((r) => r.leaveDays.every((d) => d < '2027-05-01')).every((r) => !r.nextGrantYear)).toBe(true)
})
test('F-211: 足りない候補は shortMinutes を持つ', () => {
  const tight = { ...SHEET, settings: { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 10, entitlementMinutes: null } } } } // 未割り当て 120 分
  const [t4] = buildQuarterViews(tight, qs)
  const nov = t4.candidates.find((b) => b.kind === 'group' && b.core === '2026-11-23')
  expect(nov?.kind === 'group' && nov.primary[0].shortMinutes).toBe(360)
})
test('F-305・Review Focus 3: 過ぎた予定と、休みの日に重なった日程', () => {
  const entries = [...SHEET.entries, { id: 'x', date: '2026-11-13', leaveTypeId: 'paid', amount: { unit: 'half' }, title: '通院', done: false } as const, { id: 'y', date: '2026-11-23', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false } as const]
  const [v] = buildQuarterViews({ ...SHEET, entries }, qs)
  const rows = v.entries.flatMap((b) => b.rows)
  expect(rows.find((r) => r.entry.id === 'x')).toMatchObject({ overdue: true, overlap: false })
  expect(rows.find((r) => r.entry.id === 'y')).toMatchObject({ overdue: false, overlap: true })
  expect(cell(v, '2026-11-23')?.mark).toBe('planned')
})
test('F-508: 過ぎた四半期は候補を出さない', () => {
  const [past] = buildQuarterViews(SHEET, planningQuarters('2026-11-15', -1))
  expect(past).toMatchObject({ past: true, candidates: [] })
  expect(past.entries.flatMap((b) => b.rows).map((r) => r.entry.date)).toEqual(['2026-08-10', '2026-09-04'])
  expect(past.marks).not.toContain('candidate')
})
test('F-304・R-14: 日程の塊と行に、長めかどうかと休暇の種類の名前を持つ', () => {
  expect(q4.entries[2]).toMatchObject({ long: true }) // 12/26〜1/3 の 9 連休
  expect(q4.entries[1]).toMatchObject({ long: false })
  expect(q4.entries[1].rows[0]).toMatchObject({ long: false, leaveTypeName: null }) // 10/31〜11/3 の 4 連休、有休
  expect(q4.entries[2].rows[0].long).toBe(true)
  expect(q4.entries[0].rows[0].long).toBe(false) // 連休に入らない
  const types = [...SHEET.settings.leaveTypes, { id: 'sum', name: '夏季休暇', days: 3, usable: null }]
  const entries = [...SHEET.entries, { id: 'z', date: '2026-11-30', leaveTypeId: 'sum', amount: { unit: 'half' }, title: '', done: false } as const]
  const [v] = buildQuarterViews({ ...SHEET, settings: { ...SHEET.settings, leaveTypes: types }, entries }, qs)
  expect(v.entries.flatMap((b) => b.rows).find((r) => r.entry.id === 'z')?.leaveTypeName).toBe('夏季休暇')
})
test('R-8: 祝日のない月の塊は、できる連休の日数を持つ', () => {
  const [u4] = buildQuarterViews(UNSET, qs)
  expect(u4.candidates.at(-1)).toMatchObject({ kind: 'monthGap', runDays: 3 })
})
const rowsOf = (v: typeof q4) => v.candidates.flatMap((b) => (b.kind === 'group' ? [...b.primary, ...b.rest] : b.rows))
/** 面と同じ数え方の不足の合計（§3.7・§5.1） */
const shortOfPreview = (input: typeof SHEET, leaveDays: readonly string[]) =>
  previewAdd(input, leaveDays, 'paid').reduce((sum, d) => sum + (d.after <= -1 ? -d.after : 0), 0)
test('F-209・F-211・R-13: 付与日をまたぐ候補の不足は、面（previewAdd）と同じ。今の付与年に入れた分だけ次の付与年の繰り越しが減る', () => {
  // 今の付与年の未割り当てが 1 日（付与 1 日、持ち分の上書きは日程の合計 + 1 日）。次の付与年は付与 0 日で、持ち分は繰り越しだけ（付与日数の 1 日まで）
  const settings = { ...SHEET.settings, grantYears: { '2026-05-01': { grantDays: 1, entitlementMinutes: 9 * 480 + 360 + 480 }, '2027-05-01': { grantDays: 0, entitlementMinutes: null } } }
  const input = { ...SHEET, settings }
  const [, , v2] = buildQuarterViews(input, qs)
  const rows = rowsOf(v2)
  const crossing = rows.find((r) => r.leaveDays.join() === '2027-04-28,2027-05-06')
  expect(crossing).toBeDefined()
  // 4/28 で今の付与年は 0 になり、次の付与年の繰り越しも 0 になるので、5/6 の 1 日が足りない
  expect(crossing?.shortMinutes).toBe(480)
  for (const r of rows.filter((x) => x.leaveDays.some((d) => d < '2027-05-01') && x.leaveDays.some((d) => d >= '2027-05-01'))) {
    const expected = shortOfPreview(input, r.leaveDays)
    expect(r.shortMinutes).toBe(expected > 0 ? expected : null)
  }
})
test('§3.2・F-211: 0.5 分の端数で 1 分に満たない不足は、不足にしない', () => {
  // 所定労働時間 465 分、持ち分の上書き 697 分（1 日 + 232 分）、半日の日程 1 件 → 未割り当て 464.5 分。1 日入れると −0.5 分
  const input = {
    ...UNSET,
    settings: { ...UNSET.settings, workMinutes: 465, grantDay: '05-01', grantYears: { '2026-05-01': { grantDays: 1, entitlementMinutes: 697 } } },
    entries: [{ id: 'h', date: '2026-10-13', leaveTypeId: 'paid', amount: { unit: 'half' }, title: '', done: true } as const],
  }
  const [v] = buildQuarterViews(input, qs)
  const row = rowsOf(v).find((r) => r.leaveDays.join() === '2026-11-20')
  expect(previewAdd(input, ['2026-11-20'], 'paid')[0].after).toBe(-0.5)
  expect(row?.shortMinutes).toBeNull()
  expect(rowsOf(v).find((r) => r.leaveDays.length === 2)?.shortMinutes).toBe(465.5)
})
