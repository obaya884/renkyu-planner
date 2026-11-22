import { expect, test } from 'vitest'
import { EMPTY_STORED } from '@/domain/storage/stored'
import { MAX_BACKUP_LINK_LENGTH } from '@/domain/transfer/backupLink'
import { type HomeSheetIo, createHomeSheetStore } from './createHomeSheetStore'

const BASE = 'https://example.com/'
const withEntry = { ...EMPTY_STORED, entries: [{ id: 'a', date: '2026-12-01', leaveTypeId: 'paid', amount: { kind: 'day' }, title: '' }] } as never

function io(link: () => Promise<string>) {
  const log: string[] = []
  const value: HomeSheetIo = {
    makeLink: link,
    baseLength: () => BASE.length,
    putHash: (h) => void log.push(`put ${h}`),
    clearHash: () => void log.push('clear'),
  }
  return { io: value, log }
}
const flush = () => new Promise((r) => setTimeout(r, 0))

test('試作（ホーム画面）: 記録が空なら手順から始め、閉じてもアドレスに触らない', () => {
  const { io: v, log } = io(() => Promise.resolve(`${BASE}#b1=x`))
  const store = createHomeSheetStore(v)
  store.open(EMPTY_STORED)
  expect(store.getState()).toEqual({ kind: 'steps' })
  store.close()
  expect(store.getState()).toBeNull()
  expect(log).toEqual([])
})
test('試作（ホーム画面）: 記録があれば移すかを聞き、移すと # のあとに控えを入れ、閉じると消す', async () => {
  const { io: v, log } = io(() => Promise.resolve(`${BASE}#b1=abc`))
  const store = createHomeSheetStore(v)
  store.open(withEntry)
  expect(store.getState()).toEqual({ kind: 'choose', entryCount: 1, preparing: true })
  store.move()
  expect(log).toEqual([])
  await flush()
  expect(store.getState()).toEqual({ kind: 'choose', entryCount: 1, preparing: false })
  store.move()
  expect(store.getState()).toEqual({ kind: 'ready' })
  expect(log).toEqual(['put #b1=abc'])
  store.close()
  expect(log).toEqual(['put #b1=abc', 'clear'])
})
test('試作（ホーム画面）: 手順だけ見るなら、アドレスに触らない', async () => {
  const { io: v, log } = io(() => Promise.resolve(`${BASE}#b1=abc`))
  const store = createHomeSheetStore(v)
  store.open(withEntry)
  await flush()
  store.skip()
  expect(store.getState()).toEqual({ kind: 'steps' })
  store.close()
  expect(log).toEqual([])
})
test('試作（ホーム画面）: 控えが長すぎる・作れないときは、移す道を出さない', async () => {
  const long = createHomeSheetStore(io(() => Promise.resolve(BASE + '#b1=' + 'x'.repeat(MAX_BACKUP_LINK_LENGTH))).io)
  long.open(withEntry)
  await flush()
  expect(long.getState()).toEqual({ kind: 'noMove', reason: 'tooLong' })
  const failed = createHomeSheetStore(io(() => Promise.reject(new Error('no CompressionStream'))).io)
  failed.open(withEntry)
  await flush()
  expect(failed.getState()).toEqual({ kind: 'noMove', reason: 'failed' })
})
test('試作（ホーム画面）: 作り終える前に閉じたら、あとから開いた状態に戻さない', async () => {
  const store = createHomeSheetStore(io(() => Promise.resolve(`${BASE}#b1=abc`)).io)
  store.open(withEntry)
  store.close()
  await flush()
  expect(store.getState()).toBeNull()
})
