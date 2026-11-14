'use client'

import { useState } from 'react'
import { FIELD_CLASS, Field, Line, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, Sheet, SheetButtons, SheetTitle } from '@/app/components/Sheet'
import { T, errorText, grantDayText, grantPeriodText, nextEntitlementText } from '@/app/texts'
import { type GrantDraft, checkGrantDraft } from '@/domain/entries/checkDraft'
import {
  clampGrantDay,
  computedEntitlement,
  enteredEntitlement,
  entitlementToSave,
  grantDayChoices,
  grantSheetMode,
  splitDaysHours,
} from '@/domain/entries/grantInput'
import { balanceOf, carryOverOf, grantDaysOf } from '@/domain/leave/balance'
import { grantYearOf, isValidGrantDay } from '@/domain/leave/grantYear'
import type { IsoDate } from '@/domain/shared/date'
import type { PlannerInput } from '@/domain/view/input'

type Props = {
  input: PlannerInput
  grantYearStart: IsoDate | null
  onSubmit: (draft: GrantDraft, grantYearStart: IsoDate) => void
  onClose: () => void
}

const pad = (n: number) => String(n).padStart(2, '0')
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

/** §5.3 の中身。入力欄の値だけを状態に持つ。検証・換算・上書きの判断は domain の関数を呼ぶだけ */
export function GrantSheetBody({ input, grantYearStart, onSubmit, onClose }: Props) {
  const { settings } = input
  const { workMinutes } = settings
  const mode = grantSheetMode(input, grantYearStart)
  const first = mode === 'first'

  // 始まった付与年の、この年に使える日数の初期値は、R-13 で計算した持ち分（上書きがあればその値）
  const startedEntitlement =
    mode === 'started' && grantYearStart !== null
      ? (balanceOf({ settings, entries: input.entries, leaveTypeId: 'paid', grantYearStart })?.entitlement ?? 0)
      : 0
  const initialSplit = splitDaysHours(startedEntitlement, workMinutes)
  const [month, setMonth] = useState(4)
  const [day, setDay] = useState(1)
  const [grantDays, setGrantDays] = useState(grantYearStart === null ? '' : String(grantDaysOf(settings, grantYearStart)))
  const [touched, setTouched] = useState(false)
  const [entDays, setEntDays] = useState(String(initialSplit.days))
  const [entHours, setEntHours] = useState(String(initialSplit.hours))

  // 付与年を指定して開いたときの付与日は、設定の付与日（設定が無いことはないが、無ければ付与年の開始日から取る）
  const grantDay = grantYearStart === null ? `${pad(month)}-${pad(day)}` : (settings.grantDay ?? grantYearStart.slice(5))
  const grantDaysNumber = grantDays === '' ? Number.NaN : Number(grantDays)
  // 初めての入力は、入れた付与日と今日から付与年が決まる
  const year = first && !isValidGrantDay(grantDay) ? null : grantYearOf(grantYearStart ?? input.today, grantDay)
  const start = grantYearStart ?? year?.start ?? input.today

  const computed = computedEntitlement(input, start, grantDaysNumber)
  // 初めての入力では、利用者が触るまで、付与日数に合わせて動く
  const followed = first && !touched
  const shown = followed
    ? Number.isFinite(computed)
      ? splitDaysHours(computed, workMinutes)
      : null
    : { days: entDays, hours: entHours }
  const entered = followed ? computed : enteredEntitlement(entDays, entHours, workMinutes)
  // 次の付与年の面は上書きを作らない。すでに上書きがある付与年なら、それを保つ
  const entitlementMinutes =
    mode === 'next' && grantYearStart !== null
      ? (settings.grantYears[grantYearStart]?.entitlementMinutes ?? null)
      : entitlementToSave(touched, entered, computed)

  const draft: GrantDraft = { grantDay, grantDays: grantDaysNumber, entitlementMinutes }
  const allErrors = checkGrantDraft(draft)
  // 空の欄には誤りの文を出さず、ボタンを押せなくするだけにする
  const errors = allErrors.filter(
    (e) => !(e === 'invalidGrantDays' && grantDays === '') && !(e === 'invalidEntitlement' && !followed && entDays === ''),
  )
  const canSubmit = allErrors.length === 0

  const changeMonth = (m: number) => {
    setMonth(m)
    setDay((d) => clampGrantDay(m, d))
  }
  const touch = (set: (v: string) => void) => (v: string) => {
    if (followed && shown !== null) {
      setEntDays(String(shown.days))
      setEntHours(String(shown.hours))
    }
    setTouched(true)
    set(v)
  }

  return (
    <>
      <div>
        <SheetTitle>{T.grantTitle}</SheetTitle>
        {year !== null && <p className="text-sm text-sub">{grantPeriodText(year.start, year.end)}</p>}
      </div>
      <div className="space-y-3">
        {first ? (
          <fieldset>
            <legend className="text-sm text-sub">{T.grantDayLabel}</legend>
            <div className="flex items-center gap-2">
              <select aria-label={T.monthUnit} value={month} onChange={(e) => changeMonth(Number(e.target.value))} className={`${FIELD_CLASS} w-20`}>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {T.monthUnit}
              <select aria-label={T.dayUnit} value={day} onChange={(e) => setDay(Number(e.target.value))} className={`${FIELD_CLASS} w-20`}>
                {grantDayChoices(month).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {T.dayUnit}
            </div>
            {errors.includes('invalidGrantDay') && (
              <p role="alert" className="text-sm text-danger">
                {errorText('invalidGrantDay')}
              </p>
            )}
          </fieldset>
        ) : (
          <Line label={T.grantDayLabel}>{grantDayText(grantDay)}</Line>
        )}
        <div>
          <Field label={T.grantDaysLabel}>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={366}
                step={0.5}
                inputMode="decimal"
                value={grantDays}
                onChange={(e) => setGrantDays(e.target.value)}
                className={`${FIELD_CLASS} w-24`}
              />
              {T.dayUnit}
            </span>
          </Field>
          {errors.includes('invalidGrantDays') && (
            <p role="alert" className="text-sm text-danger">
              {errorText('invalidGrantDays')}
            </p>
          )}
        </div>
        {mode === 'next' ? (
          !errors.includes('invalidGrantDays') &&
          grantDays !== '' && (
            <Line label={T.entitlementLabel}>
              {nextEntitlementText(grantDaysNumber, carryOverOf({ settings, entries: input.entries, grantYearStart: start }), workMinutes)}
            </Line>
          )
        ) : (
          <fieldset>
            <legend className="text-sm text-sub">{T.entitlementLabel}</legend>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={T.dayUnit}
                value={shown === null ? '' : shown.days}
                onChange={(e) => touch(setEntDays)(e.target.value)}
                className={`${FIELD_CLASS} w-20`}
              />
              {T.dayUnit}
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={T.hoursUnit}
                value={shown === null ? '' : shown.hours}
                onChange={(e) => touch(setEntHours)(e.target.value)}
                className={`${FIELD_CLASS} w-20`}
              />
              {T.hoursUnit}
            </div>
            {first && <p className="text-sm text-sub">{T.entitlementHint}</p>}
            {errors.includes('invalidEntitlement') && (
              <p role="alert" className="text-sm text-danger">
                {errorText('invalidEntitlement')}
              </p>
            )}
          </fieldset>
        )}
      </div>
      <p className="text-sm text-sub">{T.localOnly}</p>
      <SheetButtons>
        <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
          {T.cancel}
        </button>
        <button type="button" disabled={!canSubmit} onClick={() => onSubmit(draft, start)} className={PRIMARY_BUTTON_CLASS}>
          {first ? T.submitGrantFirst : T.save}
        </button>
      </SheetButtons>
    </>
  )
}

export function GrantSheet(props: Props) {
  return (
    <Sheet title={T.grantTitle} onClose={props.onClose}>
      <GrantSheetBody {...props} />
    </Sheet>
  )
}
