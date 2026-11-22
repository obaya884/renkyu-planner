'use client'

import { useEffect, useState } from 'react'
import { newId } from '@/app/store/newId'
import { plannerStore } from '@/app/store/usePlanner'
import type { StoredData } from '@/domain/storage/stored'
import { isBackupHash } from '@/domain/transfer/backupLink'
import { readBackupHash } from './backupLink'
import { afterImport } from './transferState'
import { transferStore } from './useTransfer'

/** アドレスの欄から # のあとを消す。ページは読み直さない */
function clearHash(): void {
  const { pathname, search } = window.location
  window.history.replaceState(window.history.state, '', `${pathname}${search}`)
}

export type BackupLinkOpen = Readonly<{
  /** 確かめるモーダルに出す、リンクの中の記録 */
  pending: StoredData | null
  /** リンクを読めなかった */
  unreadable: boolean
  accept(): void
  dismiss(): void
}>

/**
 * 控えのリンク（試作）。主な画面を #b… 付きで開いたら、記録を読み終えたあとにリンクを展開・検証し、確かめる記録を返す。
 * 同じタブでハッシュだけが変わったとき（hashchange）も読む。読み込みはファイルの読み込みと同じ道（置き換えと「読み込む前に戻す」）
 */
export function useBackupLinkOnOpen(ready: boolean): BackupLinkOpen {
  const [pending, setPending] = useState<StoredData | null>(null)
  const [unreadable, setUnreadable] = useState(false)
  useEffect(() => {
    if (!ready) return
    let alive = true
    const read = async () => {
      const hash = window.location.hash
      if (!isBackupHash(hash)) return
      const r = await readBackupHash(hash, () => newId(crypto))
      if (!alive || window.location.hash !== hash) return
      if (r.ok) {
        setUnreadable(false)
        setPending(r.value)
      } else {
        clearHash()
        setPending(null)
        setUnreadable(true)
      }
    }
    void read()
    const onHashChange = () => void read()
    window.addEventListener('hashchange', onHashChange)
    return () => {
      alive = false
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [ready])
  return {
    pending,
    unreadable,
    accept() {
      if (pending === null) return
      const before = plannerStore.getState().data
      plannerStore.replaceAll(pending)
      // 戻せるかは、ストアが持った値と比べる（設定画面のファイルの読み込みと同じ）
      transferStore.set(afterImport(before, plannerStore.getState().data))
      setPending(null)
      clearHash()
    },
    dismiss() {
      setPending(null)
      clearHash()
    },
  }
}
