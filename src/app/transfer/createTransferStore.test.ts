import { expect, test } from 'vitest'
import { createPlannerStore } from '@/app/store/createPlannerStore'
import { memoryStorage } from '@/app/store/memoryStorage'
import { EMPTY_STORED, STORAGE_KEY, serializeStored } from '@/domain/storage/stored'
import type { StoredData } from '@/domain/storage/stored'
import { SHEET } from '@/domain/view/fixture'
import { createTransferStore } from './createTransferStore'
import { TRANSFER_IDLE, afterImport, keptAcrossScreens, canRestore } from './transferState'

const sheetData = { version: 1, settings: SHEET.settings, entries: SHEET.entries } as const
const entry = { date: '2026-11-20', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '' } as const

/** 読み込んだ直後の 2 つのストア（設定画面の「読み込む」と同じ順で動かす） */
const imported = (data: StoredData = sheetData) => {
  let n = 0
  const storage = memoryStorage()
  const planner = createPlannerStore(storage, () => `id-${++n}`)
  planner.load()
  const transfer = createTransferStore(planner)
  const before = planner.getState().data
  planner.replaceAll(data)
  transfer.set(afterImport(before, planner.getState().data))
  return { storage, planner, transfer }
}

test('§6: 設定画面を離れても、記録が変わらなければ「読み込む前に戻す」を残す（見るだけの読み直しでも消えない）', () => {
  const { planner, transfer } = imported()
  transfer.set(keptAcrossScreens(transfer.getState()))
  planner.reload()
  expect(transfer.getState().note).toBe('imported')
  expect(canRestore(transfer.getState())).toBe(true)
  expect(transfer.getState().undo?.before).toEqual(EMPTY_STORED)
})
test('§6: 主な画面で記録を変えたら「読み込む前に戻す」を消し、元の中身に戻しても出さない', () => {
  const { planner, transfer } = imported()
  transfer.set(keptAcrossScreens(transfer.getState()))
  planner.addEntries([entry])
  expect(canRestore(transfer.getState())).toBe(false)
  const added = planner.getState().data.entries.find((e) => e.date === entry.date)
  planner.removeEntry(added?.id ?? '')
  expect(planner.getState().data).toEqual(sheetData)
  expect(canRestore(transfer.getState())).toBe(false)
  // 設定画面に戻ったとき、「読み込みました」だけを残さない
  expect(transfer.getState()).toEqual({ note: 'imported', undo: null })
  transfer.set(keptAcrossScreens(transfer.getState()))
  expect(transfer.getState()).toBe(TRANSFER_IDLE)
})
test('§6: 状態が変わったときだけ知らせる', () => {
  const { planner, transfer } = imported()
  let calls = 0
  const unsubscribe = transfer.subscribe(() => void calls++)
  planner.reload()
  expect(calls).toBe(0)
  planner.setWeekStart('sunday')
  expect(calls).toBe(1)
  unsubscribe()
  transfer.set(TRANSFER_IDLE)
  expect(calls).toBe(1)
})
test('§6・D-8: ほかのタブで記録を変えたら、読み直したときに「読み込む前に戻す」を消す', () => {
  const { storage, planner, transfer } = imported()
  storage.setItem(STORAGE_KEY, serializeStored({ ...sheetData, settings: { ...sheetData.settings, weekStart: 'sunday' } }))
  planner.reload()
  expect(canRestore(transfer.getState())).toBe(false)
})
test('§6・D-13: 記録をすべて消したあとは、戻す先が無い', () => {
  const { planner, transfer } = imported()
  planner.clearAll()
  expect(canRestore(transfer.getState())).toBe(false)
})
test('§6・D-5: 空の記録を読み込んだ直後に、ほかのタブが読めない記録を書いたら、戻す先を消す', () => {
  const { storage, planner, transfer } = imported(EMPTY_STORED)
  expect(canRestore(transfer.getState())).toBe(true)
  storage.setItem(STORAGE_KEY, '{oops')
  planner.reload()
  // 読めなかった記録は空の記録として持つので、中身だけを比べると置き換えたあとと同じに見える
  expect(planner.getState()).toMatchObject({ data: EMPTY_STORED, unreadable: true })
  expect(canRestore(transfer.getState())).toBe(false)
})
