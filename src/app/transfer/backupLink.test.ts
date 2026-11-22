import { expect, test } from 'vitest'
import { EMPTY_STORED, type StoredData } from '@/domain/storage/stored'
import { MAX_IMPORT_BYTES } from '@/domain/storage/limits'
import { DEFAULT_SETTINGS, PAID_LEAVE_TYPE_ID } from '@/domain/types'
import { BACKUP_HASH_PREFIX, toBase64Url } from '@/domain/transfer/backupLink'
import { compress, makeBackupLink, readBackupHash } from './backupLink'

const ids = () => {
  let n = 0
  return () => `id-${++n}`
}

const DATA: StoredData = {
  version: 1,
  settings: { ...DEFAULT_SETTINGS, grantDay: '04-01', grantYears: { '2026-04-01': { grantDays: 20, entitlementMinutes: null } } },
  entries: [
    { id: 'a', date: '2026-05-01', leaveTypeId: PAID_LEAVE_TYPE_ID, amount: { unit: 'day' }, title: '連休 🎌' },
    { id: 'b', date: '2026-05-02', leaveTypeId: PAID_LEAVE_TYPE_ID, amount: { unit: 'half' }, title: '' },
  ],
}

const hashOf = (url: string) => url.slice(url.indexOf('#'))

test('控えのリンク: 作ったリンクのハッシュを読むと、同じ記録に戻る（id は振り直す）', async () => {
  const url = await makeBackupLink(DATA, 'https://example.test/')
  expect(url.startsWith(`https://example.test/${BACKUP_HASH_PREFIX}`)).toBe(true)
  expect(hashOf(url)).toMatch(/^#b1=[A-Za-z0-9_-]+$/)
  const r = await readBackupHash(hashOf(url), ids())
  expect(r.ok && r.value.entries.map((e) => [e.id, e.date, e.title])).toEqual([
    ['id-1', '2026-05-01', '連休 🎌'],
    ['id-2', '2026-05-02', ''],
  ])
  expect(r.ok && r.value.settings).toEqual(DATA.settings)
})

test('控えのリンク: 空の記録も往復する', async () => {
  const url = await makeBackupLink(EMPTY_STORED, 'https://example.test/')
  expect(await readBackupHash(hashOf(url), ids())).toEqual({ ok: true, value: EMPTY_STORED })
})

test('控えのリンク: 壊れたリンク・切れたリンク・知らない版は読めない（例外を出さない）', async () => {
  const hash = hashOf(await makeBackupLink(DATA, 'https://example.test/'))
  for (const bad of ['#b1=', '#b1=!!!', '#b1=AAAA', '#b2=' + hash.slice(4), hash.slice(0, hash.length - 3), hash.slice(0, 10), '#holidays']) {
    const r = await readBackupHash(bad, ids())
    expect(r.ok).toBe(false)
  }
})

test('控えのリンク: 展開すると上限（MAX_IMPORT_BYTES）を超えるリンクは、途中で止めて断る', async () => {
  // 同じ文字が続くと、小さく圧縮されて大きく膨らむ
  const bomb = new TextEncoder().encode('[1,[480,"",[],[],[],0],[' + '0,'.repeat(MAX_IMPORT_BYTES) + ']]')
  const payload = toBase64Url(await compress(bomb))
  expect(payload.length).toBeLessThan(100_000)
  const r = await readBackupHash(`${BACKUP_HASH_PREFIX}${payload}`, ids())
  expect(r.ok).toBe(false)
})
