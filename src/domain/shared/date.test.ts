import { describe, expect, test } from 'vitest'
import { addDays, diffDays, eachDay, isValidIsoDate, monthEnd, monthStart, quarterEnd, quarterStart, todayInJapan, untilNextDayInJapan, weekday } from './date'

describe('日付の道具（N-07）', () => {
  test('月末と年末をまたいで加算できる', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })
  test('曜日は 0 が日曜', () => {
    expect(weekday('2026-11-03')).toBe(2) // 文化の日は火曜
    expect(weekday('2027-01-01')).toBe(5)
  })
  test('日数の差と日の列挙', () => {
    expect(diffDays('2026-12-26', '2027-01-03')).toBe(8)
    expect(eachDay('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'])
  })
  test('月と四半期の端', () => {
    expect(monthEnd('2027-02-10')).toBe('2027-02-28')
    expect(quarterStart('2026-11-15')).toBe('2026-10-01')
    expect(quarterEnd('2026-11-15')).toBe('2026-12-31')
  })
  test('月の初日（N-07）', () => {
    expect(monthStart('2027-02-10')).toBe('2027-02-01')
  })
  test('存在しない日付をはじく', () => {
    expect(isValidIsoDate('2027-02-29')).toBe(false)
    expect(isValidIsoDate('2027-2-9')).toBe(false)
    expect(isValidIsoDate('2028-02-29')).toBe(true)
  })
  test('Review Focus 1: 今日は端末のタイムゾーンによらず日本の暦日', () => {
    expect(todayInJapan(new Date('2026-12-31T14:59:59Z'))).toBe('2026-12-31')
    expect(todayInJapan(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01')
  })
  test('N-07: 次の日本時間 0 時までのミリ秒', () => {
    expect(untilNextDayInJapan(new Date('2026-12-31T14:59:59Z'))).toBe(1000)
    expect(untilNextDayInJapan(new Date('2026-12-31T15:00:00Z'))).toBe(86_400_000)
    expect(untilNextDayInJapan(new Date('2026-12-31T03:00:00Z'))).toBe(12 * 3_600_000)
  })
})
