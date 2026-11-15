import { expect, test } from 'vitest'
import { calendarEventTitle } from '@/app/texts'
import { SHEET } from '@/domain/view/fixture'
import { calendarEventOf, calendarEventsOf, calendarUrlOf } from './calendarEvents'

const base = { id: 'x', date: '2026-12-28', leaveTypeId: 'paid', title: '' } as const
test('F-506・§6: 予定の題', () => {
  expect(calendarEventTitle({ ...base, title: '年末年始', amount: { unit: 'day' } }, '有休', 480)).toBe('年末年始')
  expect(calendarEventTitle({ ...base, title: '  ', amount: { unit: 'day' } }, '有休', 480)).toBe('有休')
  expect(calendarEventTitle({ ...base, amount: { unit: 'half' } }, '有休', 480)).toBe('有休（半日）')
  expect(calendarEventTitle({ ...base, amount: { unit: 'minutes', minutes: 120 } }, '有休', 480)).toBe('有休（2 時間）')
})
test('F-506・E-1・E-3: 記録から予定を作る', () => {
  expect(calendarEventsOf(SHEET.entries, SHEET.settings, '2026-11-15').slice(0, 3)).toEqual([
    { uid: '2026-12-28@renkyu-planner', date: '2026-12-28', summary: '年末年始' },
    { uid: '2026-12-29@renkyu-planner', date: '2026-12-29', summary: '年末年始' },
    { uid: '2027-02-12@renkyu-planner', date: '2027-02-12', summary: '有休' },
  ])
  expect(calendarEventOf(SHEET.entries.find((e) => e.date === '2026-12-28')!, SHEET.settings)).toEqual({ uid: '2026-12-28@renkyu-planner', date: '2026-12-28', summary: '年末年始' })
})
test('F-506・E-1: これからの予定が無ければ 0 件', () => {
  expect(calendarEventsOf(SHEET.entries, SHEET.settings, '2027-05-01')).toEqual([])
})
test('E-4・§6: 除く文字と空白だけの名前は、名前なしとして休暇の種類の名前を題にする', () => {
  expect(calendarEventTitle({ ...base, title: '\u0007\u0000', amount: { unit: 'day' } }, '有休', 480)).toBe('有休')
  expect(calendarEventTitle({ ...base, title: ' \u2028\u0085\u2029 ', amount: { unit: 'half' } }, '有休', 480)).toBe('有休（半日）')
  expect(calendarEventTitle({ ...base, title: '\u0007年末', amount: { unit: 'day' } }, '有休', 480)).toBe('\u0007年末')
})
test('F-506・§5.2: Google カレンダーのリンクは、これからの予定にだけ出す', () => {
  const e = SHEET.entries.find((x) => x.date === '2026-12-28')!
  expect(calendarUrlOf(e, SHEET.settings, '2026-11-15')).toBe(
    'https://calendar.google.com/calendar/render?action=TEMPLATE&text=%E5%B9%B4%E6%9C%AB%E5%B9%B4%E5%A7%8B&dates=20261228/20261229',
  )
  expect(calendarUrlOf(e, SHEET.settings, '2026-12-28')).not.toBeNull()
  expect(calendarUrlOf(e, SHEET.settings, '2026-12-29')).toBeNull()        // 過ぎた日程
  // 今日の日程は取得済み（R-13）だが、これからの予定なのでリンクを出す（§5.2・E-1）
  expect(calendarUrlOf(e, SHEET.settings, '2026-12-28')).toContain('dates=20261228/20261229')
  const past = SHEET.entries.find((x) => x.date === '2026-11-02')!
  expect(calendarUrlOf(past, SHEET.settings, '2026-11-15')).toBeNull()     // 過ぎた日の日程
  expect(calendarUrlOf(undefined, SHEET.settings, '2026-11-15')).toBeNull()             // 開いている日程が無い
})
test('F-506・§6: 名前が空、または除く文字だけなら、リンクの題は休暇の種類の名前', () => {
  const e = SHEET.entries.find((x) => x.date === '2026-12-28')!
  for (const title of ['', '  ', '\u0007\u2028']) {
    const url = calendarUrlOf({ ...e, title, amount: { unit: 'day' } }, SHEET.settings, '2026-11-15')!
    expect(new URL(url).searchParams.get('text')).toBe('有休')
  }
})
test('§5.2・壊れた文字: 名前や休暇の種類の名前に対になっていないサロゲートがあっても落ちない', () => {
  const e = SHEET.entries.find((x) => x.date === '2026-12-28')!
  const url = calendarUrlOf({ ...e, title: '\ud800', amount: { unit: 'day' } }, SHEET.settings, '2026-11-15')!
  expect(new URL(url).searchParams.get('text')).toBe('\ufffd')
  const broken = { ...SHEET.settings, leaveTypes: SHEET.settings.leaveTypes.map((t) => (t.id === 'paid' ? { ...t, name: 'a\udc00' } : t)) }
  const url2 = calendarUrlOf({ ...e, title: '', leaveTypeId: 'paid', amount: { unit: 'day' } }, broken, '2026-11-15')!
  expect(new URL(url2).searchParams.get('text')).toBe('a\ufffd')
})
import { addCalendarUrlOf } from './calendarEvents'

