import { expect, test } from 'vitest'
import data from '@/data/holidays.json'
import { rangeDays } from '@/domain/entries/entryRange'
import { planningQuarters } from '@/domain/quarters/quarters'
import { buildQuarterViews } from '@/domain/view/quarterView'
import { buildSummary } from '@/domain/view/summary'
import { parseStored, serializeStored } from '@/domain/storage/stored'
import { createPlannerStore } from './store/createPlannerStore'
import { memoryStorage } from './store/memoryStorage'

const memory = () => memoryStorage()
const today = '2026-11-15'
const view = (s: ReturnType<typeof createPlannerStore>) => {
  const input = { holidays: data, today, ...s.getState().data }
  return { summary: buildSummary(input), quarters: buildQuarterViews(input, planningQuarters(today)) }
}

test('成功基準 2: 何も入れずに候補が見え、候補を入れ、付与日と日数を入れると残りが出る', () => {
  const m = memory(); let n = 0
  const s = createPlannerStore(m, () => `id-${++n}`); s.load()

  let v = view(s)
  expect(v.summary.state).toBe('unset')
  const nov = v.quarters[0].groups.find((g) => g.core === '2026-11-23')
  expect(nov?.primary[0].leaveDays).toEqual(['2026-11-20'])

  s.addEntries([{ date: '2026-11-20', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '' }])
  v = view(s)
  expect(v.quarters[0].entries.flatMap((b) => b.rows).map((r) => r.entry.date)).toEqual(['2026-11-20'])
  // F-207: 入れた日を休む候補は消え、その日を休みとして計算し直した候補が出る
  const rows = [...v.quarters[0].groups.flatMap((g) => [...g.primary, ...g.rest]), ...v.quarters[0].monthGaps.flatMap((b) => b.rows)]
  expect(rows.some((r) => r.leaveDays.includes('2026-11-20'))).toBe(false)
  expect(rows.some((r) => r.leaveDays.length === 1 && r.leaveDays[0] === '2026-11-24' && r.run.days === 5)).toBe(true)

  s.setGrant({ grantDay: '05-01', grantDays: 14, entitlementMinutes: null }, '2026-05-01')
  v = view(s)
  expect(v.summary.cards[0]).toMatchObject({ remaining: 14 * 480, planned: 480, unassigned: 13 * 480 })
  expect(v.summary.fiveDays).toMatchObject({ doneDays: 0, plannedDays: 1, remainingDays: 4 })

  // 閉じて開き直しても、同じ内容になる
  const again = createPlannerStore(m, () => 'x'); again.load()
  expect(view(again)).toEqual(v)
})

test('F-107: 設定画面で変えた内容が、主な画面の計算に入る', () => {
  const m = memory(); let n = 0
  const s = createPlannerStore(m, () => `id-${++n}`); s.load()
  s.setGrant({ grantDay: '05-01', grantDays: 14, entitlementMinutes: null }, '2026-05-01')
  let v = view(s)
  expect(v.summary.longBreaks.map((c) => c.has)).toEqual([false, false, true, false])
  s.saveCompanyHoliday(null, { kind: 'yearly', start: '12-30', end: '01-03' })
  v = view(s)
  expect(v.summary.longBreaks.map((c) => c.has)).toEqual([true, false, true, false]) // 12/30(水)〜1/3(日) の 5 連休
  s.setWorkMinutes(465)
  v = view(s)
  // 残り = 付与日数 14 日 × 所定労働時間 465 分（予定は入れていないので引くものが無い）
  expect(v.summary.cards[0].remaining).toBe(14 * 465)
  // 開き直しても同じ
  const again = createPlannerStore(m, () => 'x'); again.load()
  expect(view(again)).toEqual(v)
})

