import { expect, test } from 'vitest'
import { createPlannerStore } from '@/app/store/createPlannerStore'
import { EMPTY_STORED } from '@/domain/storage/stored'
import { SHEET } from '@/domain/view/fixture'
import { createTransferStore } from './createTransferStore'
import { TRANSFER_IDLE, afterImport, keptAcrossScreens, canRestore } from './transferState'

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } }
const sheetData = { version: 1, settings: SHEET.settings, entries: SHEET.entries } as const
const entry = { date: '2026-11-20', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false } as const

/** 読み込んだ直後の 2 つのストア（設定画面の「読み込む」と同じ順で動かす） */
const imported = () => {
  let n = 0
  const planner = createPlannerStore(memory(), () => `id-${++n}`)
  planner.load()
  const transfer = createTransferStore(planner)
  const before = planner.getState().data
  planner.replaceAll(sheetData)
  transfer.set(afterImport(before, planner.getState().data))
  return { planner, transfer }
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
