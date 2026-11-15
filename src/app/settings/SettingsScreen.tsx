'use client'

import { useEffect, useRef } from 'react'
import { Notices } from '@/app/components/Notices'
import { WeekStartRow } from '@/app/components/WeekStartRow'
import { WorkMinutesRow } from '@/app/components/WorkMinutesRow'
import { plannerStore, usePlanner } from '@/app/store/usePlanner'
import { T } from '@/app/texts'
import { useToday } from '@/app/store/useToday'
import type { HolidayData } from '@/domain/holidays/importCsv'

/** 開いているモーダル（1 つだけ）。節を足すタスクで種類を足す */
type SettingsSheet = null

/**
 * 設定画面（画面定義書 §6）。記録を読み終え、今日がそろうまでは何も描かない。
 * 「祝日について」（サーバーで描く）は page.tsx がこの部品の下に置く
 */
export function SettingsScreen({ holidays }: { holidays: HolidayData }) {
  const { ready, canSave, unreadable, data } = usePlanner()
  const today = useToday()
  const sheet: SettingsSheet = null
  const shown = ready && today !== null

  // 記録を読み終えると上の節の高さが増える。#holidays で開いたときは、描き終えたあとに 1 回だけ動かす
  const scrolled = useRef(false)
  useEffect(() => {
    if (!shown || scrolled.current) return
    scrolled.current = true
    if (window.location.hash === '#holidays') document.getElementById('holidays')?.scrollIntoView({ block: 'start' })
  }, [shown])

  if (!shown) return null
  // 節を足すタスクで holidays と sheet を使う。それまでは未使用の警告を避ける
  void holidays
  void sheet
  return (
    <div className="space-y-6">
      <Notices canSave={canSave} unreadable={unreadable} />
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-sub">{T.workMinutesLabel}</h2>
        <WorkMinutesRow workMinutes={data.settings.workMinutes} onChange={plannerStore.setWorkMinutes} />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-sub">{T.calendarLabel}</h2>
        <div className="text-sm text-sub">{T.weekStartLabel}</div>
        <WeekStartRow weekStart={data.settings.weekStart} onChange={plannerStore.setWeekStart} />
      </section>
    </div>
  )
}
