'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ClearSheet } from '@/app/components/ClearSheet'
import { CompanyHolidaySheet } from '@/app/components/CompanyHolidaySheet'
import { GrantSheet } from '@/app/components/GrantSheet'
import { ImportSheet } from '@/app/components/ImportSheet'
import { LeaveTypeSheet } from '@/app/components/LeaveTypeSheet'
import { Notices } from '@/app/components/Notices'
import { SettingsSections } from '@/app/components/SettingsSections'
import { TransferSection } from '@/app/components/TransferSection'
import { plannerStore, usePlanner } from '@/app/store/usePlanner'
import { useToday } from '@/app/store/useToday'
import { makeBackupLink } from '@/app/transfer/backupLink'
import { calendarEventsOf } from '@/app/transfer/calendarEvents'
import { downloadText, readFileText } from '@/app/transfer/download'
import { deliverLink } from '@/app/transfer/shareLink'
import {
  TRANSFER_IDLE,
  afterBackupLink,
  afterBackupLinkFailed,
  afterClear,
  afterImport,
  afterNoCalendarEntries,
  afterRestore,
  afterUnreadable,
  canRestore,
  isBackupLinkTooLong,
  keptAcrossScreens,
  readPickedFile,
  showsClearHint,
} from '@/app/transfer/transferState'
import { transferStore, useTransfer } from '@/app/transfer/useTransfer'
import type { HolidayData } from '@/domain/holidays/importCsv'
import type { IsoDate } from '@/domain/shared/date'
import { STORAGE_LIMITS, canAdd } from '@/domain/storage/limits'
import { type StoredData, serializeStored } from '@/domain/storage/stored'
import { icsFileName, recordFileName } from '@/domain/transfer/fileName'
import { buildIcs, icsStamp } from '@/domain/transfer/ics'
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
  | { kind: 'clear' }

/** 控えのリンクの # の前。リンクは主な画面（/）を開く */
function backupLinkBase(): string {
  return `${window.location.origin}/`
}

/**
 * 設定画面（画面定義書 §6）。記録を読み終え、今日がそろうまでは何も描かない。
 * 「祝日について」（サーバーで描く）は page.tsx がこの部品の下に置く
 */
