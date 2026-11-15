'use client'

import { useState } from 'react'
import { FIELD_CLASS, Field, Line, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, Sheet, SheetButtons, SheetTitle } from '@/app/components/Sheet'
import { UnassignedLines } from '@/app/components/UnassignedLines'
import { T, errorText, leaveTypeWithRemaining, restDaysText, runHeading } from '@/app/texts'
import { runContaining } from '@/domain/calendar/restDays'
import { type EntryDraft, lastAddableDate } from '@/domain/entries/checkDraft'
import type { IsoDate } from '@/domain/shared/date'
import { STORAGE_LIMITS } from '@/domain/storage/limits'
import { type PlannerInput, restCalendarOf } from '@/domain/view/input'
import { planAddSave } from '@/domain/view/entrySave'
import { previewAdd, remainingFor } from '@/domain/view/addPreview'
import { defaultLeaveTypeId } from '@/domain/view/defaultLeaveType'

type Props = {
  input: PlannerInput
  leaveDays: readonly IsoDate[]
  /** まとめて取る休暇の候補から開くとき、その種類を引く休暇の初期値にする（§5.1） */
  initialLeaveTypeId?: string
  onSubmit: (drafts: readonly EntryDraft[]) => void
  onClose: () => void
}

/** §5.1 の中身。入力欄の値（引く休暇と予定の名前）だけを状態に持つ。テストはこちらを直接描く */
export function AddSheetBody({ input, leaveDays, initialLeaveTypeId, onSubmit, onClose }: Props) {
  const { leaveTypes, workMinutes } = input.settings
  // F-208: 使える期間のある休暇に足りる未割り当てがあればその休暇、無ければ有休。利用者はいつでも選び直せる
  const [leaveTypeId, setLeaveTypeId] = useState(() => initialLeaveTypeId ?? defaultLeaveTypeId(input, leaveDays))
  const [title, setTitle] = useState('')

  const deltas = previewAdd(input, leaveDays, leaveTypeId)
  // R-17・F-306・D-10: 別のタブで記録が変わっていても、休みの日と重なる日程は入れない。上限を超えるときも入れられない
  const { drafts, errors, overOneDay } = planAddSave(input, leaveDays, leaveTypeId, title)
  // 休む日がその種類の 1 つの付与年に入るときだけ、その付与年の残りを添える（§5.1）
  const typeLabel = (t: { id: string; name: string }) => {
    const remaining = remainingFor(input, t.id, leaveDays)
    return remaining === null ? t.name : leaveTypeWithRemaining(t.name, remaining, workMinutes)
  }
  // 休む日を休みに足したときの連休。候補の行の連休と同じ（F-203）
  const added = leaveDays.map((date, i) => ({ id: `add-${i}`, date, leaveTypeId, amount: { unit: 'day' } as const, title: '', done: false }))
  const run = runContaining(restCalendarOf({ ...input, entries: [...input.entries, ...added] }), leaveDays[0])

  return (
    <>
      <SheetTitle>{T.addToPlan}</SheetTitle>
      <div className="space-y-3">
        <Line label={T.restDays}>{restDaysText(leaveDays, workMinutes)}</Line>
        {run !== null && <Line label={T.runLabel}>{runHeading(run)}</Line>}
        {leaveTypes.length >= 2 ? (
          <Field label={T.leaveTypeLabel}>
            <select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} className={FIELD_CLASS}>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {typeLabel(t)}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Line label={T.leaveTypeLabel}>{typeLabel(leaveTypes[0])}</Line>
        )}
        {deltas.length === 0 ? (
          <p className="text-sm text-sub">{T.enterGrantToSee}</p>
        ) : (
          <UnassignedLines deltas={deltas} workMinutes={workMinutes} />
        )}
        <Field label={T.entryTitleLabel}>
          <input type="text" maxLength={STORAGE_LIMITS.textLength} value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD_CLASS} />
        </Field>
        {errors.map((e) => (
          <p key={e} role="alert" className="text-sm text-danger">
            {errorText(e, lastAddableDate(input.today))}
          </p>
        ))}
        {overOneDay && <p className="text-sm text-warn-ink">{T.overOneDay}</p>}
      </div>
      <SheetButtons>
        <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
          {T.cancel}
        </button>
        <button
          type="button"
          disabled={errors.length > 0}
          onClick={() => onSubmit(drafts)}
          className={PRIMARY_BUTTON_CLASS}
        >
          {T.submitAdd}
        </button>
      </SheetButtons>
    </>
  )
}

export function AddSheet(props: Props) {
  return (
    <Sheet title={T.addToPlan} onClose={props.onClose}>
      <AddSheetBody {...props} />
    </Sheet>
  )
}
