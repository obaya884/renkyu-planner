import { carryOverOf } from '../leave/balance'
import { type IsoDate, monthEnd } from '../shared/date'
import type { PlannerInput } from '../view/input'

/** §5.3 の開き方。初めての入力、次の付与年、始まった付与年 */
export type GrantSheetMode = 'first' | 'next' | 'started'

/** §5.3: 付与年の指定が無ければ初めての入力。指定した付与年が今日までに始まっていれば started、まだなら next */
export function grantSheetMode(input: PlannerInput, grantYearStart: IsoDate | null): GrantSheetMode {
  if (grantYearStart === null) return 'first'
  return grantYearStart <= input.today ? 'started' : 'next'
}

/** R-12・§5.3: 付与日の「日」の選択肢。選んだ月の末日まで。2 月は 28 まで（2 月 29 日は付与日にできない） */
export function grantDayChoices(month: number): readonly number[] {
  // うるう年でない 2001 年の月末で数える
  const last = Number(monthEnd(`2001-${String(month).padStart(2, '0')}-01`).slice(8, 10))
  return Array.from({ length: last }, (_, i) => i + 1)
}

/** §5.3: 月を変えて、選んでいた日がその月に無くなったときは、その月の末日に直す */
export function clampGrantDay(month: number, day: number): number {
  return Math.min(day, grantDayChoices(month).length)
}

/** §5.3: 日と時間の欄から分に直す */
export function joinDaysHours(days: number, hours: number, workMinutes: number): number {
  return days * workMinutes + hours * 60
}

/** §5.3: 日と時間の欄の文字から分に直す。日の欄が空なら NaN（保存できない）。時間の欄が空なら 0 時間 */
export function enteredEntitlement(days: string, hours: string, workMinutes: number): number {
  if (days === '') return Number.NaN
  return joinDaysHours(Number(days), hours === '' ? 0 : Number(hours), workMinutes)
}

/** §5.3: 分を日と時間の欄に分ける。時間に満たない端数（分）は切り捨てて見せる */
export function splitDaysHours(minutes: number, workMinutes: number): { days: number; hours: number } {
  const days = Math.floor(minutes / workMinutes)
  return { days, hours: Math.floor((minutes - days * workMinutes) / 60) }
}

/** §5.3・R-13: そのモーダルの付与日数で計算し直した持ち分（付与日数 × 所定労働時間 + 繰り越し） */
export function computedEntitlement(input: PlannerInput, grantYearStart: IsoDate, grantDays: number): number {
  const { settings, entries } = input
  return grantDays * settings.workMinutes + carryOverOf({ settings, entries, grantYearStart })
}

/** §5.3: 「この年に使える日数」を触らなかったときは、すでにある上書きを保つ（無ければ null）。触って、計算した値と同じにしたときは、上書きを持たない（null） */
export function entitlementToSave(touched: boolean, enteredMinutes: number, computedMinutes: number, existing: number | null): number | null {
  if (!touched) return existing
  return enteredMinutes === computedMinutes ? null : enteredMinutes
}
