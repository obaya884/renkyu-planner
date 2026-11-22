'use client'

import { useEffect, useState } from 'react'
import { homeScreenStore } from '@/app/store/useHomeScreenFlags'
import { newId } from '@/app/store/newId'
import { plannerStore } from '@/app/store/usePlanner'
import type { StoredData } from '@/domain/storage/stored'
import { isBackupHash } from '@/domain/transfer/backupLink'
import { type HomeScreenAudience, backupMarkOf } from '@/domain/transfer/homeScreen'
import { readBackupHash } from './backupLink'
import { afterImport } from './transferState'
import { transferStore } from './useTransfer'

/** アドレスの欄から # のあとを消す。ページは読み直さない */
export function clearHash(): void {
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
 * 同じタブでハッシュだけが変わったとき（hashchange）も読む。読み込みはファイルの読み込みと同じ道（置き換えと「読み込む前に戻す」）。
 * ホーム画面のアプリ（audience が homeApp）は、追加したときのアドレス（# のあとに控え）で毎回開くので、読み込んだか「やめる」を押した控えの
 * 目印を覚え、同じ控えなら何も出さない。audience が分かるまで（null のあいだ）は読まない
 */
export function useBackupLinkOnOpen(ready: boolean, audience: HomeScreenAudience | null): BackupLinkOpen {
  const [pending, setPending] = useState<StoredData | null>(null)
  const [unreadable, setUnreadable] = useState(false)
  // 確かめている控えの目印（ホーム画面のアプリのときだけ覚える）
  const [mark, setMark] = useState<string | null>(null)
  useEffect(() => {
    if (!ready || audience === null) return
    let alive = true
    const read = async () => {
      const hash = window.location.hash
      if (!isBackupHash(hash)) return
      const m = audience === 'homeApp' ? backupMarkOf(hash) : null
      if (m !== null && homeScreenStore.seenBackup(m)) return clearHash()
      const r = await readBackupHash(hash, () => newId(crypto))
      if (!alive || window.location.hash !== hash) return
      if (r.ok) {
        setUnreadable(false)
        setMark(m)
        setPending(r.value)
      } else {
        // ホーム画面のアプリでは、読めない控えも覚え、開くたびに知らせない
        if (m !== null) homeScreenStore.rememberBackup(m)
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
  }, [ready, audience])
  const remember = () => {
    if (mark !== null) homeScreenStore.rememberBackup(mark)
    setMark(null)
  }
  return {
    pending,
    unreadable,
    accept() {
      if (pending === null) return
      const before = plannerStore.getState().data
      plannerStore.replaceAll(pending)
      // 戻せるかは、ストアが持った値と比べる（設定画面のファイルの読み込みと同じ）
      transferStore.set(afterImport(before, plannerStore.getState().data))
      remember()
      setPending(null)
      clearHash()
    },
    dismiss() {
      remember()
      setPending(null)
      clearHash()
    },
  }
}
