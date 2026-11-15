import { expect, test } from 'vitest'
import data from '@/data/holidays.json'
import { planningQuarters } from '@/domain/quarters/quarters'
import { buildQuarterViews } from '@/domain/view/quarterView'
import { buildSummary } from '@/domain/view/summary'
import { createPlannerStore } from './store/createPlannerStore'

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }
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
  const nov = v.quarters[0].candidates.find((b) => b.kind === 'group' && b.core === '2026-11-23')
  expect(nov?.kind === 'group' && nov.primary[0].leaveDays).toEqual(['2026-11-20'])

  s.addEntries([{ date: '2026-11-20', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false }])
  v = view(s)
  expect(v.quarters[0].entries.flatMap((b) => b.rows).map((r) => r.entry.date)).toEqual(['2026-11-20'])
  // F-207: 入れた日を休む候補は消え、その日を休みとして計算し直した候補が出る
  const rows = v.quarters[0].candidates.flatMap((b) => (b.kind === 'group' ? [...b.primary, ...b.rest] : b.rows))
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
