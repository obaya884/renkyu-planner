import type { TransferNote } from '@/app/texts'
import { type StoredData, parseStored, serializeStored } from '@/domain/storage/stored'

/** 読み込む前に戻すための記録（D-12）。after は置き換えたあとの記録の serializeStored */
export type Undo = Readonly<{ before: StoredData; after: string }>

/** §6 の記録の持ち出しの節の状態。節の 1 行と、読み込む前に戻すための記録 */
export type TransferState = Readonly<{ note: TransferNote | null; undo: Undo | null }>

/** §6: 節のどのボタンを押しても、この状態に戻す（1 行も「読み込む前に戻す」も消す） */
export const TRANSFER_IDLE: TransferState = { note: null, undo: null }

/** D-12: 選んだファイルの中身（readFileText の結果）を、読めないものと、M-6 で確かめるものに分ける */
export function readPickedFile(text: string | null): { kind: 'unreadable' } | { kind: 'confirm'; data: StoredData } {
  if (text === null) return { kind: 'unreadable' }
  const parsed = parseStored(text)
  return parsed.ok ? { kind: 'confirm', data: parsed.value } : { kind: 'unreadable' }
}

export function afterUnreadable(): TransferState {
  return { note: 'unreadableFile', undo: null }
}

/** before は置き換える前の記録、after は置き換えたあとの記録（ストアが持った値） */
export function afterImport(before: StoredData, after: StoredData): TransferState {
  return { note: 'imported', undo: { before, after: serializeStored(after) } }
}

export function afterRestore(): TransferState {
  return { note: 'restored', undo: null }
}

/** 消したあとに戻せると、消した意味が無くなる */
export function afterClear(): TransferState {
  return { note: 'cleared', undo: null }
}

/** §6: 記録が置き換えたあとの中身から変わったら、戻すための記録を捨てる（あとで元の中身に戻っても出さない）。変わらなければ同じ状態を返す */
export function withCurrentData(s: TransferState, data: StoredData): TransferState {
  if (s.undo === null || serializeStored(data) === s.undo.after) return s
  return { ...s, undo: null }
}

export function canRestore(s: TransferState): boolean {
  return s.undo !== null
}
