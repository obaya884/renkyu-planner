'use client'

import { useEffect, useRef, useState } from 'react'
import { CompanyHolidaySheet } from '@/app/components/CompanyHolidaySheet'
import { GrantSheet } from '@/app/components/GrantSheet'
import { ImportSheet } from '@/app/components/ImportSheet'
import { LeaveTypeSheet } from '@/app/components/LeaveTypeSheet'
import { Notices } from '@/app/components/Notices'
import { SettingsSections } from '@/app/components/SettingsSections'
import { TransferSection } from '@/app/components/TransferSection'
import { plannerStore, usePlanner } from '@/app/store/usePlanner'
import { useToday } from '@/app/store/useToday'
import type { TransferNote } from '@/app/texts'
import { downloadText, readFileText } from '@/app/transfer/download'
import type { HolidayData } from '@/domain/holidays/importCsv'
import type { IsoDate } from '@/domain/shared/date'
import { STORAGE_LIMITS, canAdd } from '@/domain/storage/limits'
import { type StoredData, parseStored, serializeStored } from '@/domain/storage/stored'
import { recordFileName } from '@/domain/transfer/fileName'
import { importCounts } from '@/domain/transfer/importCounts'
import { buildGrantSection, companyHolidayRows, leaveTypeRows } from '@/domain/view/settingsView'

/** 開いているモーダル（1 つだけ）。節を足すタスクで種類を足す */
type SettingsSheet =
  | null
  | { kind: 'grant'; grantYearStart: IsoDate | null }
  | { kind: 'grantDay' }
  | { kind: 'companyHoliday'; index: number | null }
  | { kind: 'leaveType'; id: string | null }
  | { kind: 'import'; data: StoredData }

/** 読み込む前に戻すための記録（D-12）。after は置き換えたあとの記録の serializeStored で、記録がこれと違えば戻せない */
type Undo = { before: StoredData; after: string }

/**
 * 設定画面（画面定義書 §6）。記録を読み終え、今日がそろうまでは何も描かない。
 * 「祝日について」（サーバーで描く）は page.tsx がこの部品の下に置く
 */
export function SettingsScreen({ holidays }: { holidays: HolidayData }) {
  const { ready, canSave, unreadable, data } = usePlanner()
  const today = useToday()
  const [sheet, setSheet] = useState<SettingsSheet>(null)
  const [note, setNote] = useState<TransferNote | null>(null)
  const [undo, setUndo] = useState<Undo | null>(null)
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
  // §6: ほかの変更（ほかのタブの書き込みを D-8 で読み直したときを含む）で記録が変わると、戻せなくなる
  const canRestore = undo !== null && serializeStored(data) === undo.after
  // 節のボタンを押したら、まず節の 1 行と、戻すための記録を消す（「読み込む前に戻す」を除く）
  const resetTransfer = () => {
    setNote(null)
    setUndo(null)
  }
  const pickFile = async (file: File) => {
    // 読めないファイルなら記録も戻すための記録も変えない（D-12）
    setNote(null)
    const text = await readFileText(file)
    const parsed = text === null ? null : parseStored(text)
    if (parsed === null || !parsed.ok) return setNote('unreadableFile')
    setSheet({ kind: 'import', data: parsed.value })
  }
  return (
    <div className="space-y-6">
      <Notices canSave={canSave} unreadable={unreadable} />
      <SettingsSections
        grantView={grantView}
        workMinutes={data.settings.workMinutes}
        weekStart={data.settings.weekStart}
        companyHolidayRows={companyHolidayRows(data.settings)}
        companyHolidayFull={!canAdd(data.settings.companyHolidays.length, 1, STORAGE_LIMITS.companyHolidays)}
        leaveTypeRows={leaveRows}
        leaveTypeFull={!canAdd(data.settings.leaveTypes.length, 1, STORAGE_LIMITS.leaveTypes)}
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
      <TransferSection
        note={note}
        canRestore={canRestore}
        onExport={() => {
          resetTransfer()
          downloadText(recordFileName(today), serializeStored(data), 'application/json')
        }}
        onPickFile={(file) => void pickFile(file)}
        onRestore={() => {
          if (undo === null) return
          plannerStore.replaceAll(undo.before)
          setUndo(null)
          setNote('restored')
        }}
        onExportIcs={resetTransfer}
        onClear={resetTransfer}
      />
      {sheet?.kind === 'import' && (
        <ImportSheet
          counts={importCounts(sheet.data)}
          onSubmit={() => {
            setUndo({ before: data, after: serializeStored(sheet.data) })
            plannerStore.replaceAll(sheet.data)
            setSheet(null)
            setNote('imported')
          }}
          onClose={() => setSheet(null)}
        />
      )}
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
