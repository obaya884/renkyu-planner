import type { IsoDate, MonthDay } from './shared/date'

export type CompanyHoliday = Readonly<
  { kind: 'yearly'; start: MonthDay; end: MonthDay } | { kind: 'once'; start: IsoDate; end: IsoDate }
>

export type Amount = Readonly<{ unit: 'day' } | { unit: 'half' } | { unit: 'minutes'; minutes: number }>

export type Entry = Readonly<{
  id: string
  date: IsoDate
  leaveTypeId: string
  amount: Amount
  title: string
  done: boolean
}>

/** 有休の休暇の種類の `id` */
export const PAID_LEAVE_TYPE_ID = 'paid'

/**
 * 有休の `id` は PAID_LEAVE_TYPE_ID。有休の `days` は使わず、付与年ごとの値（GrantYearSetting）を使う。
 * `grantDay` は付与される日（R-13）。null は有休の付与日と同じ。有休自身はいつも null。
 * `together` はまとめて取る休暇の印（F-104）
 */
export type LeaveType = Readonly<{
  id: string
  name: string
  days: number
  usable: { start: MonthDay; end: MonthDay } | null
  grantDay: MonthDay | null
  together: boolean
}>

/** `entitlementMinutes` は持ち分の上書き（分）。null は計算に任せる（R-13） */
export type GrantYearSetting = Readonly<{ grantDays: number; entitlementMinutes: number | null }>

/** 月カレンダーの週の始まり（F-108） */
export type WeekStart = 'monday' | 'sunday'

/** `grantYears` のキーは付与年の開始日 */
export type Settings = Readonly<{
  workMinutes: number
  grantDay: MonthDay | null
  grantYears: Readonly<Record<IsoDate, GrantYearSetting>>
  companyHolidays: readonly CompanyHoliday[]
  leaveTypes: readonly LeaveType[]
  weekStart: WeekStart
}>

export const DEFAULT_SETTINGS: Settings = {
  workMinutes: 480,
  grantDay: null,
  grantYears: {},
  companyHolidays: [],
  leaveTypes: [{ id: PAID_LEAVE_TYPE_ID, name: '有休', days: 0, usable: null, grantDay: null, together: false }],
  weekStart: 'monday',
}
