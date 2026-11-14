import { describe, expect, test } from 'vitest'
import data from '@/data/holidays.json'
import { buildRestCalendar } from '@/domain/calendar/restDays'
import { findCandidates } from './findCandidates'

const base = { today: '2026-10-01', confirmedUntil: '2027-12-31', entryDates: new Set<string>() }
const plain = buildRestCalendar({ holidays: data.holidays, companyHolidays: [], entries: [] })
const leaveOf = (cs: ReturnType<typeof findCandidates>) => cs.map((c) => c.leaveDays.join(','))

describe('候補（F-201・F-204・F-207・F-210、R-3・R-4・R-9）', () => {
  test('シートの飛び石埋め: 11/2 を休むと 10/31〜11/3 の 4 連休', () => {
    const cs = findCandidates({ ...base, cal: plain, start: '2026-10-26', end: '2026-11-08' })
    expect(cs).toContainEqual({ leaveDays: ['2026-11-02'], run: { start: '2026-10-31', end: '2026-11-03', days: 4 }, long: false, unconfirmed: false, core: '2026-11-03' })
  })
  test('土日だけでは作れない長さだけを出す（祝日のない週は候補なし）', () => {
    expect(findCandidates({ ...base, cal: plain, start: '2026-10-19', end: '2026-10-25' })).toEqual([])
  })
  test('休む日は 1〜3 日。4 日要る組み合わせは出さない', () => {
    const cs = findCandidates({ ...base, cal: plain, start: '2026-11-01', end: '2026-11-30' })
    expect(cs.length).toBeGreaterThan(0)
    expect(cs.every((c) => c.leaveDays.length >= 1 && c.leaveDays.length <= 3)).toBe(true)
    expect(cs.every((c) => c.run.days >= c.leaveDays.length + 3)).toBe(true)
  })
  test('会社の休日 12/30〜1/3 があれば、12/28・29 を休むと 12/26〜1/3 の 9 連休で長め', () => {
    const cal = buildRestCalendar({ holidays: data.holidays, companyHolidays: [{ kind: 'yearly', start: '12-30', end: '01-03' }], entries: [] })
    const cs = findCandidates({ ...base, cal, start: '2026-12-01', end: '2026-12-31' })
    expect(cs).toContainEqual({ leaveDays: ['2026-12-28', '2026-12-29'], run: { start: '2026-12-26', end: '2027-01-03', days: 9 }, long: true, unconfirmed: false, core: '2026-12-30' })
  })
  test('F-207: 金曜を 1 日分の日程に入れると、月曜を休む候補が出る。日程のある日は休む日にしない', () => {
    const entry = { id: 'a', date: '2026-10-23', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false } as const
    const cal = buildRestCalendar({ holidays: data.holidays, companyHolidays: [], entries: [entry] })
    const cs = findCandidates({ ...base, cal, entryDates: new Set(['2026-10-23']), start: '2026-10-19', end: '2026-10-31' })
    expect(leaveOf(cs)).toContain('2026-10-26')
    expect(cs.find((c) => c.leaveDays[0] === '2026-10-26')?.run).toEqual({ start: '2026-10-23', end: '2026-10-26', days: 4 })
    expect(cs.some((c) => c.leaveDays.includes('2026-10-23'))).toBe(false)
  })
  test('R-4: 今日より前の日は休む日にしない', () => {
    const cs = findCandidates({ ...base, today: '2026-11-03', cal: plain, start: '2026-10-26', end: '2026-11-08' })
    expect(cs.some((c) => c.leaveDays.includes('2026-11-02'))).toBe(false)
  })
  test('Review Focus 3: 確定期限の端。並びの翌日が期限より後なら未確定', () => {
    const cal = buildRestCalendar({ holidays: data.holidays, companyHolidays: [{ kind: 'yearly', start: '12-30', end: '01-03' }], entries: [] })
    const cs = findCandidates({ ...base, cal, start: '2027-12-01', end: '2027-12-31' })
    expect(cs.length).toBeGreaterThan(0)
    expect(cs.filter((c) => c.run.end >= '2027-12-31').every((c) => c.unconfirmed)).toBe(true)
    const nov = findCandidates({ ...base, cal, start: '2027-11-01', end: '2027-11-30' })
    expect(nov.length).toBeGreaterThan(0)
    expect(nov.every((c) => !c.unconfirmed)).toBe(true)
  })
  test('R-3: 休む日の全部が 1 つの並びに入らない組は出さない（間に平日 11/4 が残る 11/2 と 11/5）', () => {
    const cs = findCandidates({ ...base, cal: plain, start: '2026-11-02', end: '2026-11-02' })
    expect(leaveOf(cs)).toContain('2026-11-02,2026-11-04')
    expect(leaveOf(cs)).not.toContain('2026-11-02,2026-11-05')
  })
  test('R-5: 祝日・会社の休日の平日が並びに無いとき、核は leave でない最初の休みの日', () => {
    const entry = { id: 'a', date: '2026-10-23', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false } as const
    const cal = buildRestCalendar({ holidays: data.holidays, companyHolidays: [], entries: [entry] })
    const cs = findCandidates({ ...base, cal, entryDates: new Set(['2026-10-23']), start: '2026-10-26', end: '2026-10-26' })
    expect(cs.find((c) => c.leaveDays[0] === '2026-10-26')?.core).toBe('2026-10-24')
  })
  test('R-5: 祝日に 1 日分の日程が重なっても核はその祝日', () => {
    const entry = { id: 'a', date: '2026-11-03', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false } as const
    const cal = buildRestCalendar({ holidays: data.holidays, companyHolidays: [], entries: [entry] })
    const cs = findCandidates({ ...base, cal, entryDates: new Set(['2026-11-03']), start: '2026-11-02', end: '2026-11-02' })
    expect(cs.find((c) => c.leaveDays.join(',') === '2026-11-02')?.core).toBe('2026-11-03')
  })
  test('並びは leaveDays[0] の早い順、同じなら休む日数の少ない順', () => {
    const cs = findCandidates({ ...base, cal: plain, start: '2026-10-26', end: '2026-11-30' })
    const keys = cs.map((c) => [c.leaveDays[0], c.leaveDays.length] as const)
    const sorted = [...keys].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]))
    expect(keys).toEqual(sorted)
  })
})
