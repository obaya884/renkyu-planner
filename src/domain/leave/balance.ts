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

function previousStart(start: IsoDate): IsoDate {
  return `${String(Number(start.slice(0, 4)) - 1).padStart(4, '0')}${start.slice(4)}`
}

/** その付与年の付与日数。設定が無ければ直前の付与年の値、それも無ければ 0（R-13） */
export function grantDaysOf(settings: Settings, grantYearStart: IsoDate): number {
  return (settings.grantYears[grantYearStart] ?? settings.grantYears[previousStart(grantYearStart)])?.grantDays ?? 0
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

  const current = settings.grantYears[grantYearStart]
  if (current) return withEntitlement(input, grantDay, current.grantDays * work + current.carryOverMinutes)

  // この付与年の設定が無いときは、直前の 1 年だけさかのぼる
  const prevStart = previousStart(grantYearStart)
  const prev = settings.grantYears[prevStart]
  if (!prev) return withEntitlement(input, grantDay, 0)
  const prevBalance = withEntitlement({ ...input, grantYearStart: prevStart }, grantDay, prev.grantDays * work + prev.carryOverMinutes)
  return withEntitlement(input, grantDay, prev.grantDays * work + Math.max(0, prevBalance.unassigned))
}
