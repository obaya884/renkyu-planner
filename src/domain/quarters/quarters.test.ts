import { expect, test } from 'vitest'
import data from '@/data/holidays.json'
import { buildRestCalendar } from '@/domain/calendar/restDays'
import { addDays } from '@/domain/shared/date'
import { hasDatesBefore, longBreakOf, planningQuarters, quartersBetween } from './quarters'

test('F-508・R-10: 今日が入る四半期から 4 つ', () => {
  expect(planningQuarters('2026-11-15')).toEqual([
    { start: '2026-10-01', end: '2026-12-31', label: '2026年 10〜12月' },
    { start: '2027-01-01', end: '2027-03-31', label: '2027年 1〜3月' },
    { start: '2027-04-01', end: '2027-06-30', label: '2027年 4〜6月' },
    { start: '2027-07-01', end: '2027-09-30', label: '2027年 7〜9月' },
  ])
})
test('R-10: 年をまたぐ 4 つ（10〜12 月から始まる以外の並び）', () => {
  expect(planningQuarters('2026-02-10').map((q) => q.label)).toEqual([
    '2026年 1〜3月',
    '2026年 4〜6月',
    '2026年 7〜9月',
    '2026年 10〜12月',
  ])
  expect(planningQuarters('2026-08-01').map((q) => q.start)).toEqual([
    '2026-07-01',
    '2026-10-01',
    '2027-01-01',
    '2027-04-01',
  ])
})
test('F-403・R-14: 四半期に始まる 5 連休以上のうち最も長いもの。無ければ null', () => {
  const [q4, q1] = planningQuarters('2026-11-15')
  const plain = buildRestCalendar({ holidays: data.holidays, companyHolidays: [], entries: [] })
  expect(longBreakOf(plain, q4)).toBeNull()
  expect(longBreakOf(plain, q1)).toBeNull()
})
test('Review Focus 2: 12 月に始まり 1 月に終わる連休は 10〜12 月の側に入る', () => {
  const [q4, q1] = planningQuarters('2026-11-15')
  const entries = ['2026-12-28', '2026-12-29'].map((date) => ({ id: date, date, leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false }) as const)
  const cal = buildRestCalendar({ holidays: data.holidays, companyHolidays: [{ kind: 'yearly', start: '12-30', end: '01-03' }], entries })
  expect(longBreakOf(cal, q4)).toEqual({ start: '2026-12-26', end: '2027-01-03', days: 9 })
  expect(longBreakOf(cal, q1)).toBeNull()
})
test('R-14: 複数あれば最も長いもの、同じ長さなら早いもの', () => {
  const [q4] = planningQuarters('2026-11-15')
  const once = (start: string, end: string) => ({ kind: 'once', start, end }) as const
  const noHolidays = {}
  // 2026-10-10(土)〜10-14 の 5 連休（土日 + 月火水）と、11-07(土)〜11-10 の 4 連休
  const same = buildRestCalendar({ holidays: noHolidays, companyHolidays: [once('2026-10-12', '2026-10-14'), once('2026-11-09', '2026-11-10')], entries: [] })
  expect(longBreakOf(same, q4)).toEqual({ start: '2026-10-10', end: '2026-10-14', days: 5 })
  // 同じ 5 日が 2 つなら早いほう
  const tie = buildRestCalendar({ holidays: noHolidays, companyHolidays: [once('2026-10-12', '2026-10-14'), once('2026-11-09', '2026-11-11')], entries: [] })
  expect(longBreakOf(tie, q4)).toEqual({ start: '2026-10-10', end: '2026-10-14', days: 5 })
  // 後ろのほうが長ければそちら
  const longer = buildRestCalendar({ holidays: noHolidays, companyHolidays: [once('2026-10-12', '2026-10-14'), once('2026-11-09', '2026-11-12')], entries: [] })
  expect(longBreakOf(longer, q4)).toEqual({ start: '2026-11-07', end: '2026-11-12', days: 6 })
})
test('R-14: 連休がちょうど四半期の初日に始まるなら、その四半期の長めの休暇になる（前の四半期には入らない）', () => {
  // 2027-01-01 は金曜。1/1（金）〜1/5（火）を会社の休日にすると、前日の 12/31（木）と翌日の 1/6（水）は平日で、5 連休になる
  const [q4, q1] = planningQuarters('2026-11-15')
  const cal = buildRestCalendar({ holidays: {}, companyHolidays: [{ kind: 'once', start: '2027-01-01', end: '2027-01-05' }], entries: [] })
  expect(longBreakOf(cal, q1)).toEqual({ start: '2027-01-01', end: '2027-01-05', days: 5 })
  expect(longBreakOf(cal, q4)).toBeNull()
})

test('R-10: shift が −1 なら 1 四半期ぶん前から 4 つ', () => {
  const qs = planningQuarters('2026-11-15', -1)
  expect(qs).toHaveLength(4)
  expect(qs[0]).toEqual({ start: '2026-07-01', end: '2026-09-30', label: '2026年 7〜9月' })
})

/** 隣り合う四半期のあいだに抜けが無い（前の end の翌日が次の start） */
const expectContiguous = (qs: readonly { start: string; end: string }[]) => {
  for (let i = 1; i < qs.length; i++) expect(qs[i].start).toBe(addDays(qs[i - 1].end, 1))
}
test('F-508・§4: shift の位置から今日の四半期の 3 つ先までを、抜けなく早い順に返す', () => {
  const zero = quartersBetween('2026-11-15', 0)
  expect(zero).toEqual(planningQuarters('2026-11-15'))
  const one = quartersBetween('2026-11-15', -1)
  expect(one).toHaveLength(5)
  expect(one[0].start).toBe('2026-07-01')
  expect(one.at(-1)?.start).toBe('2027-07-01')
  expectContiguous(one)
  const five = quartersBetween('2026-11-15', -5)
  expect(five).toHaveLength(9)
  expect(five[0]).toEqual({ start: '2025-07-01', end: '2025-09-30', label: '2025年 7〜9月' })
  expect(five.at(-1)).toEqual({ start: '2027-07-01', end: '2027-09-30', label: '2027年 7〜9月' })
  expect(five.map((q) => q.start)).toContain('2026-07-01')
  expectContiguous(five)
})
test('F-508: 年をまたいでさかのぼる（1〜3 月から 2 つ前）', () => {
  const qs = quartersBetween('2026-02-10', -2)
  expect(qs.map((q) => q.label)).toEqual([
    '2025年 7〜9月',
    '2025年 10〜12月',
    '2026年 1〜3月',
    '2026年 4〜6月',
    '2026年 7〜9月',
    '2026年 10〜12月',
  ])
  expectContiguous(qs)
})
test('§3.4・§4: 見えている最初の四半期より前に日程があるときだけ、前へ動ける', () => {
  const [first] = quartersBetween('2026-11-15', 0)
  expect(hasDatesBefore(['2026-09-30', '2026-12-01'], first)).toBe(true)
  expect(hasDatesBefore(['2026-10-01', '2026-12-01'], first)).toBe(false)
  expect(hasDatesBefore([], first)).toBe(false)
  const [earlier] = quartersBetween('2026-11-15', -1)
  expect(hasDatesBefore(['2026-09-30'], earlier)).toBe(false)
})
