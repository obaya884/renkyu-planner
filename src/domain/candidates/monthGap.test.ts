import { expect, test } from 'vitest'
import data from '@/data/holidays.json'
import { buildRestCalendar } from '@/domain/calendar/restDays'
import { monthGaps } from './monthGap'

const cal = buildRestCalendar({ holidays: data.holidays, companyHolidays: [], entries: [] })
const base = { cal, entries: [], today: '2027-04-01', confirmedUntil: '2027-12-31' }

test('F-205・R-8: 平日に祝日のない月（2027 年 6 月）に、金曜と月曜を選択肢として出す', () => {
  const gaps = monthGaps({ ...base, start: '2027-04-01', end: '2027-06-30' })
  expect(gaps.map((g) => g.month)).toEqual(['2027-06-01'])
  expect(gaps[0].options).toEqual(['2027-06-04', '2027-06-07', '2027-06-11', '2027-06-14', '2027-06-18', '2027-06-21', '2027-06-25', '2027-06-28'])
  expect(gaps[0].unconfirmed).toBe(false)
})
test('R-8: その月に 1 日分の日程があれば出さない', () => {
  const entry = { id: 'a', date: '2027-06-18', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '' } as const
  expect(monthGaps({ ...base, entries: [entry], start: '2027-06-01', end: '2027-06-30' })).toEqual([])
})
test('R-9: 月の末日が確定期限より後なら未確定', () => {
  const gaps = monthGaps({ ...base, today: '2028-01-01', start: '2028-06-01', end: '2028-06-30' })
  expect(gaps[0]?.unconfirmed).toBe(true)
})
test('R-8: 月の末日が今日より前の月には出さない。今日より前の日は選択肢にしない', () => {
  expect(monthGaps({ ...base, today: '2027-07-01', start: '2027-06-01', end: '2027-06-30' })).toEqual([])
  const gaps = monthGaps({ ...base, today: '2027-06-15', start: '2027-06-01', end: '2027-06-30' })
  expect(gaps[0].options).toEqual(['2027-06-18', '2027-06-21', '2027-06-25', '2027-06-28'])
})
test('R-8: 会社の休日が平日にある月には出さない', () => {
  const company = buildRestCalendar({ holidays: data.holidays, companyHolidays: [{ kind: 'once', start: '2027-06-10', end: '2027-06-10' }], entries: [] })
  expect(monthGaps({ ...base, cal: company, start: '2027-06-01', end: '2027-06-30' })).toEqual([])
})
test('F-205: 日程のある日は選択肢にしない（半日などの日程でも）', () => {
  const entry = { id: 'a', date: '2027-06-04', leaveTypeId: 'paid', amount: { unit: 'half' }, title: '' } as const
  const gaps = monthGaps({ ...base, entries: [entry], start: '2027-06-01', end: '2027-06-30' })
  expect(gaps[0].options).not.toContain('2027-06-04')
})
test('R-8: 選べる日が 1 つもない月には出さない', () => {
  // 2027-06-29（火）。6 月の最後の月曜は 28 日なので、今日以降に金曜も月曜も残らない
  expect(monthGaps({ ...base, today: '2027-06-29', start: '2027-06-01', end: '2027-06-30' })).toEqual([])
})
