'use client'

import { useSyncExternalStore } from 'react'
import { plannerStore } from '@/app/store/usePlanner'
import { createTransferStore } from './createTransferStore'
import { TRANSFER_IDLE, type TransferState } from './transferState'

/** モジュールの中に 1 つだけ置く。クライアント側の遷移では残り、ページを読み直すと作り直される */
export const transferStore = createTransferStore(plannerStore)

const idle = () => TRANSFER_IDLE

export function useTransfer(): TransferState {
  return useSyncExternalStore(transferStore.subscribe, transferStore.getState, idle)
}
