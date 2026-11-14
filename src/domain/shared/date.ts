/** 'YYYY-MM-DD' の日本の暦日 */
export type IsoDate = string
/** 'MM-DD' */
export type MonthDay = string

const DAY_MS = 24 * 60 * 60 * 1000
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

function toUtcMs(d: IsoDate): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

function fromUtcMs(ms: number): IsoDate {
  const t = new Date(ms)
  return format(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}

function format(y: number, m: number, d: number): IsoDate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function addDays(d: IsoDate, n: number): IsoDate {
  return fromUtcMs(toUtcMs(d) + n * DAY_MS)
}

export function weekday(d: IsoDate): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return new Date(toUtcMs(d)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
}

/** b − a の日数 */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS)
}

/** start から end まで両端を含めて列挙する */
export function eachDay(start: IsoDate, end: IsoDate): IsoDate[] {
  const days: IsoDate[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
  return days
}

export function monthStart(d: IsoDate): IsoDate {
  return `${d.slice(0, 7)}-01`
}

export function monthEnd(d: IsoDate): IsoDate {
  const [y, m] = d.split('-').map(Number)
  return format(y, m, lastDayOfMonth(y, m))
}

/** 四半期は 1〜3、4〜6、7〜9、10〜12 月 */
export function quarterStart(d: IsoDate): IsoDate {
  const [y, m] = d.split('-').map(Number)
  return format(y, Math.floor((m - 1) / 3) * 3 + 1, 1)
}

export function quarterEnd(d: IsoDate): IsoDate {
  const [y, m] = d.split('-').map(Number)
  const endMonth = Math.floor((m - 1) / 3) * 3 + 3
  return format(y, endMonth, lastDayOfMonth(y, endMonth))
}

export function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return fromUtcMs(toUtcMs(s)) === s
}

/** now を日本時間（UTC+9）の暦日にする。端末のタイムゾーンに依存しない */
export function todayInJapan(now: Date): IsoDate {
  return fromUtcMs(now.getTime() + JST_OFFSET_MS)
}

/** now から次の日本時間 0 時までのミリ秒（1〜1 日ぶん）。日付が変わったら今日を読み直すため */
export function untilNextDayInJapan(now: Date): number {
  const ms = now.getTime() + JST_OFFSET_MS
  return DAY_MS - (((ms % DAY_MS) + DAY_MS) % DAY_MS)
}
