import { checkLeaveTypeDraft, withHolidayName } from '@/domain/entries/settingsInput'
import { isValidCompanyHoliday } from '@/domain/calendar/companyHoliday'
import { isValidGrantDay } from '@/domain/leave/grantYear'
import { isValidIsoDate } from '@/domain/shared/date'
import type { MonthDay } from '@/domain/shared/date'
import type { Result } from '@/domain/shared/result'
import { DEFAULT_SETTINGS, PAID_LEAVE_TYPE_ID } from '@/domain/types'
import type { Amount, CompanyHoliday, Entry, GrantYearSetting, LeaveType, Settings, WeekStart } from '@/domain/types'
import { STORAGE_LIMITS, isValidId } from './limits'

export const STORAGE_KEY = 'renkyu-planner'
export const UNREADABLE_KEY = 'renkyu-planner:unreadable'
export const STORAGE_VERSION = 1

export type StoredData = Readonly<{ version: 1; settings: Settings; entries: readonly Entry[] }>

export const EMPTY_STORED: StoredData = { version: STORAGE_VERSION, settings: DEFAULT_SETTINGS, entries: [] }

export function serializeStored(data: StoredData): string {
  return JSON.stringify(data)
}

/** D-3、D-4。読めなければ失敗とし、成功したときは知らない項目を落とした新しいオブジェクトを返す */
export function parseStored(text: string): Result<StoredData> {
  try {
    return { ok: true, value: readStored(JSON.parse(text)) }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : '読み取れない記録です' }
  }
}

/** D-3。新しい版が書いた記録（`version` が整数で、STORAGE_VERSION より大きい）か。読めない記録のうち、上書きしてはならないものを見分ける */
export function isNewerVersion(text: string): boolean {
  try {
    const v: unknown = JSON.parse(text)
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
    const version = (v as Readonly<Record<string, unknown>>).version
    return typeof version === 'number' && Number.isInteger(version) && version > STORAGE_VERSION
  } catch {
    return false
  }
}

// 以下は、合わないときに理由つきで例外を投げる。parseStored だけが受け止める

function fail(what: string): never {
  throw new Error(`${what}が合いません`)
}

type Obj = Readonly<Record<string, unknown>>

function obj(v: unknown, what: string): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(what)
  return v as Obj
}

/** D-10: 件数の上限は、中を読む前に確かめる */
function arr(v: unknown, what: string, max: number): readonly unknown[] {
  if (!Array.isArray(v)) fail(what)
  if (v.length > max) fail(`${what}の件数`)
  return v
}

function str(v: unknown, what: string): string {
  if (typeof v !== 'string') fail(what)
  return v
}

/** D-10: 名前の長さ（length）の上限 */
function text(v: unknown, what: string): string {
  const s = str(v, what)
  if (s.length > STORAGE_LIMITS.textLength) fail(`${what}の長さ`)
  return s
}

/** D-10: 日程と休暇の種類の id */
function id(v: unknown, what: string): string {
  const s = str(v, what)
  if (!isValidId(s)) fail(what)
  return s
}

function nonEmptyStr(v: unknown, what: string): string {
  const s = str(v, what)
  if (s === '') fail(what)
  return s
}

function bool(v: unknown, what: string): boolean {
  if (typeof v !== 'boolean') fail(what)
  return v
}

function num(v: unknown, what: string, min: number, max = Infinity, integer = false): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) {
    fail(what)
  }
  return v
}

/** 02-29 も実在する月日として扱う（うるう年の 2000 年で確かめる） */
function monthDay(v: unknown, what: string): MonthDay {
  const s = str(v, what)
  if (!/^\d{2}-\d{2}$/.test(s) || !isValidIsoDate(`2000-${s}`)) fail(what)
  return s
}

/** R-12 を満たす付与日 */
function grantDayValue(v: unknown, what: string): MonthDay {
  const md = monthDay(v, what)
  if (!isValidGrantDay(md)) fail(what)
  return md
}

function isoDate(v: unknown, what: string): string {
  const s = str(v, what)
  if (!isValidIsoDate(s)) fail(what)
  return s
}

/** id が重複しないことを確かめる */
function checkUniqueIds(ids: readonly string[], what: string): void {
  if (new Set(ids).size !== ids.length) fail(`${what}の id の重複`)
}

function readAmount(v: unknown): Amount {
  const o = obj(v, '日程の amount')
  if (o.unit === 'day') return { unit: 'day' }
  if (o.unit === 'half') return { unit: 'half' }
  if (o.unit === 'minutes') return { unit: 'minutes', minutes: num(o.minutes, '日程の minutes', 1, Infinity, true) }
  return fail('日程の amount.unit')
}

function readEntry(v: unknown): Entry {
  const o = obj(v, '日程')
  return {
    id: id(o.id, '日程の id'),
    date: isoDate(o.date, '日程の date'),
    leaveTypeId: nonEmptyStr(o.leaveTypeId, '日程の leaveTypeId'),
    amount: readAmount(o.amount),
    title: text(o.title, '日程の title'),
    done: bool(o.done, '日程の done'),
  }
}

