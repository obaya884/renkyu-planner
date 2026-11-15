'use client'

import { useEffect, useRef, useState } from 'react'
import { CompanyHolidaySection } from '@/app/components/CompanyHolidaySection'
import { CompanyHolidaySheet } from '@/app/components/CompanyHolidaySheet'
import { GrantSection } from '@/app/components/GrantSection'
import { GrantSheet } from '@/app/components/GrantSheet'
import { LeaveTypeSection } from '@/app/components/LeaveTypeSection'
import { LeaveTypeSheet } from '@/app/components/LeaveTypeSheet'
import { Notices } from '@/app/components/Notices'
import { WeekStartRow } from '@/app/components/WeekStartRow'
import { WorkMinutesRow } from '@/app/components/WorkMinutesRow'
import { plannerStore, usePlanner } from '@/app/store/usePlanner'
import { T } from '@/app/texts'
import { useToday } from '@/app/store/useToday'
import type { HolidayData } from '@/domain/holidays/importCsv'
import type { IsoDate } from '@/domain/shared/date'
import { buildGrantSection, companyHolidayRows, leaveTypeRows } from '@/domain/view/settingsView'

/** 開いているモーダル（1 つだけ）。節を足すタスクで種類を足す */
type SettingsSheet = null | { kind: 'grant'; grantYearStart: IsoDate | null } | { kind: 'companyHoliday'; index: number | null } | { kind: 'leaveType'; id: string | null }

/**
 * 設定画面（画面定義書 §6）。記録を読み終え、今日がそろうまでは何も描かない。
 * 「祝日について」（サーバーで描く）は page.tsx がこの部品の下に置く
 */
export function SettingsScreen({ holidays }: { holidays: HolidayData }) {
  const { ready, canSave, unreadable, data } = usePlanner()
  const today = useToday()
  const [sheet, setSheet] = useState<SettingsSheet>(null)
  const shown = ready && today !== null

  // 記録を読み終えると上の節の高さが増える。#holidays で開いたときは、描き終えたあとに 1 回だけ動かす
  const scrolled = useRef(false)
  useEffect(() => {
    if (!shown || scrolled.current) return
    scrolled.current = true
    if (window.location.hash === '#holidays') document.getElementById('holidays')?.scrollIntoView({ block: 'start' })
  }, [shown])

  if (!shown) return null
  const input = { holidays, settings: data.settings, entries: data.entries, today }
  return (
    <div className="space-y-6">
      <Notices canSave={canSave} unreadable={unreadable} />
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-sub">{T.paidSection}</h2>
        <GrantSection
          view={buildGrantSection(input)}
          workMinutes={data.settings.workMinutes}
          onOpen={(grantYearStart) => setSheet({ kind: 'grant', grantYearStart })}
          onFirst={() => setSheet({ kind: 'grant', grantYearStart: null })}
        />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-sub">{T.companyHolidaySection}</h2>
        <CompanyHolidaySection
          rows={companyHolidayRows(data.settings)}
          onOpen={(index) => setSheet({ kind: 'companyHoliday', index })}
          onAdd={() => setSheet({ kind: 'companyHoliday', index: null })}
        />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-sub">{T.leaveTypeSection}</h2>
        <LeaveTypeSection
          rows={leaveTypeRows(input)}
          onOpen={(id) => setSheet({ kind: 'leaveType', id })}
          onAdd={() => setSheet({ kind: 'leaveType', id: null })}
        />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-sub">{T.workMinutesLabel}</h2>
        <WorkMinutesRow workMinutes={data.settings.workMinutes} onChange={plannerStore.setWorkMinutes} />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-sub">{T.calendarLabel}</h2>
        <div className="text-sm text-sub">{T.weekStartLabel}</div>
        <WeekStartRow weekStart={data.settings.weekStart} onChange={plannerStore.setWeekStart} />
      </section>
      {sheet?.kind === 'companyHoliday' && (
        <CompanyHolidaySheet
          key={sheet.index ?? 'new'}
          holiday={sheet.index === null ? null : (data.settings.companyHolidays[sheet.index] ?? null)}
          today={today}
          onSubmit={(h) => {
            plannerStore.saveCompanyHoliday(sheet.index, h)
            setSheet(null)
          }}
          onRemove={() => {
            if (sheet.index !== null) plannerStore.removeCompanyHoliday(sheet.index)
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'leaveType' && (
        <LeaveTypeSheet
          key={sheet.id ?? 'new'}
          type={sheet.id === null ? null : (data.settings.leaveTypes.find((t) => t.id === sheet.id) ?? null)}
          hasEntries={sheet.id !== null && data.entries.some((e) => e.leaveTypeId === sheet.id)}
          onSubmit={(d) => {
            plannerStore.saveLeaveType(sheet.id, d)
            setSheet(null)
          }}
          onRemove={() => {
            if (sheet.id !== null) plannerStore.removeLeaveType(sheet.id)
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'grant' && (
        <GrantSheet
          key={sheet.grantYearStart ?? 'first'}
          input={input}
          grantYearStart={sheet.grantYearStart}
          onSubmit={(draft, grantYearStart) => {
            plannerStore.setGrant(draft, grantYearStart)
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}
