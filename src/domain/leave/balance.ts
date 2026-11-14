import { grantYearOf } from './grantYear'
import { toMinutes } from './amount'
import type { Entry, Settings } from '@/domain/types'
import type { IsoDate } from '@/domain/shared/date'

export type Balance = Readonly<{
  entitlement: number
  taken: number
  planned: number
  remaining: number
  unassigned: number
}>

type Input = Readonly<{
  settings: Settings
  entries: readonly Entry[]
  leaveTypeId: string
  grantYearStart: IsoDate
}>

function shiftYear(start: IsoDate, years: number): IsoDate {
  return `${String(Number(start.slice(0, 4)) + years).padStart(4, '0')}${start.slice(4)}`
}

/** 設定のあるいちばん古い付与年の開始日。設定が 1 つも無ければ null */
function earliestStart(settings: Settings): IsoDate | null {
  const keys = Object.keys(settings.grantYears).sort()
  return keys[0] ?? null
}

/** その付与年の付与日数。設定が無ければ、それより前でいちばん近い付与年の値、それも無ければ 0（R-13） */
export function grantDaysOf(settings: Settings, grantYearStart: IsoDate): number {
  const key = Object.keys(settings.grantYears)
    .filter((k) => k <= grantYearStart)
    .sort()
    .at(-1)
  return key === undefined ? 0 : settings.grantYears[key].grantDays
}

/** 持ち分が決まっているときの、取得済み・予定・残り・未割り当て（R-13） */
function withEntitlement(input: Input, grantDay: string, entitlement: number): Balance {
  const { settings, entries, leaveTypeId, grantYearStart } = input
  const { end } = grantYearOf(grantYearStart, grantDay)
  let taken = 0
  let planned = 0
  for (const entry of entries) {
    if (entry.leaveTypeId !== leaveTypeId) continue
    if (entry.date < grantYearStart || entry.date > end) continue
    const minutes = toMinutes(entry.amount, settings.workMinutes)
    if (entry.done) taken += minutes
    else planned += minutes
  }
  const remaining = entitlement - taken
  return { entitlement, taken, planned, remaining, unassigned: remaining - planned }
}

/** 繰り越しを数える年数の上限。保存データに遠い年のキーがあっても固まらないようにする（R-13・§5.1） */
const MAX_YEARS = 100

/** 繰り越しが決まっているときの、有休の持ち分（R-13）。上書きがあればその値 */
function paidEntitlement(settings: Settings, grantYearStart: IsoDate, carryOver: number): number {
  const override = settings.grantYears[grantYearStart]?.entitlementMinutes ?? null
  return override ?? grantDaysOf(settings, grantYearStart) * settings.workMinutes + carryOver
}

/**
 * R-13・F-405: 有休の付与年の繰り越し（分）。設定のあるいちばん古い付与年と、それより前は 0。
 * 後の年は、直前の付与年の未割り当て（0 未満なら 0）と、直前の付与年の付与日数の分の、小さいほう。
 * いちばん古い付与年から順に計算する。付与日が未設定なら 0
 */
export function carryOverOf(input: Readonly<{ settings: Settings; entries: readonly Entry[]; grantYearStart: IsoDate }>): number {
  const { settings, entries, grantYearStart } = input
  const grantDay = settings.grantDay
  if (grantDay === null) return 0
  const earliest = earliestStart(settings)
  if (earliest === null || grantYearStart <= earliest) return 0
  const years = Number(grantYearStart.slice(0, 4)) - Number(earliest.slice(0, 4))
  if (years >= MAX_YEARS) return 0

  // 直前の付与年をたどって、いちばん古い付与年以前に届くまでの開始日を、古い順に並べる
  const chain: IsoDate[] = []
  for (let s = grantYearStart; s > earliest; s = shiftYear(s, -1)) chain.unshift(s)
  const work = settings.workMinutes
  let carryOver = 0 // chain[0] の直前の付与年（いちばん古い付与年以前）の繰り越し
  for (const start of chain) {
    const prevStart = shiftYear(start, -1)
    const prev = withEntitlement(
      { settings, entries, leaveTypeId: 'paid', grantYearStart: prevStart },
      grantDay,
      paidEntitlement(settings, prevStart, carryOver),
    )
    carryOver = Math.min(Math.max(0, prev.unassigned), grantDaysOf(settings, prevStart) * work)
  }
  return carryOver
}

/** R-13・F-405: 休暇の種類と付与年ごとの持ち分と、取得済み・予定・残り・未割り当て。付与日が未設定なら null */
export function balanceOf(input: Input): Balance | null {
  const { settings, leaveTypeId, grantYearStart } = input
  const grantDay = settings.grantDay
  if (grantDay === null) return null
  const work = settings.workMinutes

  if (leaveTypeId !== 'paid') {
    const type = settings.leaveTypes.find((t) => t.id === leaveTypeId)
    return withEntitlement(input, grantDay, type ? type.days * work : 0)
  }

  return withEntitlement(input, grantDay, paidEntitlement(settings, grantYearStart, carryOverOf({ settings, entries: input.entries, grantYearStart })))
}
