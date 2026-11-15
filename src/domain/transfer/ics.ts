import { type IsoDate, addDays } from '@/domain/shared/date'
import type { Entry } from '@/domain/types'
import { ICS_REMOVED_CHARS, toWellFormed } from './eventText'

/** カレンダー用のファイル（.ics）の予定 1 件。summary は無害化する前の題 */
export type CalendarEvent = Readonly<{ uid: string; date: IsoDate; summary: string }>

const CRLF = '\r\n'
/** RFC 5545 の 3.1。1 行は、行末の CRLF を除いて 75 オクテットまで */
const MAX_LINE_OCTETS = 75

/** E-1: これからの予定（取得済みでなく、日付が today 以降） */
export function isUpcoming(entry: Entry, today: IsoDate): boolean {
  return !entry.done && entry.date >= today
}

/** E-1: カレンダーに入れる日程。日付の早い順（同じ日付は元の並び） */
export function calendarEntries(entries: readonly Entry[], today: IsoDate): readonly Entry[] {
  return entries.filter((e) => isUpcoming(e, today)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** E-3: 日程ごとに変わらない UID */
export function calendarUid(entryId: string): string {
  return `${entryId}@renkyu-planner`
}

/** DTSTAMP の形。utcIso は Date#toISOString の結果（例: 2026-11-15T03:04:05.678Z → 20261115T030405Z） */
export function icsStamp(utcIso: string): string {
  return `${utcIso.slice(0, 19).replace(/[-:]/g, '')}Z`
}

/**
 * E-4: RFC 5545 の TEXT（3.3.11）の無害化。対になっていないサロゲート → U+FFFD、\ → \\、; → \;、, → \,、改行 → \n、
 * タブを除く制御文字と U+0085・U+2028・U+2029 は除く。この順で行う
 */
export function escapeIcsText(s: string): string {
  return toWellFormed(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(ICS_REMOVED_CHARS, '')
}

function utf8Octets(codePoint: number): number {
  if (codePoint < 0x80) return 1
  if (codePoint < 0x800) return 2
  if (codePoint < 0x10000) return 3
  return 4
}

/** E-5: 75 オクテットを超える行を、文字の途中で切らずに折り返す。続きの行の先頭に空白 1 つ（空白も 75 に数える） */
function foldLine(line: string): string {
  const parts: string[] = []
  let current = ''
  let octets = 0
  // for…of はコードポイントごとに回るので、サロゲートペアを分けない
  for (const ch of line) {
    const n = utf8Octets(ch.codePointAt(0) ?? 0)
    if (octets + n > MAX_LINE_OCTETS) {
      parts.push(current)
      current = ' '
      octets = 1
    }
    current += ch
    octets += n
  }
  parts.push(current)
  return parts.join(CRLF)
}

function icsDate(d: IsoDate): string {
  return d.replaceAll('-', '')
}

/** E-2・E-5: 予定を終日の予定にして、.ics の全体を作る。stamp は icsStamp の結果 */
export function buildIcs(events: readonly CalendarEvent[], stamp: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//renkyu-planner//renkyu-planner//JA',
    'CALSCALE:GREGORIAN',
    ...events.flatMap((e) => [
      'BEGIN:VEVENT',
      // UID も TEXT なので、日程の id の検証に頼らず無害化する
      `UID:${escapeIcsText(e.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(e.date)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(e.date, 1))}`,
      `SUMMARY:${escapeIcsText(e.summary)}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join(CRLF) + CRLF
}
