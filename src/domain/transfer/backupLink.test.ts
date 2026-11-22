import { expect, test } from 'vitest'
import { EMPTY_STORED, type StoredData } from '@/domain/storage/stored'
import { STORAGE_LIMITS } from '@/domain/storage/limits'
import { DEFAULT_SETTINGS, PAID_LEAVE_TYPE_ID } from '@/domain/types'
import {
  BACKUP_HASH_PREFIX,
  backupHashOf,
  backupPayloadOf,
  fromBase64Url,
  isBackupHash,
  packStored,
  toBase64Url,
  unpackStored,
} from './backupLink'

const ids = () => {
  let n = 0
  return () => `new-${++n}`
}

/** 日程・会社の休日・足した休暇の種類・半日・時間単位・日本語と絵文字の名前を含む記録 */
const SAMPLE: StoredData = {
  version: 1,
  settings: {
    workMinutes: 465,
    grantDay: '04-01',
    grantYears: {
      '2026-04-01': { grantDays: 20, entitlementMinutes: null },
      '2025-04-01': { grantDays: 18, entitlementMinutes: 9300 },
    },
    companyHolidays: [
      { kind: 'yearly', start: '12-30', end: '01-03', name: '年末年始 🎍' },
      { kind: 'once', start: '2026-08-13', end: '2026-08-14' },
    ],
    leaveTypes: [
      { id: PAID_LEAVE_TYPE_ID, name: '有休', days: 0, usable: null, grantDay: null, together: false },
      { id: 'c6f0b3c2-1111-4aaa-8bbb-000000000001', name: '夏休み☀️', days: 3, usable: { start: '07-01', end: '09-30' }, grantDay: null, together: true },
      { id: 'c6f0b3c2-1111-4aaa-8bbb-000000000002', name: 'リフレッシュ休暇', days: 5, usable: null, grantDay: '10-01', together: false },
    ],
    weekStart: 'sunday',
  },
  entries: [
    { id: 'e1', date: '2026-05-01', leaveTypeId: PAID_LEAVE_TYPE_ID, amount: { unit: 'day' }, title: '' },
    { id: 'e2', date: '2026-05-08', leaveTypeId: PAID_LEAVE_TYPE_ID, amount: { unit: 'half' }, title: '通院' },
    { id: 'e3', date: '2026-04-20', leaveTypeId: PAID_LEAVE_TYPE_ID, amount: { unit: 'minutes', minutes: 90 }, title: '役所 🏛️' },
    { id: 'e4', date: '2026-08-10', leaveTypeId: 'c6f0b3c2-1111-4aaa-8bbb-000000000001', amount: { unit: 'day' }, title: '帰省 🚄' },
    { id: 'e5', date: '2026-10-05', leaveTypeId: 'c6f0b3c2-1111-4aaa-8bbb-000000000002', amount: { unit: 'day' }, title: '' },
  ],
}

/** id を除いて比べる。休暇の種類の参照は、指す種類の名前に置き換えて比べる */
function withoutIds(d: StoredData) {
  const nameOf = (id: string) => d.settings.leaveTypes.find((t) => t.id === id)?.name
  return {
    ...d,
    settings: { ...d.settings, leaveTypes: d.settings.leaveTypes.map((t) => ({ ...t, id: undefined })) },
    entries: d.entries.map((e) => ({ ...e, id: undefined, leaveTypeId: nameOf(e.leaveTypeId) })),
  }
}

function unpacked(text: string, newId = ids()): StoredData {
  const r = unpackStored(text, newId)
  if (!r.ok) throw new Error(r.reason)
  return r.value
}

test('控えのリンク: 往復すると、id 以外が同じに戻る', () => {
  const back = unpacked(packStored(SAMPLE))
  expect(withoutIds(back)).toEqual(withoutIds(SAMPLE))
})

