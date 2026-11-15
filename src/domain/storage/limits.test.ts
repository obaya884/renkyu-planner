import { expect, test } from 'vitest'
import { STORAGE_LIMITS, canAdd, clipText, isValidId } from './limits'
import { EMPTY_STORED, parseStored, serializeStored } from './stored'

test('D-10: id は半角の英数字・ハイフン・下線だけの 1〜64 文字', () => {
  for (const ok of ['paid', 'id-1', 'x_y', '2026-05-15', '0f8fad5b-d9cb-469f-a165-70867728950e', 'a'.repeat(64)]) expect(isValidId(ok)).toBe(true)
  for (const ng of ['', 'a'.repeat(65), 'a b', 'あ', 'a/b', 'a@b', 'a\nb', '__proto__x;']) expect(isValidId(ng)).toBe(false)
})
test('D-10: 上限の数（休暇の種類は有休を含めて数える）', () => {
  expect(STORAGE_LIMITS).toEqual({ entries: 5000, companyHolidays: 100, leaveTypes: 20, grantYears: 100, textLength: 100, idLength: 64 })
})
test('D-10: 件数の上限の判定', () => {
  expect(canAdd(4999, 1, 5000)).toBe(true)
  expect(canAdd(4999, 2, 5000)).toBe(false)
  expect(canAdd(100, 0, 100)).toBe(true)
})

test('D-10: clipText は 100 文字で切る。ちょうどと短いものはそのまま、サロゲートペアの途中では切らない', () => {
  expect(clipText('a'.repeat(100))).toBe('a'.repeat(100))
  expect(clipText('a'.repeat(101))).toBe('a'.repeat(100))
  expect(clipText('短い')).toBe('短い')
  const cut = clipText('a'.repeat(99) + '𠮷' + 'b') // 𠮷 は length 2。100 文字目の途中で切れる
  expect(cut).toBe('a'.repeat(99))
  expect(parseStored(serializeStored({ ...EMPTY_STORED, entries: [{ id: 'x', date: '2026-11-20', leaveTypeId: 'paid', amount: { unit: 'day' }, title: cut, done: false }] })).ok).toBe(true)
})
