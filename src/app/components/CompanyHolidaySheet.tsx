'use client'

import { useState } from 'react'
import { DATE_FIELD_CLASS, FIELD_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, Sheet, SheetButtons, SheetTitle } from '@/app/components/Sheet'
import { T, errorText } from '@/app/texts'
import { STORAGE_LIMITS } from '@/domain/storage/limits'
import { MonthDayPicker, type Md, fromMd, toMd } from '@/app/components/MonthDayPicker'
import { checkCompanyHoliday, monthDayChoices, withHolidayName } from '@/domain/entries/settingsInput'
import type { IsoDate } from '@/domain/shared/date'
import type { CompanyHoliday } from '@/domain/types'

type Props = {
  holiday: CompanyHoliday | null
  today: IsoDate
  onSubmit: (h: CompanyHoliday) => void
  onRemove: () => void
  onClose: () => void
}

/** §5.4 の中身。入力欄の値だけを状態に持つ。検証は domain の checkCompanyHoliday を呼ぶだけ */
export function CompanyHolidaySheetBody({ holiday, today, onSubmit, onRemove, onClose }: Props) {
  const todayMd = toMd(today.slice(5))
  const [name, setName] = useState(holiday?.name ?? '')
  const [kind, setKind] = useState<'yearly' | 'once'>(holiday?.kind ?? 'yearly')
  // 切り替えても、もう一方の入力が消えないよう、種類ごとに値を持つ
  const [yStart, setYStart] = useState<Md>(holiday?.kind === 'yearly' ? toMd(holiday.start) : todayMd)
  const [yEnd, setYEnd] = useState<Md>(holiday?.kind === 'yearly' ? toMd(holiday.end) : todayMd)
  const [oStart, setOStart] = useState(holiday?.kind === 'once' ? holiday.start : today)
  const [oEnd, setOEnd] = useState(holiday?.kind === 'once' ? holiday.end : today)

  const draft: CompanyHoliday = withHolidayName(
    kind === 'yearly' ? { kind, start: fromMd(yStart), end: fromMd(yEnd) } : { kind, start: oStart, end: oEnd },
    name,
  )
  const errors = checkCompanyHoliday(draft)
  const canSubmit = errors.length === 0
  // 欄が空のあいだは誤りの文を出さず、ボタンを押せなくするだけにする
  const shown = kind === 'once' && (oStart === '' || oEnd === '') ? [] : errors

  return (
    <>
      <SheetTitle>{T.companyHolidayTitle}</SheetTitle>
      <div className="space-y-3">
        <label className="block">
          <span className="block text-sm text-sub">{T.companyHolidayNameLabel}</span>
          <input type="text" maxLength={STORAGE_LIMITS.textLength} value={name} onChange={(e) => setName(e.target.value)} className={FIELD_CLASS} />
        </label>
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
            <MonthDayPicker label={T.startLabel} value={yStart} onChange={setYStart} dayChoices={monthDayChoices} />
            <MonthDayPicker label={T.endLabel} value={yEnd} onChange={setYEnd} dayChoices={monthDayChoices} />
          </>
        ) : (
          <>
            <label className="block">
              <span className="block text-sm text-sub">{T.startLabel}</span>
              <input type="date" value={oStart} onChange={(e) => setOStart(e.target.value)} className={DATE_FIELD_CLASS} />
            </label>
            <label className="block">
              <span className="block text-sm text-sub">{T.endLabel}</span>
              <input type="date" value={oEnd} onChange={(e) => setOEnd(e.target.value)} className={DATE_FIELD_CLASS} />
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
