import { describe, expect, test } from 'vitest'
import data from '@/data/holidays.json'
import { addDays } from '../shared/date'
import { buildRestCalendar, restRuns, runContaining } from './restDays'

const nenmatsu = { kind: 'yearly', start: '12-30', end: '01-03' } as const
const day = (date: string) => ({ id: date, date, leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false }) as const

describe('休みの日と連休（R-1・R-2・R-15）', () => {
  test('土日と祝日だけで 2026 年 9 月は 9/19〜9/23 の 5 連休になる', () => {
    const cal = buildRestCalendar({ holidays: data.holidays, companyHolidays: [], entries: [] })
    expect(restRuns(cal, '2026-09-01', '2026-09-30')).toEqual([{ start: '2026-09-19', end: '2026-09-23', days: 5 }])
  })
  test('Review Focus 2: 年をまたぐ会社の休日は 1 つの連休になり、期間の外まで数える', () => {
    const cal = buildRestCalendar({ holidays: data.holidays, companyHolidays: [nenmatsu], entries: [] })
    expect(restRuns(cal, '2026-12-01', '2026-12-31')).toEqual([{ start: '2026-12-30', end: '2027-01-03', days: 5 }])
    expect(cal.kindOf('2026-12-30')).toBe('company')
    expect(cal.kindOf('2027-01-01')).toBe('company')
  })
  test('1 日分の日程は休みの日になり、半日と時間単位はならない', () => {
    const half = { ...day('2026-11-20'), amount: { unit: 'half' } } as const
    const cal = buildRestCalendar({ holidays: data.holidays, companyHolidays: [], entries: [day('2026-11-02'), half] })
    expect(runContaining(cal, '2026-11-02')).toEqual({ start: '2026-10-31', end: '2026-11-03', days: 4 })
    expect(cal.isRest('2026-11-20')).toBe(false)
    expect(runContaining(cal, '2026-11-20')).toBeNull()
  })
  test('その年だけの会社の休日', () => {
    const cal = buildRestCalendar({ holidays: {}, companyHolidays: [{ kind: 'once', start: '2026-08-12', end: '2026-08-14' }], entries: [] })
    expect(restRuns(cal, '2026-08-01', '2026-08-31')).toEqual([{ start: '2026-08-12', end: '2026-08-16', days: 5 }])
  })
  test('R-15: 受け付けない会社の休日は計算で無いものとして扱う', () => {
    const base = buildRestCalendar({ holidays: data.holidays, companyHolidays: [], entries: [] })
    const bad = buildRestCalendar({ holidays: data.holidays, companyHolidays: [{ kind: 'yearly', start: '01-01', end: '12-31' }], entries: [] })
    expect(restRuns(bad, '2026-01-01', '2027-12-31')).toEqual(restRuns(base, '2026-01-01', '2027-12-31'))
  })
  test('R-2: 連休を伸ばす計算は 366 日で打ち切る', () => {
    const chain = Array.from({ length: 13 }, (_, i) => ({
      kind: 'once' as const,
      start: addDays('2026-01-01', i * 31),
      end: addDays('2026-01-01', i * 31 + 30),
    }))
    const cal = buildRestCalendar({ holidays: {}, companyHolidays: chain, entries: [] })
    expect(runContaining(cal, '2026-07-01')?.days).toBe(366)
    expect(restRuns(cal, '2026-07-01', '2026-07-01')[0]?.days).toBe(366)
  })
  test('R-1: 祝日や会社の休日に 1 日分の日程が重なっても、種類は元のまま', () => {
    const cal = buildRestCalendar({
      holidays: data.holidays,
      companyHolidays: [{ kind: 'once', start: '2026-12-01', end: '2026-12-01' }],
      entries: [day('2026-11-03'), day('2026-12-01'), day('2026-11-07'), day('2026-11-04')],
    })
    expect(cal.kindOf('2026-11-03')).toBe('holiday')
    expect(cal.kindOf('2026-12-01')).toBe('company')
    expect(cal.kindOf('2026-11-07')).toBe('weekend')
    expect(cal.kindOf('2026-11-04')).toBe('leave')
  })
})
