'use client'

import { useSyncExternalStore } from 'react'
import { plannerStore } from '@/app/store/usePlanner'
import { createTransferStore } from './createTransferStore'
import { TRANSFER_IDLE, type TransferState } from './transferState'

/**
 * 記録の持ち出しの節の状態（§6）を、モジュールの中に 1 つだけ置く。クライアント側の遷移では残り、ページを読み直すと作り直される。
 * 設定画面を離れたあとに残るのは、戻せるあいだの 1 行（「読み込みました」と「読み込む前に戻す」）だけ。ほかの 1 行は SettingsScreen が離れるときに消す
 */
export const transferStore = createTransferStore(plannerStore)

const idle = () => TRANSFER_IDLE

export function useTransfer(): TransferState {
  return useSyncExternalStore(transferStore.subscribe, transferStore.getState, idle)
}
