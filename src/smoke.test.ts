import { expect, test } from 'vitest'
import { APP_NAME } from '@/app/site'

test('サービス名と題が要求定義書 §9 のとおり', () => {
  expect(APP_NAME).toBe('連休プランナー')
})
