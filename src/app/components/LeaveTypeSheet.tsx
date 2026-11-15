'use client'

import { useState } from 'react'
import { MonthDayPicker, type Md, fromMd, toMd } from '@/app/components/MonthDayPicker'
import { FIELD_CLASS, Field, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, Sheet, SheetButtons, SheetTitle } from '@/app/components/Sheet'
import { T, errorText } from '@/app/texts'
import { grantDayChoices } from '@/domain/entries/grantInput'
import { type LeaveTypeDraft, checkLeaveTypeDraft, monthDayChoices, normalizeLeaveTypeDraft } from '@/domain/entries/settingsInput'
import type { IsoDate } from '@/domain/shared/date'
import type { LeaveType } from '@/domain/types'

type Props = {
  type: LeaveType | null
  hasEntries: boolean
  today: IsoDate
  onSubmit: (d: LeaveTypeDraft) => void
  onRemove: () => void
  onClose: () => void
}

/** §5.5 の中身。入力欄の値だけを状態に持つ。検証は domain の checkLeaveTypeDraft を呼ぶだけ */
export function LeaveTypeSheetBody({ type, hasEntries, today, onSubmit, onRemove, onClose }: Props) {
  const todayMd = toMd(today.slice(5))
  const [name, setName] = useState(type?.name ?? '')
  const [days, setDays] = useState(type === null ? '' : String(type.days))
  const [useUsable, setUseUsable] = useState(type?.usable != null)
  // チェックを外しても、入れた期間が消えないよう、値は別に持つ
  const [start, setStart] = useState<Md>(type?.usable ? toMd(type.usable.start) : todayMd)
  const [end, setEnd] = useState<Md>(type?.usable ? toMd(type.usable.end) : todayMd)
  const [ownGrantDay, setOwnGrantDay] = useState(type?.grantDay != null)
  const [grantDay, setGrantDay] = useState<Md>(type?.grantDay ? toMd(type.grantDay) : { month: 4, day: 1 })
  const [together, setTogether] = useState(type?.together ?? false)

  const draft: LeaveTypeDraft = normalizeLeaveTypeDraft({
    name,
    days: days === '' ? Number.NaN : Number(days),
    usable: useUsable ? { start: fromMd(start), end: fromMd(end) } : null,
    grantDay: ownGrantDay ? fromMd(grantDay) : null,
    together,
  })
  const errors = checkLeaveTypeDraft(draft)
  const canSubmit = errors.length === 0
  // 名前と日数が空のあいだは誤りの文を出さず、ボタンを押せなくするだけにする（§5.5）

  return (
    <>
      <SheetTitle>{T.leaveTypeTitle}</SheetTitle>
      <div className="space-y-3">
        <Field label={T.nameLabel}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={FIELD_CLASS} />
        </Field>
        <div>
          <Field label={T.leaveDaysLabel}>
            <input type="number" min={0} max={366} step={0.5} inputMode="decimal" value={days} onChange={(e) => setDays(e.target.value)} className={`${FIELD_CLASS} w-28`} />
          </Field>
          {days !== '' && errors.includes('invalidDays') && (
            <p role="alert" className="text-sm text-danger">
              {errorText('invalidDays')}
            </p>
          )}
        </div>
        <div>
          <span className="block text-sm text-sub">{T.usableLabel}</span>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={useUsable} onChange={(e) => setUseUsable(e.target.checked)} className="h-5 w-5 accent-primary" />
            {T.setUsable}
          </label>
          {useUsable && (
            <div className="space-y-3">
              <MonthDayPicker label={T.startLabel} value={start} onChange={setStart} dayChoices={monthDayChoices} />
              <MonthDayPicker label={T.endLabel} value={end} onChange={setEnd} dayChoices={monthDayChoices} />
            </div>
          )}
          {errors.includes('invalidUsable') && (
            <p role="alert" className="text-sm text-danger">
              {errorText('invalidUsable')}
            </p>
          )}
        </div>
        <fieldset>
          <legend className="text-sm text-sub">{T.leaveGrantDayLabel}</legend>
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" name="leaveGrantDay" checked={!ownGrantDay} onChange={() => setOwnGrantDay(false)} className="h-5 w-5 accent-primary" />
            {T.sameAsPaid}
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" name="leaveGrantDay" checked={ownGrantDay} onChange={() => setOwnGrantDay(true)} className="h-5 w-5 accent-primary" />
            {T.leaveOwnGrantDay}
          </label>
          {ownGrantDay && <MonthDayPicker label={T.leaveGrantDayPickerLabel} value={grantDay} onChange={setGrantDay} dayChoices={grantDayChoices} />}
        </fieldset>
        <div>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={together} onChange={(e) => setTogether(e.target.checked)} className="h-5 w-5 accent-primary" />
            {T.togetherLabel}
          </label>
          <p className="text-sm text-sub">{T.togetherHint}</p>
        </div>
        {errors.includes('invalidGrantDay') && (
          <p role="alert" className="text-sm text-danger">
            {errorText('invalidGrantDay')}
          </p>
        )}
      </div>
      <SheetButtons
        left={
          type !== null && (
            <button type="button" disabled={hasEntries} onClick={onRemove} className={`${SECONDARY_BUTTON_CLASS} text-danger disabled:opacity-40`}>
              {T.removeLeaveType}
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
      {type !== null && hasEntries && (
        <p role="alert" className="text-sm text-danger">
          {errorText('hasEntries')}
        </p>
      )}
    </>
  )
}

export function LeaveTypeSheet(props: Props) {
  return (
    <Sheet title={T.leaveTypeTitle} onClose={props.onClose}>
      <LeaveTypeSheetBody {...props} />
    </Sheet>
  )
}
