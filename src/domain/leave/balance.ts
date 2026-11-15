import { grantYearOf, grantYearStartOf } from './grantYear'
import { toMinutes } from './amount'
import { isTaken } from './taken'
import { type Entry, PAID_LEAVE_TYPE_ID, type Settings } from '@/domain/types'
import type { IsoDate, MonthDay } from '@/domain/shared/date'

export type Balance = Readonly<{
  entitlement: number
  taken: number
  planned: number
  remaining: number
  unassigned: number
}>

/** 取得済みと予定（分） */
export type Usage = Readonly<{ taken: number; planned: number }>

/**
 * R-13: 休暇の種類の id ごと・その種類の付与年の開始日ごとの、取得済みと予定（分）。日程を 1 度だけなめて作る（usageTableOf）。
 * 組み立て 1 回のあいだ、同じ settings と entries から作った表を、balanceOf と carryOverOf に渡して使い回す
 */
export type UsageTable = ReadonlyMap<string, ReadonlyMap<IsoDate, Usage>>

type Input = Readonly<{
  settings: Settings
  entries: readonly Entry[]
  leaveTypeId: string
  /** その種類の付与年（grantYearOfType）の開始日 */
  grantYearStart: IsoDate
  /** 今日。取得済みか予定かを決める（R-13） */
  today: IsoDate
  /** settings と entries と today から作った表（usageTableOf）。無ければ entries を数える。値は同じになる */
  usage?: UsageTable
}>

/**
 * R-13・§2: その休暇の種類の付与される日。有休の付与日が未設定なら null。
 * 有休か、種類の grantDay が null なら有休の付与日。それ以外はその種類の grantDay
 */
export function grantDayOf(settings: Settings, leaveTypeId: string): MonthDay | null {
  if (settings.grantDay === null) return null
  if (leaveTypeId === PAID_LEAVE_TYPE_ID) return settings.grantDay
  return settings.leaveTypes.find((t) => t.id === leaveTypeId)?.grantDay ?? settings.grantDay
}

/** R-12・R-13: d が入る、その休暇の種類の付与年。有休の付与日が未設定なら null */
export function grantYearOfType(settings: Settings, leaveTypeId: string, d: IsoDate): { start: IsoDate; end: IsoDate } | null {
  const grantDay = grantDayOf(settings, leaveTypeId)
  return grantDay === null ? null : grantYearOf(d, grantDay)
}

function shiftYear(start: IsoDate, years: number): IsoDate {
  return `${String(Number(start.slice(0, 4)) + years).padStart(4, '0')}${start.slice(4)}`
}

/** 並べたキーのうち grantYearStart 以前でいちばん近いものの付与日数。無ければ 0 */
function grantDaysFrom(settings: Settings, sortedKeys: readonly IsoDate[], grantYearStart: IsoDate): number {
  let key: IsoDate | undefined
  for (const k of sortedKeys) {
    if (k > grantYearStart) break
    key = k
  }
  return key === undefined ? 0 : settings.grantYears[key].grantDays
}

/** その付与年の付与日数。設定が無ければ、それより前でいちばん近い付与年の値、それも無ければ 0（R-13） */
export function grantDaysOf(settings: Settings, grantYearStart: IsoDate): number {
  return grantDaysFrom(settings, Object.keys(settings.grantYears).sort(), grantYearStart)
}

/**
 * R-13: 日程を 1 度だけなめて、休暇の種類ごと・付与年ごとの取得済みと予定を足した表。有休の付与日が未設定なら空。
 * 足す順は日程の並びのまま（withEntitlement が数える順と同じなので、同じ値になる）
 */
export function usageTableOf(settings: Settings, entries: readonly Entry[], today: IsoDate): UsageTable {
  return addToTable(new Map(), settings, entries, today)
}

/** table に entries を足した新しい表（table は変えない）。日程を足したと仮定するとき（previewAdd）に使う */
export function withAddedUsage(table: UsageTable, settings: Settings, entries: readonly Entry[], today: IsoDate): UsageTable {
  const copy = new Map<string, Map<IsoDate, Usage>>()
  for (const [id, years] of table) copy.set(id, new Map(years))
  return addToTable(copy, settings, entries, today)
}

function addToTable(table: Map<string, Map<IsoDate, Usage>>, settings: Settings, entries: readonly Entry[], today: IsoDate): UsageTable {
  const grantDays = new Map<string, MonthDay | null>()
  for (const entry of entries) {
    let grantDay = grantDays.get(entry.leaveTypeId)
    if (grantDay === undefined) {
      grantDay = grantDayOf(settings, entry.leaveTypeId)
      grantDays.set(entry.leaveTypeId, grantDay)
    }
    if (grantDay === null) continue
    const start = grantYearStartOf(entry.date, grantDay)
    const years = table.get(entry.leaveTypeId) ?? new Map<IsoDate, Usage>()
    table.set(entry.leaveTypeId, years)
    const u = years.get(start) ?? { taken: 0, planned: 0 }
    const minutes = toMinutes(entry.amount, settings.workMinutes)
    years.set(start, isTaken(entry, today) ? { taken: u.taken + minutes, planned: u.planned } : { taken: u.taken, planned: u.planned + minutes })
  }
  return table
}

