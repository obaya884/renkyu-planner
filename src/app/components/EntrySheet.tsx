'use client'

import { useState } from 'react'
import { DateField } from '@/app/components/DateField'
import { FIELD_CLASS, SELECT_FIELD_CLASS, Field, Line, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, SHORT_FIELD_CLASS, Sheet, SheetButtons, SheetTitle } from '@/app/components/Sheet'
import { UnassignedLines } from '@/app/components/UnassignedLines'
import { T, entrySheetTitle, errorText, rangeDaysText } from '@/app/texts'
import { type EntryDraft, checkEntryDraft, lastAddableDate } from '@/domain/entries/checkDraft'
import type { RangeError } from '@/domain/entries/entryRange'
import type { IsoDate } from '@/domain/shared/date'
import { type Amount, type Entry, PAID_LEAVE_TYPE_ID } from '@/domain/types'
import { STORAGE_LIMITS } from '@/domain/storage/limits'
import type { PlannerInput } from '@/domain/view/input'
import { type SaveError, planEntrySave } from '@/domain/view/entrySave'
import { type RangePreview, previewRange } from '@/domain/view/rangePreview'
import { endDateAfterDateChange, endDateOnToggle } from '@/domain/view/rangeInput'

type Props = {
  input: PlannerInput
  entry: Entry | null
  defaultDate: IsoDate
  /** F-506: 「Google カレンダーに追加」の行き先。出さないときは null（足すとき、取得済み、過ぎた日程） */
  calendarUrl: string | null
  /** 1 件を足す・直すときは [draft]、期間で足すときは足す日ごとの 1 日の日程（F-307） */
  onSubmit: (drafts: readonly EntryDraft[]) => void
  onRemove: () => void
  onClose: () => void
}

type AmountKind = Amount['unit']

const AMOUNT_CHOICES: readonly { kind: AmountKind; label: string }[] = [
  { kind: 'day', label: T.amountDay },
  { kind: 'half', label: T.amountHalf },
  { kind: 'minutes', label: T.amountMinutes },
]

function Choice({ name, label, checked, onChange }: { name: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex min-h-11 items-center gap-2">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-5 w-5 accent-primary" />
      {label}
    </label>
  )
}

function ErrorLines({ errors, lastAddable }: { errors: readonly (SaveError | RangeError)[]; lastAddable: IsoDate }) {
  return (
    <>
      {errors.map((e) => (
        <p key={e} role="alert" className="text-sm text-danger">
          {errorText(e, lastAddable)}
        </p>
      ))}
    </>
  )
}

/**
 * §5.2・F-307: 期間で足すときの、終わりの日の欄の下の行。理由か足す日、F-306 の知らせ、未割り当て。
 * lastAddable は tooFar の文に入れる日付（R-19）
 */
export function EntryRangeLines({ preview, workMinutes, lastAddable }: { preview: RangePreview; workMinutes: number; lastAddable: IsoDate }) {
  const { days, errors, overOneDay, deltas } = preview
  return (
    <>
      {errors.length > 0 ? (
        <ErrorLines errors={errors} lastAddable={lastAddable} />
      ) : (
        <p className="text-sm">{rangeDaysText(days)}</p>
      )}
      {overOneDay && <p className="text-sm text-warn-ink">{T.overOneDay}</p>}
      <UnassignedLines deltas={deltas} workMinutes={workMinutes} />
    </>
  )
}