test('F-212: まとめて取る休暇を足すと組が出る。その付与年に入れると、その付与年の組だけが消える', () => {
  const m = memory(); let n = 0
  const s = createPlannerStore(m, () => `id-${++n}`); s.load()
  s.setGrant({ grantDay: '05-01', grantDays: 14, entitlementMinutes: null }, '2026-05-01')
  s.saveCompanyHoliday(null, { kind: 'yearly', start: '12-30', end: '01-03' })
  expect(view(s).quarters.every((q) => q.together.length === 0)).toBe(true)
  s.saveLeaveType(null, { name: 'フリーバカンス', days: 5, usable: null, grantDay: '01-01', together: true })
  const id = s.getState().data.settings.leaveTypes[1].id

  let v = view(s)
  // 手で数えた式（暦: 12/23(水)〜12/25(金) 平日、12/26・27 土日、12/28(月)・12/29(火) 平日、12/30〜1/3 会社の休日、1/1 は祝日、1/2・1/3 は土日）
  // 日程が無いので 12/23・24・25・28・29 の 5 営業日。12/22(火) は営業日なので連休は 12/23 から始まり、
  // 12/23〜12/31 の 9 日 + 1/1〜1/3 の 3 日 = 12 連休（1/4(月) は営業日で終わり）
  expect(v.quarters[0].together[0].primary).toMatchObject({
    leaveDays: ['2026-12-23', '2026-12-24', '2026-12-25', '2026-12-28', '2026-12-29'],
    run: { start: '2026-12-23', end: '2027-01-03', days: 12 },
  })
  // 2027 年の付与年の組（1 月〜3 月の欄）: 5 営業日は 1/4(月)〜1/8(金)。12/29 は営業日なので連休は 12/30 から。
  // 12/30・12/31 の 2 日 + 1/1〜1/11 の 11 日（1/9・1/10 は土日、1/11 は成人の日）= 13 連休
  expect(v.quarters[1].together[0].primary.run).toEqual({ start: '2026-12-30', end: '2027-01-11', days: 13 })

  s.addEntries(v.quarters[0].together[0].primary.leaveDays.map((date) => ({ date, leaveTypeId: id, amount: { unit: 'day' as const }, title: '' })))
  v = view(s)
  expect(v.quarters[0].together).toEqual([]) // 2026 年の付与年はもう使った
  // 2027 年の分は残る。入れた 5 日を休みの日として数え直すと 12/23 から続くので、
  // 12/23〜12/31 の 9 日 + 1/1〜1/11 の 11 日 = 20 連休
  expect(v.quarters[1].together[0].primary).toMatchObject({
    leaveDays: ['2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08'],
    run: { start: '2026-12-23', end: '2027-01-11', days: 20 },
  })
  const again = createPlannerStore(m, () => 'x'); again.load()
  expect(view(again)).toEqual(v)
})

test('F-307: 期間で足した日程が、日程の欄と持ち分に入る', () => {
  const m = memory(); let n = 0
  const s = createPlannerStore(m, () => `id-${++n}`); s.load()
  s.setGrant({ grantDay: '05-01', grantDays: 14, entitlementMinutes: null }, '2026-05-01')
  s.saveCompanyHoliday(null, { kind: 'yearly', start: '12-30', end: '01-03' })
  const input = { holidays: data, today, ...s.getState().data }
  const { days, errors } = rangeDays(input, '2026-12-28', '2027-01-04')
  expect(errors).toEqual([])
  // 12/28〜1/4 のうち、12/28・12/29・1/4 の 3 日だけが足す日（12/30〜1/3 は会社の休日・祝日・土日）
  expect(days).toEqual(['2026-12-28', '2026-12-29', '2027-01-04'])
  s.addEntries(days.map((date) => ({ date, leaveTypeId: 'paid', amount: { unit: 'day' as const }, title: '年末年始' })))
  const v = view(s)
  expect(v.quarters[0].entries.flatMap((b) => b.rows).map((r) => r.entry.date)).toEqual(['2026-12-28', '2026-12-29'])
  expect(v.quarters[1].entries.flatMap((b) => b.rows).map((r) => r.entry.date)).toEqual(['2027-01-04'])
  // 予定 3 日 = 3 × 480 分、未割り当て = 付与 14 日 - 3 日 = 11 日
  expect(v.summary.paid).toMatchObject({ planned: 3 * 480, unassigned: 11 * 480 })
})

test('F-505: 書き出したファイルを別の端末で読み込むと、同じ記録と同じ計算になる。戻すと元に戻る', () => {
  let n = 0
  const a = createPlannerStore(memory(), () => `a-${++n}`); a.load()
  a.setGrant({ grantDay: '05-01', grantDays: 14, entitlementMinutes: null }, '2026-05-01')
  a.saveCompanyHoliday(null, { kind: 'yearly', start: '12-30', end: '01-03' })
  a.addEntries([{ date: '2026-12-28', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '年末年始' }])
  // 手で数えた式: 予定は 12/28 の 1 日 = 480 分、未割り当て = 付与 14 日 - 1 日 = 13 日
  expect(view(a).summary.paid).toMatchObject({ planned: 480, unassigned: 13 * 480 })
  const r = parseStored(serializeStored(a.getState().data))
  const b = createPlannerStore(memory(), () => `b-${++n}`); b.load()
  b.addEntries([{ date: '2026-11-20', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '' }])
  const before = b.getState().data
  if (!r.ok) throw new Error('読めない')
  b.replaceAll(r.value)
  expect(b.getState().data).toEqual(a.getState().data)
  expect(view(b)).toEqual(view(a))
  // 置き換えたあとの b は、11/20 の予定が消えて 12/28 の 1 日だけになる
  expect(view(b).summary.paid).toMatchObject({ planned: 480, unassigned: 13 * 480 })
  b.replaceAll(before)
  expect(b.getState().data).toEqual(before)
})
