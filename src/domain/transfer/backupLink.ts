import { addDays, diffDays } from '@/domain/shared/date'
import type { Result } from '@/domain/shared/result'
import { STORAGE_LIMITS } from '@/domain/storage/limits'
import { type StoredData, STORAGE_VERSION, parseStored } from '@/domain/storage/stored'
import { PAID_LEAVE_TYPE_ID } from '@/domain/types'
import type { Amount, CompanyHoliday, Entry, LeaveType } from '@/domain/types'

/**
 * 控えのリンク（試作）。記録を詰めた形の文字列にし、圧縮して base64url にしたものを URL の # のあとに入れる。
 * ここは「詰めた形の文字列 ⇄ StoredData」と base64url とハッシュの形まで。圧縮は I/O なので app 側に置く。
 *
 * 詰めた形（版 1）は JSON の配列 [1, 設定, 日程]。
 * - 設定: [所定労働時間, 付与日 or '', 付与年 [[開始日, 日数, 持ち分 or null]…], 会社の休日 [[0 毎年 or 1 一度, 始め, 終わり, 名前?]…], 休暇の種類 [[名前, 日数, [始め, 終わり] or 0, 付与日 or '', まとめて 0 or 1]…], 週の始まり 0 月曜 or 1 日曜]
 * - 日程: [[前の日程からの日数, 休暇の種類の番号?, 量?, 名前?]…]。後ろの既定値（0, 0, ''）は省く。量は 0 = 1日、-1 = 半日、正の整数 = 分
 * 日程と休暇の種類の id は持たない。休暇の種類は並びの番号で指し、先頭は有休（id は paid）。読むときにほかの id を振り直す
 */

/** リンクの形の版。形を変えたら番号を上げ、古い版を読む道を残す */
export const BACKUP_LINK_VERSION = 1
export const BACKUP_HASH_PREFIX = `#b${BACKUP_LINK_VERSION}=`

/** これより長いリンクは作らない（数字は仮） */
export const MAX_BACKUP_LINK_LENGTH = 8000

/** 1 件目の日程の日付は、この日からの日数で持つ */
const BASE_DATE = '2000-01-01'
/** 日程の日付の差の上限（これより離れた日付は読まない） */
const MAX_DELTA = 100_000

export function backupHashOf(payload: string): string {
  return `${BACKUP_HASH_PREFIX}${payload}`
}

/** 控えのリンクのハッシュか（知らない版も含む）。版が違って読めないものも、読めないリンクとして知らせるために見分ける */
export function isBackupHash(hash: string): boolean {
  return /^#b\d+=/.test(hash)
}

/** いまの版の控えのリンクなら中身（base64url）を、そうでなければ null を返す */
export function backupPayloadOf(hash: string): string | null {
  return hash.startsWith(BACKUP_HASH_PREFIX) ? hash.slice(BACKUP_HASH_PREFIX.length) : null
}

// ---- 詰める ----

function packAmount(a: Amount): number {
  if (a.unit === 'day') return 0
  if (a.unit === 'half') return -1
  return a.minutes
}

function packEntry(e: Entry, prev: string, typeIndex: ReadonlyMap<string, number>): unknown[] {
  const row: unknown[] = [diffDays(prev, e.date), typeIndex.get(e.leaveTypeId) ?? 0, packAmount(e.amount), e.title]
  // 後ろの既定値を省く
  const defaults: unknown[] = [null, 0, 0, '']
  while (row.length > 1 && row[row.length - 1] === defaults[row.length - 1]) row.pop()
  return row
}

function packCompanyHoliday(h: CompanyHoliday): unknown[] {
  const row: unknown[] = [h.kind === 'yearly' ? 0 : 1, h.start, h.end]
  if (h.name !== undefined) row.push(h.name)
  return row
}

function packLeaveType(t: LeaveType): unknown[] {
  return [t.name, t.days, t.usable === null ? 0 : [t.usable.start, t.usable.end], t.grantDay ?? '', t.together ? 1 : 0]
}

/** 記録を詰めた形の文字列にする。日程と休暇の種類の id は入れない */
export function packStored(data: StoredData): string {
  const s = data.settings
  const typeIndex = new Map(s.leaveTypes.map((t, i) => [t.id, i]))
  let prev = BASE_DATE
  const entries = data.entries.map((e) => {
    const row = packEntry(e, prev, typeIndex)
    prev = e.date
    return row
  })
  const settings = [
    s.workMinutes,
    s.grantDay ?? '',
    Object.entries(s.grantYears).map(([start, g]) => [start, g.grantDays, g.entitlementMinutes]),
    s.companyHolidays.map(packCompanyHoliday),
    s.leaveTypes.map(packLeaveType),
    s.weekStart === 'sunday' ? 1 : 0,
  ]
  return JSON.stringify([BACKUP_LINK_VERSION, settings, entries])
}

// ---- 戻す ----
// 形が合わなければ例外を投げ、unpackStored だけが受け止める。値の中身の検証は parseStored に任せる