function readLeaveType(v: unknown): LeaveType {
  const o = obj(v, '休暇の種類')
  let usable: LeaveType['usable'] = null
  if (o.usable !== null) {
    const u = obj(o.usable, '休暇の種類の usable')
    usable = { start: monthDay(u.start, 'usable の start'), end: monthDay(u.end, 'usable の end') }
  }
  const type: LeaveType = {
    id: id(o.id, '休暇の種類の id'),
    name: text(o.name, '休暇の種類の name'),
    days: num(o.days, '休暇の種類の days', 0),
    usable,
    // D-4: 項目が無い記録は null・false として読む
    grantDay: o.grantDay === undefined || o.grantDay === null ? null : grantDayValue(o.grantDay, '休暇の種類の grantDay'),
    together: o.together === undefined ? false : bool(o.together, '休暇の種類の together'),
  }
  // D-4: 有休でない休暇の種類は M-5（画面定義書 §5.5）と同じ決まり。有休はいまの決まりのまま読む
  if (type.id !== PAID_LEAVE_TYPE_ID && checkLeaveTypeDraft(type).length > 0) fail('休暇の種類')
  return type
}

function formOf(v: unknown, re: RegExp, what: string): string {
  const s = str(v, what)
  if (!re.test(s)) fail(what)
  return s
}

/** D-4・D-10: 会社の休日の名前。項目が無ければ名前なし。文字列でなければ失敗。長さは前後の空白を除く前で数える */
function holidayName(v: unknown): string {
  if (v === undefined) return ''
  return text(v, '会社の休日の name')
}

/** 形だけを確かめる。R-15 に合うかは readSettings が確かめる */
function readCompanyHoliday(v: unknown): CompanyHoliday {
  const o = obj(v, '会社の休日')
  if (o.kind === 'yearly') {
    const re = /^\d{2}-\d{2}$/
    return withHolidayName({ kind: 'yearly', start: formOf(o.start, re, '会社の休日の start'), end: formOf(o.end, re, '会社の休日の end') }, holidayName(o.name))
  }
  if (o.kind === 'once') {
    const re = /^\d{4}-\d{2}-\d{2}$/
    return withHolidayName({ kind: 'once', start: formOf(o.start, re, '会社の休日の start'), end: formOf(o.end, re, '会社の休日の end') }, holidayName(o.name))
  }
  return fail('会社の休日の kind')
}

function readGrantYears(v: unknown): Record<string, GrantYearSetting> {
  const o = obj(v, 'grantYears')
  if (Object.keys(o).length > STORAGE_LIMITS.grantYears) fail('grantYears の件数')
  const out: Record<string, GrantYearSetting> = {}
  for (const [key, val] of Object.entries(o)) {
    const g = obj(val, 'grantYears の値')
    out[isoDate(key, 'grantYears のキー')] = {
      grantDays: num(g.grantDays, 'grantDays', 0),
      entitlementMinutes: g.entitlementMinutes === null ? null : num(g.entitlementMinutes, 'entitlementMinutes', 0, Infinity, true),
    }
  }
  return out
}

/** D-4・F-108: 項目が無い記録は月曜始まりとして読む */
function readWeekStart(v: unknown): WeekStart {
  if (v === undefined) return 'monday'
  if (v !== 'monday' && v !== 'sunday') fail('weekStart')
  return v
}

function readSettings(v: unknown): Settings {
  const o = obj(v, 'settings')
  const leaveTypes = arr(o.leaveTypes, 'leaveTypes', STORAGE_LIMITS.leaveTypes).map(readLeaveType)
  if (leaveTypes[0]?.id !== PAID_LEAVE_TYPE_ID) fail('leaveTypes の先頭（有休）')
  checkUniqueIds(leaveTypes.map((t) => t.id), '休暇の種類')
  const grantDay = o.grantDay === null ? null : grantDayValue(o.grantDay, 'grantDay')
  return {
    workMinutes: num(o.workMinutes, 'workMinutes', 1, 1440, true),
    grantDay,
    grantYears: readGrantYears(o.grantYears),
    // D-4: R-15 に合わない会社の休日は、記録の全体を読めなくせず、その休日だけを落とす
    companyHolidays: arr(o.companyHolidays, 'companyHolidays', STORAGE_LIMITS.companyHolidays).map(readCompanyHoliday).filter(isValidCompanyHoliday),
    leaveTypes,
    weekStart: readWeekStart(o.weekStart),
  }
}

function readStored(v: unknown): StoredData {
  const o = obj(v, '記録')
  if (o.version !== STORAGE_VERSION) fail('version')
  const entries = arr(o.entries, 'entries', STORAGE_LIMITS.entries).map(readEntry)
  checkUniqueIds(entries.map((e) => e.id), '日程')
  const settings = readSettings(o.settings)
  // D-4: 日程は、設定にある休暇の種類を指す
  const typeIds = new Set(settings.leaveTypes.map((t) => t.id))
  if (entries.some((e) => !typeIds.has(e.leaveTypeId))) fail('日程の leaveTypeId')
  return { version: STORAGE_VERSION, settings, entries }
}
