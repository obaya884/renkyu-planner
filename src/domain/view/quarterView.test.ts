import { expect, test } from 'vitest'
import { planningQuarters } from '@/domain/quarters/quarters'
import { previewAdd } from './addPreview'
import { SHEET, UNSET } from './fixture'
import { buildQuarterViews } from './quarterView'
import { buildSummary } from './summary'

const qs = planningQuarters('2026-11-15')
const [q4, , q2] = buildQuarterViews(SHEET, qs)
const cell = (v: typeof q4, d: string) => v.months.flatMap((m) => m.weeks.flat()).find((c) => c?.date === d)

test('F-502: 月カレンダーの印と優先', () => {
  expect(q4.months.map((m) => m.month)).toEqual(['2026-10-01', '2026-11-01', '2026-12-01'])
  expect(q4.months[1].weeks[0].map((c) => c?.day ?? null)).toEqual([null, null, null, null, null, null, 1]) // 月曜始まり。2026-11-01 は日曜
  expect(cell(q4, '2026-11-02')?.mark).toBe('done')
  expect(cell(q4, '2026-10-07')?.mark).toBe('done')      // 時間単位の日程にも印
  expect(cell(q4, '2026-12-28')?.mark).toBe('planned')
  expect(cell(q4, '2026-11-20')?.mark).toBe('candidate')
  expect(cell(q4, '2026-12-30')?.mark).toBe('company')
  expect(cell(q4, '2026-11-03')?.mark).toBe('off')
  expect(cell(q4, '2026-11-04')?.mark).toBeNull()
  expect(q4.marks).toEqual(['done', 'planned', 'candidate', 'company', 'off'])
})
test('F-203・R-7: 候補の組。休む日数がいちばん少ない候補を全部 primary に、残りを rest に', () => {
  const groups = q4.candidates.filter((b) => b.kind === 'group')
  expect(groups.map((g) => g.core)).toEqual(['2026-12-30', '2026-11-23']) // 12/25 を休むと 10 連休（効率 10）が先
  const nov = groups[1]
  expect(nov.primary.map((r) => r.leaveDays)).toEqual([['2026-11-20'], ['2026-11-24']])
  expect(nov.primary[0]).toMatchObject({ run: { start: '2026-11-20', end: '2026-11-23', days: 4 }, long: false, unconfirmed: false, nextGrantYear: false, shortMinutes: null })
  expect(nov.rest).toHaveLength(7)
  expect(nov.restHasLong).toBe(true)
  expect(q4.candidates.some((b) => b.kind === 'monthGap')).toBe(false) // 12 月は平日に会社の休日がある
})
test('F-203・§5.1: primary は休む日数がいちばん少ない候補の全部（効率の差を問わない）。連休の長い順', () => {
  const plan = (date: string) => ({ id: date, date, leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false }) as const
  const input = { ...SHEET, entries: [...SHEET.entries, plan('2026-11-24'), plan('2026-11-25'), plan('2026-11-26')] }
  const [v] = buildQuarterViews(input, qs)
  const nov = v.candidates.find((b) => b.kind === 'group' && b.core === '2026-11-23')
  if (nov?.kind !== 'group') throw new Error('11/23 の組が無い')
  const primary = nov.primary.map((r) => r.leaveDays)
  expect(primary).toContainEqual(['2026-11-27'])
  expect(primary).toContainEqual(['2026-11-20'])
  expect(primary.findIndex((d) => d[0] === '2026-11-27')).toBeLessThan(primary.findIndex((d) => d[0] === '2026-11-20'))
  expect(nov.primary.every((r) => r.leaveDays.length === 1)).toBe(true)
  expect(nov.rest.some((r) => r.leaveDays.length === 1)).toBe(false)
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
  const types = [...SHEET.settings.leaveTypes, { id: 'sum', name: '夏季休暇', days: 3, usable: null, grantDay: null, together: false }]
  const entries = [...SHEET.entries, { id: 'z', date: '2026-11-30', leaveTypeId: 'sum', amount: { unit: 'half' }, title: '', done: false } as const]
  const [v] = buildQuarterViews({ ...SHEET, settings: { ...SHEET.settings, leaveTypes: types }, entries }, qs)
  expect(v.entries.flatMap((b) => b.rows).find((r) => r.entry.id === 'z')?.leaveTypeName).toBe('夏季休暇')
})
test('R-8: 祝日のない月の塊は、できる連休の日数を持つ', () => {
  const [u4] = buildQuarterViews(UNSET, qs)
  expect(u4.candidates.at(-1)).toMatchObject({ kind: 'monthGap', runDays: 3 })
})
const rowsOf = (v: typeof q4) => v.candidates.flatMap((b) => (b.kind === 'group' ? [...b.primary, ...b.rest] : b.rows))
/** モーダルと同じ数え方の不足の合計（§3.7・§5.1） */
const shortOfPreview = (input: typeof SHEET, leaveDays: readonly string[]) =>
  previewAdd(input, leaveDays, 'paid').reduce((sum, d) => sum + (d.after <= -1 ? -d.after : 0), 0)