/** 持ち分が決まっているときの、取得済み・予定・残り・未割り当て（R-13） */
function withEntitlement(input: Input, grantDay: MonthDay, entitlement: number): Balance {
  const { settings, entries, leaveTypeId, grantYearStart, usage, today } = input
  let taken = 0
  let planned = 0
  // 開始日が付与日に合うなら、数える範囲は付与年そのものなので、表の値と同じになる
  if (usage !== undefined && grantYearStartOf(grantYearStart, grantDay) === grantYearStart) {
    const u = usage.get(leaveTypeId)?.get(grantYearStart)
    taken = u?.taken ?? 0
    planned = u?.planned ?? 0
  } else {
    const { end } = grantYearOf(grantYearStart, grantDay)
    for (const entry of entries) {
      if (entry.leaveTypeId !== leaveTypeId) continue
      if (entry.date < grantYearStart || entry.date > end) continue
      const minutes = toMinutes(entry.amount, settings.workMinutes)
      if (isTaken(entry, today)) taken += minutes
      else planned += minutes
    }
  }
  const remaining = entitlement - taken
  return { entitlement, taken, planned, remaining, unassigned: remaining - planned }
}

/** 繰り越しを数える年数の上限。保存データに遠い年のキーがあっても固まらないようにする（R-13・§5.1） */
const MAX_YEARS = 100

/** 繰り越しが決まっているときの、有休の持ち分（R-13）。上書きがあればその値。grantDays はその付与年の付与日数 */
function paidEntitlement(settings: Settings, grantYearStart: IsoDate, grantDays: number, carryOver: number): number {
  const override = settings.grantYears[grantYearStart]?.entitlementMinutes ?? null
  return override ?? grantDays * settings.workMinutes + carryOver
}

/**
 * R-13・F-405: 有休の付与年の繰り越し（分）。設定のあるいちばん古い付与年と、それより前は 0。
 * 後の年は、直前の付与年の未割り当て（0 未満なら 0）と、直前の付与年の付与日数の分の、小さいほう。
 * いちばん古い付与年から順に計算する。付与日が未設定なら 0
 */
export function carryOverOf(input: Readonly<{ settings: Settings; entries: readonly Entry[]; grantYearStart: IsoDate; today: IsoDate; usage?: UsageTable }>): number {
  const { settings, entries, grantYearStart, today } = input
  const grantDay = settings.grantDay
  if (grantDay === null) return 0
  const keys = Object.keys(settings.grantYears).sort()
  const earliest = keys[0]
  if (earliest === undefined || grantYearStart <= earliest) return 0
  const years = Number(grantYearStart.slice(0, 4)) - Number(earliest.slice(0, 4))
  if (years >= MAX_YEARS) return 0

  // 直前の付与年をたどって、いちばん古い付与年以前に届くまでの開始日を、古い順に並べる
  const chain: IsoDate[] = []
  for (let s = grantYearStart; s > earliest; s = shiftYear(s, -1)) chain.unshift(s)
  const work = settings.workMinutes
  // 年ごとに日程の全件を数え直さないよう、表が渡されていなければ、ここで 1 度だけ作る
  const usage = input.usage ?? usageTableOf(settings, entries, today)
  let carryOver = 0 // chain[0] の直前の付与年（いちばん古い付与年以前）の繰り越し
  for (const start of chain) {
    const prevStart = shiftYear(start, -1)
    const grantDays = grantDaysFrom(settings, keys, prevStart)
    const prev = withEntitlement(
      { settings, entries, leaveTypeId: PAID_LEAVE_TYPE_ID, grantYearStart: prevStart, today, usage },
      grantDay,
      paidEntitlement(settings, prevStart, grantDays, carryOver),
    )
    carryOver = Math.min(Math.max(0, prev.unassigned), grantDays * work)
  }
  return carryOver
}

/**
 * R-13・F-405: 休暇の種類と付与年ごとの持ち分と、取得済み・予定・残り・未割り当て。有休の付与日が未設定なら null。
 * `grantYearStart` には、その種類の付与年（grantYearOfType）の開始日を渡す
 */
export function balanceOf(input: Input): Balance | null {
  const { settings, leaveTypeId, grantYearStart } = input
  const grantDay = grantDayOf(settings, leaveTypeId)
  if (grantDay === null) return null
  const work = settings.workMinutes

  if (leaveTypeId !== PAID_LEAVE_TYPE_ID) {
    const type = settings.leaveTypes.find((t) => t.id === leaveTypeId)
    return withEntitlement(input, grantDay, type ? type.days * work : 0)
  }

  const carryOver = carryOverOf({ settings, entries: input.entries, grantYearStart, today: input.today, usage: input.usage })
  return withEntitlement(input, grantDay, paidEntitlement(settings, grantYearStart, grantDaysOf(settings, grantYearStart), carryOver))
}
