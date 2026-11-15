import { expect, test } from 'vitest'
import { isBlankEventName, toWellFormed } from './eventText'

test('E-4・§5.2: 対になっていないサロゲートを U+FFFD に置き換える。対になったものは残す', () => {
  expect(toWellFormed('a\ud800b')).toBe('a\ufffdb')
  expect(toWellFormed('a\udc00b')).toBe('a\ufffdb')
  expect(toWellFormed('\udc00\ud800')).toBe('\ufffd\ufffd')
  expect(toWellFormed('\ud800')).toBe('\ufffd')
  expect(toWellFormed('😀\ud83d')).toBe('😀\ufffd')
  expect(toWellFormed('年末年始😀')).toBe('年末年始😀')
  expect(toWellFormed('')).toBe('')
})
test('E-4: 除く文字（制御文字、U+0085・U+2028・U+2029）と空白だけの名前は、名前なし', () => {
  expect(isBlankEventName('')).toBe(true)
  expect(isBlankEventName('  \t\u3000')).toBe(true)
  expect(isBlankEventName('\u0000\u0007\u007f')).toBe(true)
  expect(isBlankEventName('\u0085\u2028\u2029\r\n ')).toBe(true)
  expect(isBlankEventName('a')).toBe(false)
  expect(isBlankEventName('\u0007年末')).toBe(false)
  expect(isBlankEventName('\ud800')).toBe(false)
})
