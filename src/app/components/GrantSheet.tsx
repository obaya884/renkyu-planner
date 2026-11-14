'use client'

import { useState } from 'react'
import { FIELD_CLASS, Field, Line, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, Sheet, SheetButtons } from '@/app/components/Sheet'
import { T, errorText, grantDayText, grantPeriodText } from '@/app/texts'
import { type GrantDraft, checkGrantDraft } from '@/domain/entries/checkDraft'
import { balanceOf, grantDaysOf } from '@/domain/leave/balance'
import { grantYearOf } from '@/domain/leave/grantYear'
import { type IsoDate, addDays } from '@/domain/shared/date'
import { type PlannerInput, currentGrantYear } from '@/domain/view/input'

type Props = {
  input: PlannerInput
  grantYearStart: IsoDate | null
  onSubmit: (draft: GrantDraft, grantYearStart: IsoDate) => void
  onClose: () => void
}

const pad = (n: number) => String(n).padStart(2, '0')
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

/** 繰り越しの初期値（F-405）。設定があればその値。無ければ、今の付与年の次の付与年のときだけ、今の有休の未割り当て（0 未満なら 0） */
function initialCarryOver(input: PlannerInput, start: IsoDate): number {
  const set = input.settings.grantYears[start]
  if (set) return set.carryOverMinutes
  const current = currentGrantYear(input)
  if (current === null || addDays(current.end, 1) !== start) return 0
  const balance = balanceOf({ settings: input.settings, entries: input.entries, leaveTypeId: 'paid', grantYearStart: current.start })
  return Math.max(0, balance?.unassigned ?? 0)
}

/** §5.3 の中身。入力欄の値だけを状態に持つ。検証は checkGrantDraft を呼ぶだけ */
export function GrantSheetBody({ input, grantYearStart, onSubmit, onClose }: Props) {
  const { settings } = input
  const { workMinutes } = settings
  const first = grantYearStart === null

  const carry0 = first ? 0 : initialCarryOver(input, grantYearStart)
  const [month, setMonth] = useState(4)
  const [day, setDay] = useState(1)
  const [grantDays, setGrantDays] = useState(first ? '' : String(settings.grantYears[grantYearStart]?.grantDays ?? grantDaysOf(settings, grantYearStart)))
  const [carryDays, setCarryDays] = useState(String(Math.floor(carry0 / workMinutes)))
  const [carryHours, setCarryHours] = useState(String(Math.floor((carry0 % workMinutes) / 60)))
  const [carryMins, setCarryMins] = useState(String((carry0 % workMinutes) % 60))

  // 付与年を指定して開いたときの付与日は、設定の付与日（設定が無いことはないが、無ければ付与年の開始日から取る）
  const grantDay = first ? `${pad(month)}-${pad(day)}` : (settings.grantDay ?? grantYearStart.slice(5))
  const draft: GrantDraft = {
    grantDay,
    grantDays: grantDays === '' ? Number.NaN : Number(grantDays),
    carryOverMinutes: Number(carryDays) * workMinutes + Number(carryHours) * 60 + Number(carryMins),
  }
  const errors = checkGrantDraft(draft).filter((e) => !(e === 'invalidGrantDays' && grantDays === ''))
  const canSubmit = checkGrantDraft(draft).length === 0

  const start = grantYearStart ?? grantYearOf(input.today, grantDay).start

  return (
    <>
      <div>
        <h2 className="text-lg font-bold">{T.grantTitle}</h2>
        {!first && <p className="text-sm text-sub">{grantPeriodText(grantYearStart, grantYearOf(grantYearStart, grantDay).end)}</p>}
      </div>
      <div className="space-y-3">
        {first ? (
          <fieldset>
            <legend className="text-sm text-sub">{T.grantDayLabel}</legend>
            <div className="flex items-center gap-2">
              <select aria-label={T.monthUnit} value={month} onChange={(e) => setMonth(Number(e.target.value))} className={`${FIELD_CLASS} w-20`}>
                {range(12).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {T.monthUnit}
              <select aria-label={T.dayUnit} value={day} onChange={(e) => setDay(Number(e.target.value))} className={`${FIELD_CLASS} w-20`}>
                {range(31).map((d) => (
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
        <fieldset>
          <legend className="text-sm text-sub">{T.carryOverLabel}</legend>
          <div className="flex items-center gap-2">
            <input type="number" min={0} inputMode="numeric" aria-label={T.dayUnit} value={carryDays} onChange={(e) => setCarryDays(e.target.value)} className={`${FIELD_CLASS} w-20`} />
            {T.dayUnit}
            <input type="number" min={0} inputMode="numeric" aria-label={T.hoursUnit} value={carryHours} onChange={(e) => setCarryHours(e.target.value)} className={`${FIELD_CLASS} w-20`} />
            {T.hoursUnit}
            <input type="number" min={0} inputMode="numeric" aria-label={T.minutesUnit} value={carryMins} onChange={(e) => setCarryMins(e.target.value)} className={`${FIELD_CLASS} w-20`} />
            {T.minutesUnit}
          </div>
          {errors.includes('invalidCarryOver') && (
            <p role="alert" className="text-sm text-danger">
              {errorText('invalidCarryOver')}
            </p>
          )}
        </fieldset>
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