test('控えのリンク: 有休の id は paid のまま、ほかの休暇の種類と日程の id は振り直し、参照は保たれる', () => {
  const back = unpacked(packStored(SAMPLE))
  const [paid, summer, refresh] = back.settings.leaveTypes
  expect(paid.id).toBe(PAID_LEAVE_TYPE_ID)
  expect(summer.id).not.toBe(SAMPLE.settings.leaveTypes[1].id)
  expect(back.entries.map((e) => e.leaveTypeId)).toEqual([PAID_LEAVE_TYPE_ID, PAID_LEAVE_TYPE_ID, PAID_LEAVE_TYPE_ID, summer.id, refresh.id])
  expect(new Set(back.entries.map((e) => e.id)).size).toBe(5)
  expect(back.entries.every((e) => e.id.startsWith('new-'))).toBe(true)
})

test('控えのリンク: 詰めた形に日程の id を入れない', () => {
  const packed = packStored(SAMPLE)
  for (const e of SAMPLE.entries) expect(packed).not.toContain(`"${e.id}"`)
  for (const t of SAMPLE.settings.leaveTypes) expect(packed).not.toContain(t.id === PAID_LEAVE_TYPE_ID ? '"paid"' : t.id)
})

test('控えのリンク: 空の記録も往復する', () => {
  expect(unpacked(packStored(EMPTY_STORED))).toEqual(EMPTY_STORED)
  expect(unpacked(packStored({ version: 1, settings: { ...DEFAULT_SETTINGS }, entries: [] }))).toEqual(EMPTY_STORED)
})

test('控えのリンク: 壊れた中身は読めないとして断る（例外を出さない）', () => {
  for (const bad of ['', 'oops', '{}', 'null', '[]', '[1]', '[2,[],[]]', '[1,"x","y"]', JSON.stringify([1, [480], []])]) {
    expect(unpackStored(bad, ids()).ok).toBe(false)
  }
  // 日程の休暇の種類の番号が無い種類を指す
  const packed = JSON.parse(packStored(SAMPLE)) as unknown[]
  const entries = packed[2] as unknown[][]
  entries[0] = [entries[0][0], 9]
  expect(unpackStored(JSON.stringify(packed), ids()).ok).toBe(false)
})

test('控えのリンク: 途中で切れた中身は断る', () => {
  const packed = packStored(SAMPLE)
  for (const n of [1, 10, packed.length / 2, packed.length - 1]) expect(unpackStored(packed.slice(0, n), ids()).ok).toBe(false)
})

test('控えのリンク: 件数の上限（D-10）を超える日程は、id を振る前に断る', () => {
  let calls = 0
  const many = JSON.parse(packStored(EMPTY_STORED)) as unknown[]
  many[2] = Array.from({ length: STORAGE_LIMITS.entries + 1 }, () => [0])
  expect(unpackStored(JSON.stringify(many), () => `x${++calls}`).ok).toBe(false)
  expect(calls).toBe(0)
})

test('控えのリンク: base64url は +/= を使わず、往復する', () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i)
  const s = toBase64Url(bytes)
  expect(s).toMatch(/^[A-Za-z0-9_-]+$/)
  expect(fromBase64Url(s)).toEqual(bytes)
  for (const n of [0, 1, 2, 3, 4]) expect(fromBase64Url(toBase64Url(bytes.slice(0, n)))).toEqual(bytes.slice(0, n))
  expect(fromBase64Url('ab+c')).toBeNull()
  expect(fromBase64Url('ab=c')).toBeNull()
  expect(fromBase64Url('a')).toBeNull()
})

test('控えのリンク: ハッシュに版の番号を付け、知らない版や別のハッシュは中身として扱わない', () => {
  expect(BACKUP_HASH_PREFIX).toBe('#b1=')
  expect(backupHashOf('abc')).toBe('#b1=abc')
  expect(backupPayloadOf('#b1=abc')).toBe('abc')
  expect(isBackupHash('#b1=abc')).toBe(true)
  // 先の版のリンクは控えのリンクとして見分けるが、中身は読まない
  expect(isBackupHash('#b2=abc')).toBe(true)
  expect(backupPayloadOf('#b2=abc')).toBeNull()
  expect(isBackupHash('#holidays')).toBe(false)
  expect(isBackupHash('')).toBe(false)
})