/** §5.2 の中身。入力欄の値だけを状態に持つ。検証は checkEntryDraft を呼ぶだけ。連休は出さない（一覧の行に出る。F-304） */
export function EntrySheetBody({ input, entry, defaultDate, calendarUrl, onSubmit, onRemove, onClose }: Props) {
  const { leaveTypes } = input.settings
  const adding = entry === null
  const [date, setDate] = useState(entry?.date ?? defaultDate)
  const [kind, setKind] = useState<AmountKind>(entry?.amount.unit ?? 'day')
  const initialMinutes = entry?.amount.unit === 'minutes' ? entry.amount.minutes : 0
  const [hours, setHours] = useState(String(Math.floor(initialMinutes / 60)))
  const [mins, setMins] = useState(String(initialMinutes % 60))
  const [leaveTypeId, setLeaveTypeId] = useState(entry?.leaveTypeId ?? leaveTypes.find((t) => t.id === PAID_LEAVE_TYPE_ID)?.id ?? leaveTypes[0].id)
  const [title, setTitle] = useState(entry?.title ?? '')
  // F-307: 足すときだけ。入れているあいだ、日付から終わりの日までを足す
  const [rangeOn, setRangeOn] = useState(false)
  const [endDate, setEndDate] = useState('')
  const ranged = adding && rangeOn

  const amount: Amount =
    kind === 'minutes' ? { unit: 'minutes', minutes: Number(hours) * 60 + Number(mins) } : { unit: kind }
  const draft: EntryDraft = { date, leaveTypeId, amount, title }
  const { errors, overOneDay } = checkEntryDraft(input, draft, entry?.id ?? null)

  const lastAddable = lastAddableDate(input.today)
  const dateErrors = errors.filter((e) => e === 'restDay' || e === 'invalidDate' || e === 'tooFar')
  const amountErrors = errors.filter((e) => e === 'invalidAmount')

  // F-307: 終わりの日を入れたときは、足す日ごとに 1 日の日程を作り、1 日ずつ検証する（planEntrySave）
  const range = ranged ? previewRange(input, date, endDate, leaveTypeId) : null
  const { drafts, errors: saveErrors, canSave } = planEntrySave(input, draft, entry?.id ?? null, range)
  const typeErrors = saveErrors.filter((e) => e === 'unknownLeaveType')
  const limitErrors = saveErrors.filter((e) => e === 'tooManyEntries')

  return (
    <>
      <div>
        <SheetTitle>{adding ? T.addDayTitle : entrySheetTitle(entry.date)}</SheetTitle>
        {!adding && <ErrorLines errors={dateErrors} lastAddable={lastAddable} />}
      </div>
      <div className="space-y-3">
        {adding && (
          <div>
            <Field label={T.dateLabel}>
              <DateField
                max={lastAddable}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setEndDate(endDateAfterDateChange(e.target.value, endDate))
                }}
              />
            </Field>
            {!ranged && <ErrorLines errors={dateErrors} lastAddable={lastAddable} />}
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={rangeOn}
                onChange={(e) => {
                  setRangeOn(e.target.checked)
                  if (e.target.checked) setEndDate(endDateOnToggle(date))
                }}
                className="h-5 w-5 accent-primary"
              />
              {T.rangeToggleLabel}
            </label>
            {ranged && (
              <div className="mt-1">
                <Field label={T.endDateLabel}>
                  <DateField max={lastAddable} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </Field>
              </div>
            )}
            {range !== null && <EntryRangeLines preview={range} workMinutes={input.settings.workMinutes} lastAddable={lastAddable} />}
          </div>
        )}
        {!ranged && (
          <fieldset>
            <legend className="text-sm text-sub">{T.amountLabel}</legend>
            {AMOUNT_CHOICES.map((c) => (
              <Choice key={c.kind} name="amount" label={c.label} checked={kind === c.kind} onChange={() => setKind(c.kind)} />
            ))}
            {kind === 'minutes' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={T.hoursUnit}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className={`${SHORT_FIELD_CLASS} w-20`}
                />
                {T.hoursUnit}
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={T.minutesUnit}
                  value={mins}
                  onChange={(e) => setMins(e.target.value)}
                  className={`${SHORT_FIELD_CLASS} w-20`}
                />
                {T.minutesUnit}
              </div>
            )}
            <ErrorLines errors={amountErrors} lastAddable={lastAddable} />
            {overOneDay && <p className="text-sm text-warn-ink">{T.overOneDay}</p>}
          </fieldset>
        )}
        {leaveTypes.length >= 2 ? (
          <div>
            <Field label={T.leaveTypeLabel}>
              <select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} className={SELECT_FIELD_CLASS}>
                {leaveTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <ErrorLines errors={typeErrors} lastAddable={lastAddable} />
          </div>
        ) : (
          <div>
            <Line label={T.leaveTypeLabel}>{leaveTypes[0].name}</Line>
            <ErrorLines errors={typeErrors} lastAddable={lastAddable} />
          </div>
        )}
        <Field label={T.entryTitleLabel}>
          <input type="text" maxLength={STORAGE_LIMITS.textLength} value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD_CLASS} />
        </Field>
        {calendarUrl !== null && (
          <Line label={T.calendarRowLabel}>
            <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-primary underline">
              {T.addToGoogleCalendar}
            </a>
          </Line>
        )}
        <ErrorLines errors={limitErrors} lastAddable={lastAddable} />
      </div>
      <SheetButtons
        left={
          !adding && (
            <button type="button" onClick={onRemove} className="min-h-11 rounded-md px-2 text-sm text-danger">
              {T.remove}
            </button>
          )
        }
      >
        <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
          {T.cancel}
        </button>
        <button type="button" disabled={!canSave} onClick={() => onSubmit(drafts)} className={PRIMARY_BUTTON_CLASS}>
          {T.save}
        </button>
      </SheetButtons>
    </>
  )
}

export function EntrySheet(props: Props) {
  return (
    <Sheet title={props.entry === null ? T.addDayTitle : entrySheetTitle(props.entry.date)} onClose={props.onClose}>
      <EntrySheetBody {...props} />
    </Sheet>
  )
}
