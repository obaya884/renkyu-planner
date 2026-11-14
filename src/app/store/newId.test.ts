import { expect, test } from 'vitest'
import { newId } from './newId'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

test('D-7: randomUUID があれば、その値を使う', () => {
  expect(newId({ randomUUID: () => 'from-random-uuid', getRandomValues: (a) => a })).toBe('from-random-uuid')
})
test('D-7: randomUUID が無いときは、getRandomValues の 16 バイトから UUID v4 の形の文字列を作る', () => {
  const fill = (a: Uint8Array) => {
    for (let i = 0; i < a.length; i++) a[i] = 0xff - i
    return a
  }
  const id = newId({ getRandomValues: fill })
  // 版（7 バイト目の上位 4 ビット = 4）とバリアント（9 バイト目の上位 2 ビット = 10）を立てる
  expect(id).toBe('fffefdfc-fbfa-49f8-b7f6-f5f4f3f2f1f0')
  expect(id).toMatch(UUID_V4)
  const zero = newId({ getRandomValues: (a) => a })
  expect(zero).toBe('00000000-0000-4000-8000-000000000000')
  expect(zero).toMatch(UUID_V4)
})