test('F-209・F-211・R-13: 付与日をまたぐ候補の不足は、モーダル（previewAdd）と同じ。今の付与年に入れた分だけ次の付与年の繰り越しが減る', () => {
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

test('F-108: 週の始まりを日曜にすると、日曜から並ぶ。初期値は月曜', () => {
  expect(q4.months[1].weekStart).toBe('monday')
  expect(q4.months[1].weeks[1].map((c) => c?.day ?? null)).toEqual([2, 3, 4, 5, 6, 7, 8])
  const sunday = buildQuarterViews({ ...SHEET, settings: { ...SHEET.settings, weekStart: 'sunday' } }, qs)[0].months[1]
  expect(sunday.weekStart).toBe('sunday')
  expect(sunday.weeks[0].map((c) => c?.day ?? null)).toEqual([1, 2, 3, 4, 5, 6, 7])
  expect(sunday.weeks.at(-1)?.map((c) => c?.day ?? null)).toEqual([29, 30, null, null, null, null, null])
  expect(q4.months[1].weeks.at(-1)?.map((c) => c?.day ?? null)).toEqual([30, null, null, null, null, null, null])
})

test('F-108: 週の始まりで、月カレンダーの先頭の週が変わる', () => {
  const sunday = buildQuarterViews({ ...SHEET, settings: { ...SHEET.settings, weekStart: 'sunday' } }, qs)[0]
  expect(sunday.months[1].weeks[0].map((c) => c?.day ?? null)).toEqual([1, 2, 3, 4, 5, 6, 7]) // 2026-11-01 は日曜
  const monday = buildQuarterViews({ ...SHEET, settings: { ...SHEET.settings, weekStart: 'monday' } }, qs)[0]
  expect(monday.months[1].weeks[0].map((c) => c?.day ?? null)).toEqual([null, null, null, null, null, null, 1])
})

// 持ち分から引く日程は 12-28・12-29・2027-02-12・02-22・04-30 の 5 日（重なっても残る）。1 日 480 分で 5 * 480
test('R-17: 会社の休日を足して日程と重なっても、日程は残り、重なりを示し、持ち分から引く', () => {
  const input = { ...SHEET, settings: { ...SHEET.settings, companyHolidays: [{ kind: 'yearly', start: '12-28', end: '01-03' }] } } as const
  const [v] = buildQuarterViews(input, qs)
  const dec = v.entries.flatMap((b) => b.rows).filter((r) => r.entry.date.startsWith('2026-12'))
  expect(dec.map((r) => [r.entry.date, r.overlap])).toEqual([['2026-12-28', true], ['2026-12-29', true]])
  expect(buildSummary(input).cards[0].planned).toBe(5 * 480)
})

const summerType = { id: 'summer', name: '夏季休暇', days: 1, usable: { start: '07-01', end: '09-30' }, grantDay: null, together: false } as const
test('F-208・F-211: 候補の行の種類と不足は、引く休暇の初期値の種類で数える', () => {
  const input = { ...SHEET, settings: { ...SHEET.settings, leaveTypes: [...SHEET.settings.leaveTypes, summerType] } }
  const q3 = buildQuarterViews(input, qs)[3]
  const rows = q3.candidates.flatMap((b) => (b.kind === 'group' ? [...b.primary, ...b.rest] : b.rows))
  const row = (days: string[]) => rows.find((r) => r.leaveDays.join() === days.join())
  expect(row(['2027-09-24'])).toMatchObject({ leaveTypeId: 'summer', leaveTypeName: '夏季休暇', shortMinutes: null }) // 秋分の日の翌日。4 連休
  expect(row(['2027-09-21', '2027-09-22'])).toMatchObject({ leaveTypeId: 'paid', leaveTypeName: '有休', shortMinutes: null }) // 夏季休暇が足りないので有休。有休は足りる
})
test('F-208・F-209: 「次の付与年から引く」は、初期値の種類の付与年で見る', () => {
  // 冬季休暇は付与される日が 01-01。今日（2026-11-15）が入る付与年は 2026-01-01〜2026-12-31 なので、次の付与年は 2027-01-01 から。
  // 2027-01-08（金）を休むと 1/9〜1/11（成人の日）と続く 4 連休。冬季休暇の 2027-01-01 の付与年の未割り当ては 1 日 × 480 = 480 分で、
  // 1 日分（480 分）以上あるので初期値は冬季休暇。休む日は 2027-01-01 以降なので true
  const winter = { id: 'winter', name: '冬季休暇', days: 1, usable: { start: '01-01', end: '03-31' }, grantDay: '01-01', together: false } as const
  const input = { ...SHEET, settings: { ...SHEET.settings, leaveTypes: [...SHEET.settings.leaveTypes, winter] } }
  const jan = rowsOf(buildQuarterViews(input, qs)[1]).find((r) => r.leaveDays.join() === '2027-01-08')
  expect(jan).toMatchObject({ leaveTypeId: 'winter', run: { start: '2027-01-08', end: '2027-01-11', days: 4 }, nextGrantYear: true })
  // 有休が初期値の同じ候補。有休の今の付与年は 2026-05-01〜2027-04-30 なので、2027-01-08 は今の付与年に入る
  const paid = rowsOf(buildQuarterViews(SHEET, qs)[1]).find((r) => r.leaveDays.join() === '2027-01-08')
  expect(paid).toMatchObject({ leaveTypeId: 'paid', nextGrantYear: false })
})
test('F-208・R-8: 祝日のない月の候補でも、使える期間のある休暇に足りれば初期値はその休暇', () => {
  // 2027 年 6 月は祝日が無く、SHEET に 6 月の日程も無いので、金曜か月曜を 1 日休む候補になる（R-8）。
  // 6 月の休暇（付与される日は有休と同じ 05-01）の 2027-05-01 の付与年の未割り当ては 1 × 480 = 480 分で、1 日分（480 分）以上ある
  const june = { id: 'june', name: '6月休暇', days: 1, usable: { start: '06-01', end: '06-30' }, grantDay: null, together: false } as const
  const input = { ...SHEET, settings: { ...SHEET.settings, leaveTypes: [...SHEET.settings.leaveTypes, june] } }
  const gap = buildQuarterViews(input, qs)[2].candidates.find((b) => b.kind === 'monthGap' && b.month === '2027-06-01')
  if (gap?.kind !== 'monthGap') throw new Error('6 月の候補が無い')
  expect(gap.rows.length).toBeGreaterThan(0)
  expect(gap.rows.every((r) => r.leaveTypeId === 'june' && r.leaveTypeName === '6月休暇' && r.shortMinutes === null)).toBe(true)
})
