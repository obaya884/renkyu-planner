import { expect, test } from 'vitest'
import { SHEET } from '@/domain/view/fixture'
import { buildIcs, calendarEntries, calendarUid, escapeIcsText, icsStamp, isUpcoming } from './ics'

const CRLF = '\r\n'
const STAMP = '20261115T030405Z'

test('E-5: .ics の全体の形。行末は CRLF、終日の予定の DTEND は翌日', () => {
  const text = buildIcs([
    { uid: 'a@renkyu-planner', date: '2026-12-28', summary: '年末年始' },
    { uid: 'b@renkyu-planner', date: '2027-04-30', summary: '有休' },
  ], STAMP)
  expect(text).toBe([
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//renkyu-planner//renkyu-planner//JA', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', 'UID:a@renkyu-planner', `DTSTAMP:${STAMP}`, 'DTSTART;VALUE=DATE:20261228', 'DTEND;VALUE=DATE:20261229', 'SUMMARY:年末年始', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:b@renkyu-planner', `DTSTAMP:${STAMP}`, 'DTSTART;VALUE=DATE:20270430', 'DTEND;VALUE=DATE:20270501', 'SUMMARY:有休', 'END:VEVENT',
    'END:VCALENDAR',
  ].join(CRLF) + CRLF)
})
test('E-2: 年の最後の日の DTEND は、次の年の 1 月 1 日', () => {
  expect(buildIcs([{ uid: 'x', date: '2026-12-31', summary: 'x' }], STAMP)).toContain(`DTSTART;VALUE=DATE:20261231${CRLF}DTEND;VALUE=DATE:20270101${CRLF}`)
})
// エスケープの決まりは RFC 5545 の 3.3.11（TEXT）。手元に資料が無く、知識で書いた
test('E-4: 題の無害化（\\ ; , 改行、制御文字）', () => {
  expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne')
  expect(escapeIcsText('a\r\nb\rc\nd')).toBe('a\\nb\\nc\\nd')
  expect(escapeIcsText('a\u0007b\tc\u007f')).toBe('ab\tc')
})
test('E-4・悪意のある名前: 改行と END:VEVENT・BEGIN:VALARM を入れても、行の構造が変わらない', () => {
  const evil = 'x;y,z\\\r\nEND:VEVENT\r\nBEGIN:VALARM\nTRIGGER:-PT1M\rEND:VALARM\u0000'
  const text = buildIcs([{ uid: 'e1@renkyu-planner', date: '2026-12-28', summary: evil }], STAMP)
  expect(text).toContain(`SUMMARY:x\\;y\\,z\\\\\\nEND:VEVENT\\nBEGIN:VALARM\\nTRIGGER:-PT1M\\nEND:VALARM${CRLF}`)
  const lines = text.split(CRLF)
  expect(lines.at(-1)).toBe('')                                   // 最後の行のあとにも CRLF
  expect(lines.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1)
  expect(lines.filter((l) => l === 'END:VEVENT')).toHaveLength(1)
  expect(lines.some((l) => l.startsWith('BEGIN:VALARM') || l.startsWith('TRIGGER'))).toBe(false)
  const known = /^(BEGIN|END|VERSION|PRODID|CALSCALE|UID|DTSTAMP|DTSTART;VALUE=DATE|DTEND;VALUE=DATE|SUMMARY):/
  for (const l of lines.slice(0, -1)) expect(known.test(l) || l.startsWith(' ')).toBe(true)
  expect(text.replaceAll(CRLF, '')).not.toMatch(/[\r\n]/)
})
test('E-3・E-4: UID に改行や区切りの文字が入っても、行の構造が変わらない（id の検証に頼らない）', () => {
  const text = buildIcs([{ uid: 'a\r\nEND:VEVENT\nBEGIN:VALARM;b,c@renkyu-planner', date: '2026-12-28', summary: 'x' }], STAMP)
  expect(text).toContain(`UID:a\\nEND:VEVENT\\nBEGIN:VALARM\\;b\\,c@renkyu-planner${CRLF}`)
  const lines = text.split(CRLF)
  expect(lines.filter((l) => l === 'END:VEVENT')).toHaveLength(1)
  expect(lines.some((l) => l.startsWith('BEGIN:VALARM'))).toBe(false)
  expect(text.replaceAll(CRLF, '')).not.toMatch(/[\r\n]/)
})
test('E-5: 75 オクテットを超える行は、文字の途中で切らずに折り返す', () => {
  const text = buildIcs([{ uid: 'x', date: '2026-12-28', summary: 'あいうえおかきくけこ'.repeat(3) }], STAMP)
  expect(text).toContain(`SUMMARY:あいうえおかきくけこあいうえおかきくけこあい${CRLF} うえおかきくけこ${CRLF}`)
  const enc = new TextEncoder()
  for (const line of text.split(CRLF)) expect(enc.encode(line).length).toBeLessThanOrEqual(75)
})
test('E-5: 4 オクテットの文字（サロゲートペア）も途中で切らず、長い行は何度でも折り返す', () => {
  const text = buildIcs([{ uid: 'x', date: '2026-12-28', summary: '😀'.repeat(40) }], STAMP)
  const enc = new TextEncoder()
  const lines = text.split(CRLF)
  for (const line of lines) expect(enc.encode(line).length).toBeLessThanOrEqual(75)
  expect(text).not.toContain('�')
  // 折り返しを戻すと、元の行になる
  expect(text.replaceAll(`${CRLF} `, '')).toContain(`SUMMARY:${'😀'.repeat(40)}${CRLF}`)
  expect(lines.filter((l) => l.startsWith(' ')).length).toBeGreaterThanOrEqual(2)
})
test('E-1: 入れるのは、取得済みでない日程のうち今日以降のもの', () => {
  expect(calendarEntries(SHEET.entries, '2026-11-15').map((e) => e.date)).toEqual(['2026-12-28', '2026-12-29', '2027-02-12', '2027-02-22', '2027-04-30'])
  expect(calendarEntries(SHEET.entries, '2026-12-29').map((e) => e.date)).toEqual(['2026-12-29', '2027-02-12', '2027-02-22', '2027-04-30'])
  const e = SHEET.entries.find((x) => x.date === '2026-12-28')!
  expect([isUpcoming(e, '2026-12-28'), isUpcoming(e, '2026-12-29'), isUpcoming({ ...e, done: true }, '2026-11-15')]).toEqual([true, false, false])
})
test('E-1: 日付の早い順。同じ日付は元の並び', () => {
  const e = SHEET.entries.find((x) => x.date === '2026-12-28')!
  const list = [{ ...e, id: 'c', date: '2027-01-05' }, { ...e, id: 'a' }, { ...e, id: 'b' }]
  expect(calendarEntries(list, '2026-11-15').map((x) => x.id)).toEqual(['a', 'b', 'c'])
})
test('E-3・DTSTAMP: UID と時刻の形', () => {
  expect(calendarUid('2026-12-28')).toBe('2026-12-28@renkyu-planner')
  expect(icsStamp('2026-11-15T03:04:05.678Z')).toBe('20261115T030405Z')
})
