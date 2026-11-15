'use client'

import { useEffect, useRef, useState } from 'react'
import { CompanyHolidaySheet } from '@/app/components/CompanyHolidaySheet'
import { GrantSheet } from '@/app/components/GrantSheet'
import { LeaveTypeSheet } from '@/app/components/LeaveTypeSheet'
import { Notices } from '@/app/components/Notices'
import { SettingsSections } from '@/app/components/SettingsSections'
import { plannerStore, usePlanner } from '@/app/store/usePlanner'
import { useToday } from '@/app/store/useToday'
import type { HolidayData } from '@/domain/holidays/importCsv'
import type { IsoDate } from '@/domain/shared/date'
import { buildGrantSection, companyHolidayRows, leaveTypeRows } from '@/domain/view/settingsView'

/** 開いているモーダル（1 つだけ）。節を足すタスクで種類を足す */
type SettingsSheet = null | { kind: 'grant'; grantYearStart: IsoDate | null } | { kind: 'grantDay' } | { kind: 'companyHoliday'; index: number | null } | { kind: 'leaveType'; id: string | null }

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
  const leaveRows = leaveTypeRows(input)
  const grantView = buildGrantSection(input)
  return (
    <div className="space-y-6">
      <Notices canSave={canSave} unreadable={unreadable} />
      <SettingsSections
        grantView={grantView}
        workMinutes={data.settings.workMinutes}
        weekStart={data.settings.weekStart}
        companyHolidayRows={companyHolidayRows(data.settings)}
        leaveTypeRows={leaveRows}
        onOpenGrant={(grantYearStart) => setSheet({ kind: 'grant', grantYearStart })}
        onFirstGrant={() => setSheet({ kind: 'grant', grantYearStart: null })}
        onChangeGrantDay={() => setSheet({ kind: 'grantDay' })}
        onChangeWorkMinutes={plannerStore.setWorkMinutes}
        onChangeWeekStart={plannerStore.setWeekStart}
        onOpenCompanyHoliday={(index) => setSheet({ kind: 'companyHoliday', index })}
        onAddCompanyHoliday={() => setSheet({ kind: 'companyHoliday', index: null })}
        onOpenLeaveType={(id) => setSheet({ kind: 'leaveType', id })}
        onAddLeaveType={() => setSheet({ kind: 'leaveType', id: null })}
      />
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
          hasEntries={leaveRows.find((r) => r.type.id === sheet.id)?.hasEntries ?? false}
          today={today}
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
      {sheet?.kind === 'grantDay' && grantView !== null && (
        <GrantSheet
          key="grantDay"
          input={input}
          grantYearStart={grantView.current.start}
          changeDay
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