function fail(what: string): never {
  throw new Error(`控えのリンクの${what}が合いません`)
}

function list(v: unknown, what: string, max: number): readonly unknown[] {
  if (!Array.isArray(v)) fail(what)
  if (v.length > max) fail(`${what}の件数`)
  return v
}

function int(v: unknown, what: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) fail(what)
  return v
}

function orNull(v: unknown): unknown {
  return v === '' ? null : v
}

function unpackAmount(v: unknown): unknown {
  const n = int(v, '日程の量', -1, Number.MAX_SAFE_INTEGER)
  if (n === 0) return { unit: 'day' }
  if (n === -1) return { unit: 'half' }
  return { unit: 'minutes', minutes: n }
}

function unpackLeaveType(v: unknown, index: number, newId: () => string): Record<string, unknown> {
  const [name, days, usable, grantDay, together] = list(v, '休暇の種類', 5)
  let u: unknown = null
  if (usable !== 0) {
    const [start, end] = list(usable, '休暇の種類の使える期間', 2)
    u = { start, end }
  }
  return { id: index === 0 ? PAID_LEAVE_TYPE_ID : newId(), name, days, usable: u, grantDay: orNull(grantDay), together: together === 1 }
}

function unpackCompanyHoliday(v: unknown): Record<string, unknown> {
  const [kind, start, end, ...rest] = list(v, '会社の休日', 4)
  const k = int(kind, '会社の休日の種類', 0, 1)
  return { kind: k === 0 ? 'yearly' : 'once', start, end, ...(rest.length > 0 ? { name: rest[0] } : {}) }
}

function unpackGrantYears(v: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const row of list(v, '付与年', STORAGE_LIMITS.grantYears)) {
    const [start, grantDays, entitlementMinutes] = list(row, '付与年', 3)
    if (typeof start !== 'string') fail('付与年の開始日')
    out[start] = { grantDays, entitlementMinutes }
  }
  return out
}

function unpack(text: string, newId: () => string): unknown {
  const top = list(JSON.parse(text), '全体', 3)
  if (top.length !== 3 || top[0] !== BACKUP_LINK_VERSION) fail('版')
  // 件数の上限は、id を振る前に確かめる（D-10）
  const rows = list(top[2], '日程', STORAGE_LIMITS.entries)
  const [workMinutes, grantDay, grantYears, companyHolidays, leaveTypes, weekStart] = list(top[1], '設定', 6)
  const types = list(leaveTypes, '休暇の種類', STORAGE_LIMITS.leaveTypes).map((t, i) => unpackLeaveType(t, i, newId))
  const settings = {
    workMinutes,
    grantDay: orNull(grantDay),
    grantYears: unpackGrantYears(grantYears),
    companyHolidays: list(companyHolidays, '会社の休日', STORAGE_LIMITS.companyHolidays).map(unpackCompanyHoliday),
    leaveTypes: types,
    weekStart: int(weekStart, '週の始まり', 0, 1) === 1 ? 'sunday' : 'monday',
  }
  let prev = BASE_DATE
  const entries = rows.map((row) => {
    const [delta, typeIndex = 0, amount = 0, title = ''] = list(row, '日程', 4)
    const date = addDays(prev, int(delta, '日程の日付', -MAX_DELTA, MAX_DELTA))
    prev = date
    const type = types[int(typeIndex, '日程の休暇の種類', 0, types.length - 1)]
    return { id: newId(), date, leaveTypeId: type.id, amount: unpackAmount(amount), title }
  })
  return { version: STORAGE_VERSION, settings, entries }
}

/**
 * 詰めた形の文字列を記録に戻す。日程と、有休でない休暇の種類には newId で id を振る。
 * 戻したあとは必ず parseStored（記録とファイルの唯一の検証）を通す。合わなければ失敗を返し、例外を外へ出さない
 */
export function unpackStored(text: string, newId: () => string): Result<StoredData> {
  let raw: unknown
  try {
    raw = unpack(text, newId)
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : '読み取れないリンクです' }
  }
  return parseStored(JSON.stringify(raw))
}

// ---- base64url ----

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** バイト列を base64url（+/= を使わない。末尾の = も付けない）にする */
export function toBase64Url(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    const chars = Math.min(4, Math.ceil(((bytes.length - i) * 8) / 6))
    for (let k = 0; k < chars; k++) out += ALPHABET[(n >> (18 - 6 * k)) & 63]
  }
  return out
}

/** base64url をバイト列に戻す。使えない文字や、ありえない長さなら null */
export function fromBase64Url(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) return null
  const out = new Uint8Array(Math.floor((s.length * 6) / 8))
  let o = 0
  for (let i = 0; i < s.length; i += 4) {
    let n = 0
    const chunk = s.slice(i, i + 4)
    for (let k = 0; k < 4; k++) n = (n << 6) | (k < chunk.length ? ALPHABET.indexOf(chunk[k]) : 0)
    for (let k = 0; k < chunk.length - 1; k++) out[o++] = (n >> (16 - 8 * k)) & 255
  }
  return out
}
