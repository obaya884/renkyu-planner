import type { PlannerStore } from '@/app/store/createPlannerStore'
import { TRANSFER_IDLE, type TransferState, withCurrentData } from './transferState'

export type TransferStore = Readonly<{
  getState(): TransferState
  subscribe(listener: () => void): () => void
  set(next: TransferState): void
}>

/**
 * §6 の記録の持ち出しの節の状態を、画面をまたいでメモリに持つ（設定画面を離れても「読み込む前に戻す」を残すため）。
 * 保存はしないので、ページを閉じる・読み直すと消える。
 * 記録のストアが知らせるたびに withCurrentData を通し、主な画面やほかのタブで記録が変わったら戻すための記録を捨てる
 */
export function createTransferStore(planner: Pick<PlannerStore, 'getState' | 'subscribe'>): TransferStore {
  let state: TransferState = TRANSFER_IDLE
  const listeners = new Set<() => void>()
  const set = (next: TransferState) => {
    if (next === state) return
    state = next
    for (const listener of [...listeners]) listener()
  }
  planner.subscribe(() => set(withCurrentData(state, planner.getState().data)))
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    set,
  }
}
