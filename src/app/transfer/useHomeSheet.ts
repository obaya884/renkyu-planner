'use client'

import { useSyncExternalStore } from 'react'
import { makeBackupLink } from './backupLink'
import { type HomeSheetView, createHomeSheetStore } from './createHomeSheetStore'
import { clearHash } from './useBackupLink'

// 控えは主な画面（/）に付ける。設定画面の入口も主な画面へ移ってから開くので、ホーム画面のアプリは / で開く
const base = () => `${window.location.origin}/`

/**
 * ホーム画面に追加する手順のモーダル（試作）。主な画面と設定画面の入口の両方から開くので、モジュールの中に 1 つだけ置く。
 * 控えを入れるのは「記録も一緒に移す」を押してから、このモーダルを閉じるまで
 */
export const homeSheetStore = createHomeSheetStore({
  makeLink: (data) => makeBackupLink(data, base()),
  baseLength: () => base().length,
  putHash(hash) {
    const { pathname, search } = window.location
    window.history.replaceState(window.history.state, '', `${pathname}${search}${hash}`)
  },
  clearHash,
})

const none = () => null

export function useHomeSheet(): HomeSheetView | null {
  return useSyncExternalStore(homeSheetStore.subscribe, homeSheetStore.getState, none)
}