export function SettingsScreen({ holidays }: { holidays: HolidayData }) {
  const { ready, canSave, unreadable, data } = usePlanner()
  const today = useToday()
  const [sheet, setSheet] = useState<SettingsSheet>(null)
  // §6: 節の状態は画面をまたいで残す（設定画面を離れても「読み込む前に戻す」を出すため）。記録が変わったら transferStore が戻す先を捨てる
  const transfer = useTransfer()
  const setTransfer = transferStore.set
  // 入力欄（所定労働時間など）は props を初期値にだけ使う。記録が外から変わったら、この番号を増やして作り直す（§6）
  const [fieldsKey, setFieldsKey] = useState(0)
  // 所定労働時間の欄が出している値。欄が自分で変えた値と違う値が記録に入ったら（D-8 の読み直しなど）、欄を作り直す
  const [fieldWorkMinutes, setFieldWorkMinutes] = useState<number | null>(null)
  const shown = ready && today !== null
  // 控えのリンク（試作）は記録が変わるたびに先に作っておく。押してから圧縮を待つと、スマホのブラウザが
  // 「押した直後」とみなさなくなり、共有シートやクリップボードを断ることがあるため
  const [prepared, setPrepared] = useState<{ data: StoredData; url: string } | null>(null)
  useEffect(() => {
    if (!ready) return
    let alive = true
    makeBackupLink(data, backupLinkBase()).then(
      (url) => alive && setPrepared({ data, url }),
      () => {},
    )
    return () => {
      alive = false
    }
  }, [ready, data])

  // §6: 設定画面に入るときと離れるときに、節の 1 行を消す（戻せるあいだの「読み込みました」と「読み込む前に戻す」は残す）。
  // 描く前に整えるので useLayoutEffect にする
  useLayoutEffect(() => {
    const settle = () => transferStore.set(keptAcrossScreens(transferStore.getState()))
    settle()
    return settle
  }, [])

  // 記録を読み終えると上の節の高さが増える。#holidays で開いたときは、描き終えたあとに 1 回だけ動かす
  const scrolled = useRef(false)
  useEffect(() => {
    if (!shown || scrolled.current) return
    scrolled.current = true
    if (window.location.hash === '#holidays') document.getElementById('holidays')?.scrollIntoView({ block: 'start' })
  }, [shown])

  if (!shown) return null
  if (fieldWorkMinutes !== data.settings.workMinutes) {
    if (fieldWorkMinutes !== null) setFieldsKey((k) => k + 1)
    setFieldWorkMinutes(data.settings.workMinutes)
  }
  const rebuildFields = () => setFieldsKey((k) => k + 1)
  const input = { holidays, settings: data.settings, entries: data.entries, today }
  const leaveRows = leaveTypeRows(input)
  const grantView = buildGrantSection(input)
  // §6: 節のボタンを押したら、まず節の 1 行と、戻すための記録を消す（「読み込む前に戻す」を除く）
  const resetTransfer = () => setTransfer(TRANSFER_IDLE)
  const makeLink = async () => {
    resetTransfer()
    let url: string
    try {
      url = prepared?.data === data ? prepared.url : await makeBackupLink(data, backupLinkBase())
    } catch {
      return setTransfer(afterBackupLinkFailed())
    }
    if (isBackupLinkTooLong(url)) return setTransfer(afterBackupLink(url, 'tooLong'))
    setTransfer(afterBackupLink(url, await deliverLink(url)))
  }
  const pickFile = async (file: File) => {
    const picked = readPickedFile(await readFileText(file))
    if (picked.kind === 'unreadable') return setTransfer(afterUnreadable())
    setSheet({ kind: 'import', data: picked.data })
  }
  return (
    <div className="space-y-6">
      <Notices canSave={canSave} unreadable={unreadable} />
      <SettingsSections
        key={fieldsKey}
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
        onChangeWorkMinutes={(minutes) => {
          // 欄が自分で変えた値なので、作り直さない
          setFieldWorkMinutes(minutes)
          plannerStore.setWorkMinutes(minutes)
        }}
        onChangeWeekStart={plannerStore.setWeekStart}
        onOpenCompanyHoliday={(index) => setSheet({ kind: 'companyHoliday', index })}
        onAddCompanyHoliday={() => setSheet({ kind: 'companyHoliday', index: null })}
        onOpenLeaveType={(id) => setSheet({ kind: 'leaveType', id })}
        onAddLeaveType={() => setSheet({ kind: 'leaveType', id: null })}
      />
      <TransferSection
        note={transfer.note}
        canRestore={canRestore(transfer)}
        link={transfer.link ?? null}
        onMakeLink={() => void makeLink()}
        onExport={() => {
          resetTransfer()
          downloadText(recordFileName(today), serializeStored(data), 'application/json')
        }}
        onStartImport={resetTransfer}
        onPickFile={(file) => void pickFile(file)}
        onRestore={() => {
          if (transfer.undo === null) return
          plannerStore.replaceAll(transfer.undo.before)
          setTransfer(afterRestore())
          rebuildFields()
        }}
        onExportIcs={() => {
          resetTransfer()
          const events = calendarEventsOf(data.entries, data.settings, today)
          if (events.length === 0) return setTransfer(afterNoCalendarEntries())
          downloadText(icsFileName(today), buildIcs(events, icsStamp(new Date().toISOString())), 'text/calendar')
        }}
        onClear={() => {
          resetTransfer()
          setSheet({ kind: 'clear' })
        }}
      />
      {sheet?.kind === 'clear' && (
        <ClearSheet
          showHint={showsClearHint({ unreadable })}
          onSubmit={() => {
            plannerStore.clearAll()
            setSheet(null)
            setTransfer(afterClear())
            rebuildFields()
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'import' && (
        <ImportSheet
          counts={importCounts(sheet.data)}
          onSubmit={() => {
            plannerStore.replaceAll(sheet.data)
            // 戻せるかは、ストアが持った値と比べる
            setTransfer(afterImport(data, plannerStore.getState().data))
            setSheet(null)
            rebuildFields()
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
