import { type IsoDate, isValidIsoDate } from '../shared/date'
import type { Result } from '../shared/result'

export type HolidayData = Readonly<{
  updatedAt: IsoDate
  confirmedUntil: IsoDate
  holidays: Readonly<Record<IsoDate, string>>
}>

const CSV_DATE = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/

/** 内閣府の祝日 CSV（UTF-8 に直したあと）を読む。1 行でも読めなければ失敗（R-16） */
export function parseHolidayCsv(text: string): Result<Record<IsoDate, string>> {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .slice(1) // 1 行目は見出し
    .filter((line) => line.trim() !== '')
  const holidays: Record<IsoDate, string> = {}
  for (const line of lines) {
    const cols = line.split(',')
    const m = cols.length === 2 ? CSV_DATE.exec(cols[0].trim()) : null
    if (!m) return { ok: false, reason: `読めない行があります: ${line}` }
    const date = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
    if (!isValidIsoDate(date)) return { ok: false, reason: `日付の形が違う行があります: ${line}` }
    holidays[date] = cols[1].trim()
  }
  if (Object.keys(holidays).length === 0) return { ok: false, reason: '祝日が 1 件も読めませんでした' }
  return { ok: true, value: holidays }
}

/** 既存データと取り込んだ祝日を突き合わせ、反映してよければ新しい HolidayData を返す（R-16） */
export function mergeHolidayData(
  prev: HolidayData | null,
  next: Record<IsoDate, string>,
  today: IsoDate,
): Result<HolidayData> {
  const dates = Object.keys(next).sort()
  if (dates.length === 0) return { ok: false, reason: '祝日が 1 件も読めませんでした' }

  if (prev) {
    const prevDates = Object.keys(prev.holidays)
    const lost = prevDates.find((d) => d < today && !(d in next))
    if (lost) return { ok: false, reason: `過去の祝日が消えています: ${lost}` }
    if (dates.length < prevDates.length * 0.9) {
      return { ok: false, reason: `件数が既存の 9 割未満です（${dates.length} 件 / 既存 ${prevDates.length} 件）` }
    }
  }

  const holidays = Object.fromEntries(dates.map((d) => [d, next[d]]))
  const unchanged =
    prev !== null &&
    Object.keys(prev.holidays).length === dates.length &&
    dates.every((d) => prev.holidays[d] === next[d])

  return {
    ok: true,
    value: {
      updatedAt: unchanged ? prev.updatedAt : today,
      confirmedUntil: `${dates[dates.length - 1].slice(0, 4)}-12-31`,
      holidays,
    },
  }
}
