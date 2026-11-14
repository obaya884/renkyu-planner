import { describe, expect, test } from 'vitest'
import { mergeHolidayData, parseHolidayCsv } from './importCsv'

const CSV = ['国民の祝日・休日月日,国民の祝日・休日名称', '2026/11/3,文化の日', '2026/11/23,勤労感謝の日', '2027/1/1,元日', '2027/11/23,勤労感謝の日', ''].join('\r\n')

describe('祝日の取り込み（F-601・F-603・F-604、R-16）', () => {
  test('内閣府の CSV（YYYY/M/D、ゼロ埋めなし）を読む', () => {
    const r = parseHolidayCsv(CSV)
    expect(r).toEqual({ ok: true, value: { '2026-11-03': '文化の日', '2026-11-23': '勤労感謝の日', '2027-01-01': '元日', '2027-11-23': '勤労感謝の日' } })
  })
  test('確定期限は最後の祝日の年の 12 月 31 日。初回は今日を更新日にする', () => {
    const parsed = parseHolidayCsv(CSV)
    if (!parsed.ok) throw new Error('parse')
    const r = mergeHolidayData(null, parsed.value, '2026-11-15')
    expect(r.ok && r.value.confirmedUntil).toBe('2027-12-31')
    expect(r.ok && r.value.updatedAt).toBe('2026-11-15')
  })
  test('F-605: 内容が同じなら更新日を変えない。変われば今日にする', () => {
    const prev = { updatedAt: '2026-02-03', confirmedUntil: '2027-12-31', holidays: { '2026-11-03': '文化の日', '2027-01-01': '元日' } }
    const same = mergeHolidayData(prev, { ...prev.holidays }, '2026-12-01')
    expect(same.ok && same.value.updatedAt).toBe('2026-02-03')
    const added = mergeHolidayData(prev, { ...prev.holidays, '2028-01-01': '元日' }, '2027-02-05')
    expect(added.ok && added.value).toMatchObject({ updatedAt: '2027-02-05', confirmedUntil: '2028-12-31' })
  })
  test('Review Focus 5: 空・エラーページ・日付の形が違う行は失敗にする', () => {
    expect(parseHolidayCsv('').ok).toBe(false)
    expect(parseHolidayCsv('<html><body>503 Service Unavailable</body></html>').ok).toBe(false)
    expect(parseHolidayCsv('header,header\r\n2026/13/40,うその日').ok).toBe(false)
  })
  test('Review Focus 5: 過去の祝日が消えた・件数が 9 割未満なら反映しない', () => {
    const holidays = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`2026-01-${String(i + 1).padStart(2, '0')}`, '祝']))
    const prev = { updatedAt: '2026-02-03', confirmedUntil: '2026-12-31', holidays }
    const { ['2026-01-05']: _gone, ...lostOne } = holidays
    expect(mergeHolidayData(prev, lostOne, '2026-11-15').ok).toBe(false)
    const few = Object.fromEntries(Object.entries(holidays).slice(0, 17))
    expect(mergeHolidayData(prev, few, '2025-12-01').ok).toBe(false)
  })
  test('R-16: 祝日が 1 件もない表は反映しない', () => {
    expect(mergeHolidayData(null, {}, '2026-11-15').ok).toBe(false)
  })
})
