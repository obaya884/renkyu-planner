import { isValidGrantDay } from '@/domain/leave/grantYear'
import { isValidIsoDate } from '@/domain/shared/date'
import type { MonthDay } from '@/domain/shared/date'
import type { Result } from '@/domain/shared/result'
import { DEFAULT_SETTINGS } from '@/domain/types'
import type { Amount, CompanyHoliday, Entry, GrantYearSetting, LeaveType, Settings, WeekStart } from '@/domain/types'

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

/** D-3。新しい版が書いた記録（`version` が数で、STORAGE_VERSION より大きい）か。読めない記録のうち、上書きしてはならないものを見分ける */
export function isNewerVersion(text: string): boolean {
  try {
    const v: unknown = JSON.parse(text)
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
    const version = (v as Readonly<Record<string, unknown>>).version
    return typeof version === 'number' && version > STORAGE_VERSION
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

function arr(v: unknown, what: string): readonly unknown[] {
  if (!Array.isArray(v)) fail(what)
  return v
}

function str(v: unknown, what: string): string {
  if (typeof v !== 'string') fail(what)
  return v
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
    id: nonEmptyStr(o.id, '日程の id'),
    date: isoDate(o.date, '日程の date'),
    leaveTypeId: nonEmptyStr(o.leaveTypeId, '日程の leaveTypeId'),
    amount: readAmount(o.amount),
    title: str(o.title, '日程の title'),
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
  return {
    id: nonEmptyStr(o.id, '休暇の種類の id'),
    name: str(o.name, '休暇の種類の name'),
    days: num(o.days, '休暇の種類の days', 0),
    usable,
  }
}

function formOf(v: unknown, re: RegExp, what: string): string {
  const s = str(v, what)
  if (!re.test(s)) fail(what)
  return s
}

/** 形だけを確かめる（R-15 に合わないものも保存はできる） */
function readCompanyHoliday(v: unknown): CompanyHoliday {
  const o = obj(v, '会社の休日')
  if (o.kind === 'yearly') {
    const re = /^\d{2}-\d{2}$/
    return { kind: 'yearly', start: formOf(o.start, re, '会社の休日の start'), end: formOf(o.end, re, '会社の休日の end') }
  }
  if (o.kind === 'once') {
    const re = /^\d{4}-\d{2}-\d{2}$/
    return { kind: 'once', start: formOf(o.start, re, '会社の休日の start'), end: formOf(o.end, re, '会社の休日の end') }
  }
  return fail('会社の休日の kind')
}

function readGrantYears(v: unknown): Record<string, GrantYearSetting> {
  const o = obj(v, 'grantYears')
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
  const leaveTypes = arr(o.leaveTypes, 'leaveTypes').map(readLeaveType)
  if (leaveTypes[0]?.id !== 'paid') fail('leaveTypes の先頭（有休）')
  checkUniqueIds(leaveTypes.map((t) => t.id), '休暇の種類')
  const grantDay = o.grantDay === null ? null : monthDay(o.grantDay, 'grantDay')
  if (grantDay !== null && !isValidGrantDay(grantDay)) fail('grantDay')
  return {
    workMinutes: num(o.workMinutes, 'workMinutes', 1, 1440, true),
    grantDay,
    grantYears: readGrantYears(o.grantYears),
    companyHolidays: arr(o.companyHolidays, 'companyHolidays').map(readCompanyHoliday),
    leaveTypes,
    weekStart: readWeekStart(o.weekStart),
  }
}

function readStored(v: unknown): StoredData {
  const o = obj(v, '記録')
  if (o.version !== STORAGE_VERSION) fail('version')
  const entries = arr(o.entries, 'entries').map(readEntry)
  checkUniqueIds(entries.map((e) => e.id), '日程')
  return { version: STORAGE_VERSION, settings: readSettings(o.settings), entries }
}