const day = { leaveTypeId: 'paid', amount: { unit: 'day' }, title: '' } as const
const datesOf = (url: string | null) => new URL(url!).searchParams.get('dates')
test('F-506・§5.1: 足すときのリンク。1 日なら、その日 1 日の終日の予定', () => {
  const url = addCalendarUrlOf(['2026-11-20'], { ...day, title: '旅行' }, SHEET.settings, '2026-11-16')
  expect(datesOf(url)).toBe('20261120/20261121')
  expect(new URL(url!).searchParams.get('text')).toBe('旅行')
})
test('F-506・§5.1: 複数の日は最初の日から最後の日まで。あいだの休みの日も帯に入る。終わりは最後の日の翌日', () => {
  const url = addCalendarUrlOf(['2026-12-28', '2026-12-29', '2027-01-04'], day, SHEET.settings, '2026-11-16')
  expect(datesOf(url)).toBe('20261228/20270105')
})
test('F-506・§5.1: 日の並びが前後していても、最初と最後を取る', () => {
  expect(datesOf(addCalendarUrlOf(['2026-12-29', '2026-12-28'], day, SHEET.settings, '2026-11-16'))).toBe('20261228/20261230')
})
test('F-506・§5.1: 最後の日が今日なら出し、今日より前なら null。足す日が空でも null', () => {
  expect(addCalendarUrlOf(['2026-11-16'], day, SHEET.settings, '2026-11-16')).not.toBeNull()
  expect(addCalendarUrlOf(['2026-11-15'], day, SHEET.settings, '2026-11-16')).toBeNull()
  expect(addCalendarUrlOf(['2026-11-10', '2026-11-16'], day, SHEET.settings, '2026-11-16')).not.toBeNull() // 過ぎた日から始まっても、最後の日が今日以降なら出す
  expect(addCalendarUrlOf(['2026-11-10', '2026-11-13'], day, SHEET.settings, '2026-11-16')).toBeNull()
  expect(addCalendarUrlOf([], day, SHEET.settings, '2026-11-16')).toBeNull()
})
test('F-506・§6: 題は既存の決まり。名前が無ければ休暇の種類の名前、半日は量を添える。100 文字で切る', () => {
  const titleOf = (t: Parameters<typeof addCalendarUrlOf>[1]) => new URL(addCalendarUrlOf(['2026-11-20'], t, SHEET.settings, '2026-11-16')!).searchParams.get('text')
  expect(titleOf(day)).toBe('有休')
  expect(titleOf({ ...day, title: '\u0007' })).toBe('有休')
  expect(titleOf({ ...day, amount: { unit: 'half' } })).toBe('有休（半日）')
  expect(titleOf({ ...day, title: 'あ'.repeat(120) })).toBe('あ'.repeat(100))
  expect(titleOf({ ...day, title: '\ud800' })).toBe('�')
})
test('N-05・悪意のある題: 行き先のホストとパスは変わらない', () => {
  const u = new URL(addCalendarUrlOf(['2026-11-20'], { ...day, title: '//evil.example?a=b&c#d' }, SHEET.settings, '2026-11-16')!)
  expect([u.origin, u.pathname, u.hash, [...u.searchParams.keys()].join()]).toEqual(['https://calendar.google.com', '/calendar/render', '', 'action,text,dates'])
})
