import { expect, test } from 'vitest'
import { EMPTY_STORED, type StoredData, serializeStored } from '@/domain/storage/stored'
import { SHEET } from '@/domain/view/fixture'
import { TRANSFER_IDLE, afterClear, keptAcrossScreens, afterImport, afterNoCalendarEntries, afterRestore, afterUnreadable, canRestore, readPickedFile, showsClearHint, withCurrentData } from './transferState'

const sheetData = { version: 1, settings: SHEET.settings, entries: SHEET.entries } as const
const imported = afterImport(EMPTY_STORED, sheetData)
const readable = (data: StoredData) => ({ data, unreadable: false })

test('F-505・D-12: 選んだファイルは、読めないものと、確かめるものに分ける', () => {
  expect(readPickedFile(null)).toEqual({ kind: 'unreadable' })
  expect(readPickedFile('{oops')).toEqual({ kind: 'unreadable' })
  expect(readPickedFile(JSON.stringify({ version: 2, settings: {}, entries: [] }))).toEqual({ kind: 'unreadable' })
  expect(readPickedFile(serializeStored(sheetData))).toEqual({ kind: 'confirm', data: sheetData })
})
test('F-505・§6: 読み込むと「読み込みました」と「読み込む前に戻す」を出し、戻すと戻す先を捨てる', () => {
  expect(imported).toEqual({ note: 'imported', undo: { before: EMPTY_STORED, after: serializeStored(sheetData) } })
  expect(canRestore(imported)).toBe(true)
  expect(afterRestore()).toEqual({ note: 'restored', undo: null })
  expect(canRestore(afterRestore())).toBe(false)
})
test('§6: 節のボタンを押すと、1 行と「読み込む前に戻す」の両方を消す。読めないファイルの 1 行の下にも出さない', () => {
  expect(TRANSFER_IDLE).toEqual({ note: null, undo: null })
  expect(afterUnreadable()).toEqual({ note: 'unreadableFile', undo: null })
  expect(afterClear()).toEqual({ note: 'cleared', undo: null })
  expect(afterNoCalendarEntries()).toEqual({ note: 'noCalendarEntries', undo: null })
})
test('§6: 記録が変わったら戻す先を捨て、記録を元の中身に戻しても、もう出さない', () => {
  expect(withCurrentData(imported, readable(sheetData))).toBe(imported)
  const changed = withCurrentData(imported, readable({ ...sheetData, settings: { ...sheetData.settings, weekStart: 'sunday' } }))
  expect(changed).toEqual({ note: 'imported', undo: null })
  expect(canRestore(withCurrentData(changed, readable(sheetData)))).toBe(false)
  expect(withCurrentData(TRANSFER_IDLE, readable(sheetData))).toBe(TRANSFER_IDLE)
})
test('§6・D-5: 記録を読めなかったときは、中身が置き換えたあとと同じでも戻す先を捨てる', () => {
  const importedEmpty = afterImport(sheetData, EMPTY_STORED)
  expect(withCurrentData(importedEmpty, readable(EMPTY_STORED))).toBe(importedEmpty)
  expect(withCurrentData(importedEmpty, { data: EMPTY_STORED, unreadable: true })).toEqual({ note: 'imported', undo: null })
})
test('§6: 設定画面を離れても、戻せるあいだは「読み込みました」と「読み込む前に戻す」を残し、ほかの 1 行は消す', () => {
  expect(keptAcrossScreens(imported)).toBe(imported)
  expect(keptAcrossScreens(withCurrentData(imported, readable(EMPTY_STORED)))).toBe(TRANSFER_IDLE)
  expect(keptAcrossScreens(afterRestore())).toBe(TRANSFER_IDLE)
  expect(keptAcrossScreens(afterUnreadable())).toBe(TRANSFER_IDLE)
  expect(keptAcrossScreens(afterClear())).toBe(TRANSFER_IDLE)
  expect(keptAcrossScreens(afterNoCalendarEntries())).toBe(TRANSFER_IDLE)
})
test('§5.7・D-5: M-7 の添え書きは、記録を読めなかったときは出さない（書き出せるのは空の記録になる）', () => {
  expect(showsClearHint({ unreadable: false })).toBe(true)
  expect(showsClearHint({ unreadable: true })).toBe(false)
})
