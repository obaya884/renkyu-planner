import { expect, test } from 'vitest'
import { canAdd, isValidId } from './limits'

test('D-10: id は半角の英数字・ハイフン・下線だけの 1〜64 文字', () => {
  for (const ok of ['paid', 'id-1', 'x_y', '2026-05-15', '0f8fad5b-d9cb-469f-a165-70867728950e', 'a'.repeat(64)]) expect(isValidId(ok)).toBe(true)
  for (const ng of ['', 'a'.repeat(65), 'a b', 'あ', 'a/b', 'a@b', 'a\nb', '__proto__x;']) expect(isValidId(ng)).toBe(false)
})
test('D-10: 件数の上限の判定', () => {
  expect(canAdd(4999, 1, 5000)).toBe(true)
  expect(canAdd(4999, 2, 5000)).toBe(false)
  expect(canAdd(100, 0, 100)).toBe(true)
})
