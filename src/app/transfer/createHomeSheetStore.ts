import type { StoredData } from '@/domain/storage/stored'
import { homeSheetStart, isBlankStored, moveLinkView } from '@/domain/transfer/homeScreen'

/**
 * ホーム画面に追加する手順のモーダル（試作）が見せるもの。
 * steps は手順の 3 歩だけ、choose は記録も一緒に移すかを聞く（preparing のあいだは移す控えを作っている）、
 * ready はアドレスに控えを入れたあと、noMove は控えが長すぎる・作れないので移す道を出さないとき
 */
export type HomeSheetView =
  | Readonly<{ kind: 'steps' }>
  | Readonly<{ kind: 'choose'; entryCount: number; preparing: boolean }>
  | Readonly<{ kind: 'ready' }>
  | Readonly<{ kind: 'noMove'; reason: 'tooLong' | 'failed' }>

export type HomeSheetStore = Readonly<{
  getState(): HomeSheetView | null
  subscribe(listener: () => void): () => void
  open(data: StoredData): void
  /** 「記録も一緒に移す」。アドレスの # のあとに控えを入れる */
  move(): void
  /** 「記録は移さずに、手順だけ見る」 */
  skip(): void
  /** やめる・閉じる（Esc とモーダルの外を含む）。入れた控えはアドレスから消す */
  close(): void
}>

export type HomeSheetIo = Readonly<{
  /** 記録から控えのリンク（# の前を含む全体）を作る */
  makeLink(data: StoredData): Promise<string>
  /** makeLink が付けた # の前の長さ。# のあとだけを取り出すのに使う */
  baseLength(): number
  putHash(hash: string): void
  clearHash(): void
}>

/** 主な画面と設定画面の入口から開くので、モジュールの中に 1 つだけ置く（useHomeSheet.ts） */
export function createHomeSheetStore(io: HomeSheetIo): HomeSheetStore {
  let view: HomeSheetView | null = null
  let hash: string | null = null
  let hashPut = false
  // 開き直したら、前に作りかけていた控えを捨てる
  let token = 0
  const listeners = new Set<() => void>()
  const publish = (next: HomeSheetView | null) => {
    view = next
    for (const listener of [...listeners]) listener()
  }
  return {
    getState: () => view,
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    open(data) {
      const mine = ++token
      hash = null
      if (homeSheetStart(isBlankStored(data)) === 'steps') return publish({ kind: 'steps' })
      const entryCount = data.entries.length
      publish({ kind: 'choose', entryCount, preparing: true })
      io.makeLink(data).then(
        (url) => {
          if (mine !== token || view === null) return
          if (moveLinkView(url) === 'tooLong') return publish({ kind: 'noMove', reason: 'tooLong' })
          hash = url.slice(io.baseLength())
          publish({ kind: 'choose', entryCount, preparing: false })
        },
        () => {
          if (mine !== token || view === null) return
          publish({ kind: 'noMove', reason: 'failed' })
        },
      )
    },
    move() {
      if (view?.kind !== 'choose' || hash === null) return
      io.putHash(hash)
      hashPut = true
      publish({ kind: 'ready' })
    },
    skip() {
      if (view?.kind !== 'choose') return
      publish({ kind: 'steps' })
    },
    close() {
      token++
      if (hashPut) io.clearHash()
      hashPut = false
      hash = null
      publish(null)
    },
  }
}
