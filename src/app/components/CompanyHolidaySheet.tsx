'use client'

import { useState } from 'react'
import { FIELD_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, Sheet, SheetButtons, SheetTitle } from '@/app/components/Sheet'
import { T, errorText } from '@/app/texts'
import { checkCompanyHoliday, clampMonthDay, monthDayChoices } from '@/domain/entries/settingsInput'
import type { IsoDate } from '@/domain/shared/date'
import type { CompanyHoliday } from '@/domain/types'

type Props = {
  holiday: CompanyHoliday | null
  today: IsoDate
  onSubmit: (h: CompanyHoliday) => void
  onRemove: () => void
  onClose: () => void
}

type Md = { month: number; day: number }
const pad = (n: number) => String(n).padStart(2, '0')
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const toMd = (md: string): Md => ({ month: Number(md.slice(0, 2)), day: Number(md.slice(3, 5)) })
const fromMd = (v: Md) => `${pad(v.month)}-${pad(v.day)}`

/** 月と日の選択。日の選択肢は選んだ月の末日まで（2 月は 29 日まで） */
function MonthDayPicker({ label, value, onChange }: { label: string; value: Md; onChange: (v: Md) => void }) {
  return (
    <fieldset>
      <legend className="text-sm text-sub">{label}</legend>
      <div className="flex items-center gap-2">
        <select
          aria-label={`${label} ${T.monthUnit}`}
          value={value.month}
          onChange={(e) => {
            const month = Number(e.target.value)
            onChange({ month, day: clampMonthDay(month, value.day) })
          }}
          className={`${FIELD_CLASS} w-20`}
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {T.monthUnit}
        <select aria-label={`${label} ${T.dayUnit}`} value={value.day} onChange={(e) => onChange({ ...value, day: Number(e.target.value) })} className={`${FIELD_CLASS} w-20`}>
          {monthDayChoices(value.month).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {T.dayUnit}
      </div>
    </fieldset>
  )
}

/** §5.4 の中身。入力欄の値だけを状態に持つ。検証は domain の checkCompanyHoliday を呼ぶだけ */
export function CompanyHolidaySheetBody({ holiday, today, onSubmit, onRemove, onClose }: Props) {
  const todayMd = toMd(today.slice(5))
  const [kind, setKind] = useState<'yearly' | 'once'>(holiday?.kind ?? 'yearly')
  // 切り替えても、もう一方の入力が消えないよう、種類ごとに値を持つ
  const [yStart, setYStart] = useState<Md>(holiday?.kind === 'yearly' ? toMd(holiday.start) : todayMd)
  const [yEnd, setYEnd] = useState<Md>(holiday?.kind === 'yearly' ? toMd(holiday.end) : todayMd)
  const [oStart, setOStart] = useState(holiday?.kind === 'once' ? holiday.start : today)
  const [oEnd, setOEnd] = useState(holiday?.kind === 'once' ? holiday.end : today)

  const draft: CompanyHoliday =
    kind === 'yearly' ? { kind, start: fromMd(yStart), end: fromMd(yEnd) } : { kind, start: oStart, end: oEnd }
  const errors = checkCompanyHoliday(draft)
  const canSubmit = errors.length === 0
  // 欄が空のあいだは誤りの文を出さず、ボタンを押せなくするだけにする
  const shown = kind === 'once' && (oStart === '' || oEnd === '') ? [] : errors

  return (
    <>
      <SheetTitle>{T.companyHolidayTitle}</SheetTitle>
      <div className="space-y-3">
        <fieldset>
          <legend className="text-sm text-sub">{T.repeatLabel}</legend>
          <div className="flex gap-4">
            {(['yearly', 'once'] as const).map((k) => (
              <label key={k} className="flex min-h-11 items-center gap-2">
                <input type="radio" name="repeat" value={k} checked={kind === k} onChange={() => setKind(k)} />
                {k === 'yearly' ? T.yearly : T.once}
              </label>
            ))}
          </div>
        </fieldset>
        {kind === 'yearly' ? (
          <>
            <MonthDayPicker label={T.startLabel} value={yStart} onChange={setYStart} />
            <MonthDayPicker label={T.endLabel} value={yEnd} onChange={setYEnd} />
          </>
        ) : (
          <>
            <label className="block">
              <span className="block text-sm text-sub">{T.startLabel}</span>
              <input type="date" value={oStart} onChange={(e) => setOStart(e.target.value)} className={FIELD_CLASS} />
            </label>
            <label className="block">
              <span className="block text-sm text-sub">{T.endLabel}</span>
              <input type="date" value={oEnd} onChange={(e) => setOEnd(e.target.value)} className={FIELD_CLASS} />
            </label>
          </>
        )}
        {shown.map((e) => (
          <p key={e} role="alert" className="text-sm text-danger">
            {errorText(e)}
          </p>
        ))}
      </div>
      <SheetButtons
        left={
          holiday !== null && (
            <button type="button" onClick={onRemove} className={`${SECONDARY_BUTTON_CLASS} text-danger`}>
              {T.removeCompanyHoliday}
            </button>
          )
        }
      >
        <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
          {T.cancel}
        </button>
        <button type="button" disabled={!canSubmit} onClick={() => onSubmit(draft)} className={PRIMARY_BUTTON_CLASS}>
          {T.save}
        </button>
      </SheetButtons>
    </>
  )
}

export function CompanyHolidaySheet(props: Props) {
  return (
    <Sheet title={T.companyHolidayTitle} onClose={props.onClose}>
      <CompanyHolidaySheetBody {...props} />
    </Sheet>
  )
}
