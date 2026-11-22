import { expect, test } from 'vitest'
import { STORAGE_KEY } from '@/domain/storage/stored'
import { HOME_SCREEN_KEY, createHomeScreenStore } from './createHomeScreenStore'
import { memoryStorage } from './memoryStorage'

test('試作（ホーム画面）: 初めは何も覚えていない。記録のキーとは別のキーに覚え、読み直しても残る', () => {
  const storage = memoryStorage()
  const store = createHomeScreenStore(storage)
  expect(store.getState()).toEqual({ guideHiddenUntil: null, prompted: false })
  let calls = 0
  store.subscribe(() => calls++)
  store.hideGuideUntil('2026-11-25')
  store.markPrompted()
  expect(store.getState()).toEqual({ guideHiddenUntil: '2026-11-25', prompted: true })
  expect(calls).toBe(2)
  expect(storage.dump()[STORAGE_KEY]).toBeUndefined()
  expect(Object.keys(storage.dump())).toEqual([HOME_SCREEN_KEY])
  expect(createHomeScreenStore(storage).getState()).toEqual({ guideHiddenUntil: '2026-11-25', prompted: true })
})
test('試作（ホーム画面）: 控えの目印は最後の 1 つを覚える', () => {
  const storage = memoryStorage()
  const store = createHomeScreenStore(storage)
  expect(store.seenBackup('10:aaaaaaaa')).toBe(false)
  store.rememberBackup('10:aaaaaaaa')
  expect(store.seenBackup('10:aaaaaaaa')).toBe(true)
  expect(createHomeScreenStore(storage).seenBackup('10:aaaaaaaa')).toBe(true)
  store.rememberBackup('11:bbbbbbbb')
  expect(store.seenBackup('10:aaaaaaaa')).toBe(false)
})
test('試作（ホーム画面）: 保存領域が使えない・読めない値でも動き、メモリの中では覚える', () => {
  const store = createHomeScreenStore(null)
  store.hideGuideUntil('2026-11-25')
  expect(store.getState().guideHiddenUntil).toBe('2026-11-25')
  // 前の形（「閉じる」を押した覚え）や日付でない値は、隠していない扱いにする
  expect(createHomeScreenStore(memoryStorage({ [HOME_SCREEN_KEY]: '{"guideClosed":true,"guideHiddenUntil":"x"}' })).getState().guideHiddenUntil).toBeNull()
  expect(createHomeScreenStore(memoryStorage({ [HOME_SCREEN_KEY]: '{壊れた' })).getState()).toEqual({ guideHiddenUntil: null, prompted: false })
  const throwing = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') }, removeItem: () => {} }
  const s2 = createHomeScreenStore(throwing)
  s2.markPrompted()
  expect(s2.getState().prompted).toBe(true)
})
