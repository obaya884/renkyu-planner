import { expect, test } from 'vitest'
import { planningQuarters } from '@/domain/quarters/quarters'
import { addDays } from '@/domain/shared/date'
import type { CompanyHoliday, Entry } from '@/domain/types'
import { type StripKind, stripOf } from './candidateBlocks'
import { SHEET, UNSET } from './fixture'
import { type PlannerInput, restCalendarOf } from './input'
import { buildQuarterViews } from './quarterView'

const qs = planningQuarters('2026-11-15')
const ctxOf = (input: PlannerInput) => ({ input, cal: restCalendarOf(input) })
const kinds = (list: readonly (readonly [string, StripKind])[]) => list.map(([date, kind]) => ({ date, kind }))
const day = (date: string, done: boolean): Entry => ({ id: date, date, leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done })

// ---- 日の並び（§3.7） ----

test('§3.7・§3.6: 日の並びは、休む日、土日・祝日を分ける', () => {
  // 11/20(金) を休むと 11/20〜11/23 の 4 連休。11/21(土)・11/22(日) は土日、11/23(月) は勤労感謝の日
  const strip = stripOf(ctxOf(SHEET), ['2026-11-20'], { start: '2026-11-20', end: '2026-11-23', days: 4 })
  expect(strip).toEqual({ size: 'normal', days: kinds([['2026-11-20', 'take'], ['2026-11-21', 'off'], ['2026-11-22', 'off'], ['2026-11-23', 'off']]) })
})
test('§3.7・§3.6: 会社の休日と、1 日分の日程の日（予定・取得済み）を分ける。取得済みが 1 件でもあれば取得済み', () => {
  // SHEET の 12/28(月)・12/29(火) は取得済みでない 1 日分の日程。12/24(木) に取得済みの日程を足す。
  // 12/30〜1/3 は会社の休日（1/1 の元日と 1/2・1/3 の土日も、R-1 で会社の休日）
  const input = { ...SHEET, entries: [...SHEET.entries, day('2026-12-24', true)] }
  const strip = stripOf(ctxOf(input), ['2026-12-25'], { start: '2026-12-24', end: '2027-01-03', days: 11 })
  expect(strip.days).toEqual(
    kinds([
      ['2026-12-24', 'done'],
      ['2026-12-25', 'take'],
      ['2026-12-26', 'off'],
      ['2026-12-27', 'off'],
      ['2026-12-28', 'planned'],
      ['2026-12-29', 'planned'],
      ...Array.from({ length: 5 }, (_, i) => [addDays('2026-12-30', i), 'company'] as const),
    ]),
  )
  // 同じ日に予定と取得済みがあれば取得済み（§3.6 の月カレンダーと同じ）
  const both = { ...SHEET, entries: [...SHEET.entries, { ...day('2026-12-28', true), id: 'done-28' }] }
  expect(stripOf(ctxOf(both), [], { start: '2026-12-28', end: '2026-12-28', days: 1 }).days).toEqual(kinds([['2026-12-28', 'done']]))
})
test('§3.7: 連休が 9 日以下は normal、10 日以上は small のマス', () => {
  const ctx = ctxOf(SHEET)
  // 12/26〜1/3 は 9 日、12/25〜1/3 は 10 日
  expect(stripOf(ctx, [], { start: '2026-12-26', end: '2027-01-03', days: 9 }).size).toBe('normal')
  expect(stripOf(ctx, ['2026-12-25'], { start: '2026-12-25', end: '2027-01-03', days: 10 }).size).toBe('small')
  // 組み立ての行にも持つ。12/30 の組の 12/25(金) を休む候補は 12/25〜1/3 の 10 連休
  const dec = buildQuarterViews(SHEET, qs)[0].groups.find((g) => g.core === '2026-12-30')
  expect(dec?.primary[0].leaveDays).toEqual(['2026-12-25'])
  expect(dec?.primary[0].strip.size).toBe('small')
  expect(dec?.primary[0].strip.days).toHaveLength(10)
})

// ---- 組の見出しの元（要件定義書 §5.1、画面定義書 §3.7） ----

const headOf = (input: PlannerInput, core: string) => buildQuarterViews(input, qs)[0].groups.find((g) => g.core === core)?.head
const withCompany = (...companyHolidays: CompanyHoliday[]) => ({ ...SHEET, settings: { ...SHEET.settings, companyHolidays } })

test('§5.1: 核が祝日なら、祝日データの名前', () => {
  expect(headOf(SHEET, '2026-11-23')).toEqual({ kind: 'holiday', date: '2026-11-23', name: '勤労感謝の日' })
})
test('§5.1: 核が会社の休日なら、続く会社の休日の期間と名前。名前が無ければ null', () => {
  // 12/30(水) が核。前の 12/29(火) は 1 日分の日程で会社の休日ではない。後ろは 1/3(日) まで会社の休日、1/4(月) は平日
  expect(headOf(withCompany({ kind: 'yearly', start: '12-30', end: '01-03', name: '年末年始' }), '2026-12-30')).toEqual({ kind: 'company', start: '2026-12-30', end: '2027-01-03', name: '年末年始' })
  expect(headOf(SHEET, '2026-12-30')).toEqual({ kind: 'company', start: '2026-12-30', end: '2027-01-03', name: null })
})
test('§5.1: 会社の休日が 2 件つながっていれば、期間はつながった全体、名前は核を含むほう', () => {
  // 12/26(土)〜12/27(日) の「週末休業」と 12/28〜1/3 の「年末年始」。核は最初の平日の会社の休日 12/28(月)（R-5）で、「年末年始」に入る。
  // 日程があると 12/28 に重なるので、日程は無しにする。12/25(金) を休むと 12/25〜1/3 の 10 連休の組になる
  const input = { ...withCompany({ kind: 'once', start: '2026-12-26', end: '2026-12-27', name: '週末休業' }, { kind: 'yearly', start: '12-28', end: '01-03', name: '年末年始' }), entries: [] }
  expect(headOf(input, '2026-12-28')).toEqual({ kind: 'company', start: '2026-12-26', end: '2027-01-03', name: '年末年始' })
})
test('§5.1: 祝日でも会社の休日でもない核は、種類も名前も持たない', () => {
  // 12/4(金) に 1 日分の日程。12/7(月) を休むと 12/4〜12/7 の 4 連休で、平日の祝日も会社の休日も無い。
  // 核は並びの中の leave でない最初の休みの日 12/5(土)（R-5）
  const input = { ...UNSET, entries: [day('2026-12-04', false)] }
  expect(headOf(input, '2026-12-05')).toEqual({ kind: 'other', date: '2026-12-05' })
})
