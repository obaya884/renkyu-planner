import type { TransferNote } from '@/app/texts'
import { type StoredData, parseStored, serializeStored } from '@/domain/storage/stored'
import { MAX_BACKUP_LINK_LENGTH } from '@/domain/transfer/backupLink'

/** 読み込む前に戻すための記録（D-12）。after は置き換えたあとの記録の serializeStored */
export type Undo = Readonly<{ before: StoredData; after: string }>

/** 控えのリンク（試作）を作ったあとに節に出すもの。長さと、選べる欄に出すリンク（欄を出さないときは null） */
export type LinkShown = Readonly<{ length: number; url: string | null }>

/** §6 の記録の持ち出しの節の状態。節の 1 行と、読み込む前に戻すための記録。link は控えのリンク（試作）を作ったときだけ持つ */
export type TransferState = Readonly<{ note: TransferNote | null; undo: Undo | null; link?: LinkShown }>

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

/** §6・E-5: これからの予定が無く、カレンダー用のファイルを作らなかった */
export function afterNoCalendarEntries(): TransferState {
  return { note: 'noCalendarEntries', undo: null }
}

/** 消したあとに戻せると、消した意味が無くなる */
export function afterClear(): TransferState {
  return { note: 'cleared', undo: null }
}

/**
 * §6: 記録が置き換えたあとの中身から変わったら、戻すための記録を捨てる（あとで元の中身に戻っても出さない）。変わらなければ同じ状態を返す。
 * 記録を読めなかったとき（D-5）も捨てる。読めなかった記録は空の記録として持つので、中身だけを比べると、空の記録を読み込んだあとと同じに見える
 */
export function withCurrentData(s: TransferState, current: Readonly<{ data: StoredData; unreadable: boolean }>): TransferState {
  if (s.undo === null || (!current.unreadable && serializeStored(current.data) === s.undo.after)) return s
  return { ...s, undo: null }
}

export function canRestore(s: TransferState): boolean {
  return s.undo !== null
}

/**
 * §6: 画面をまたいで残すものだけにする。設定画面を離れたら節の 1 行を消すが、戻せるあいだは「読み込みました」と「読み込む前に戻す」を残す。
 * 設定画面に入るときにも通す（主な画面で記録が変わって戻せなくなったときに、「読み込みました」だけが残らないように）
 */
export function keptAcrossScreens(s: TransferState): TransferState {
  return s.undo === null ? TRANSFER_IDLE : s
}

/** §5.7: M-7 の添え書き（書き出しておけば戻せる）を出すか。記録を読めなかったとき（D-5）に書き出せるのは空の記録なので出さない */
export function showsClearHint(planner: Readonly<{ unreadable: boolean }>): boolean {
  return !planner.unreadable
}

/** 控えのリンク（試作）の渡し方。shared は共有シート、copied はクリップボード、manual は選べる欄、tooLong は長すぎて渡さない */
export type LinkDelivery = 'shared' | 'copied' | 'manual' | 'tooLong'

/** 控えのリンク（試作）が長すぎて、作らない（渡さない）か */
export function isBackupLinkTooLong(url: string): boolean {
  return url.length > MAX_BACKUP_LINK_LENGTH
}

/** 控えのリンク（試作）を作ったあと。長さはいつも出し、欄に出すのは manual のときだけ */
export function afterBackupLink(url: string, how: LinkDelivery): TransferState {
  const note: TransferNote | null = how === 'copied' ? 'linkCopied' : how === 'tooLong' ? 'linkTooLong' : null
  return { note, undo: null, link: { length: url.length, url: how === 'manual' ? url : null } }
}

/** 控えのリンク（試作）を作れなかった（CompressionStream が無いブラウザなど） */
export function afterBackupLinkFailed(): TransferState {
  return { note: 'linkFailed', undo: null }
}
