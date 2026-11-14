'use client'

import { useState } from 'react'
import { FIELD_CLASS, Field, Line, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS, Sheet, SheetButtons } from '@/app/components/Sheet'
import { T, restDaysText, runHeading, unassignedChange } from '@/app/texts'
import { runContaining } from '@/domain/calendar/restDays'
import type { EntryDraft } from '@/domain/entries/checkDraft'
import type { IsoDate } from '@/domain/shared/date'
import { type PlannerInput, currentGrantYear, restCalendarOf } from '@/domain/view/input'
import { previewAdd } from '@/domain/view/addPreview'

type Props = {
  input: PlannerInput
  leaveDays: readonly IsoDate[]
  onSubmit: (drafts: readonly EntryDraft[]) => void
  onClose: () => void
}

/** §5.1 の中身。入力欄の値（引く休暇と予定の名前）だけを状態に持つ。テストはこちらを直接描く */
export function AddSheetBody({ input, leaveDays, onSubmit, onClose }: Props) {
  const { leaveTypes, workMinutes } = input.settings
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes.find((t) => t.id === 'paid')?.id ?? leaveTypes[0].id)
  const [title, setTitle] = useState('')

  const deltas = previewAdd(input, leaveDays, leaveTypeId)
  const thisStart = currentGrantYear(input)?.start
  // 休む日を休みに足したときの連休。候補の行の連休と同じ（F-203）
  const added = leaveDays.map((date, i) => ({ id: `add-${i}`, date, leaveTypeId, amount: { unit: 'day' } as const, title: '', done: false }))
  const run = runContaining(restCalendarOf({ ...input, entries: [...input.entries, ...added] }), leaveDays[0])

  return (
    <>
      <h2 className="text-lg font-bold">{T.addToPlan}</h2>
      <div className="space-y-3">
        <Line label={T.restDays}>{restDaysText(leaveDays, workMinutes)}</Line>
        {run !== null && <Line label={T.runLabel}>{runHeading(run)}</Line>}
        {leaveTypes.length >= 2 ? (
          <Field label={T.leaveTypeLabel}>
            <select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} className={FIELD_CLASS}>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Line label={T.leaveTypeLabel}>{leaveTypes[0].name}</Line>
        )}
        {deltas.length === 0 ? (
          <p className="text-sm text-sub">{T.enterGrantToSee}</p>
        ) : (
          deltas.map((d) => (
            <p key={d.grantYearStart} className={d.after < 0 ? 'font-bold text-warn-ink' : ''}>
              {unassignedChange(
                deltas.length === 1 ? T.unassigned : d.grantYearStart === thisStart ? T.thisGrantYear : T.nextGrantYearLabel,
                d.before,
                d.after,
                workMinutes,
              )}
            </p>
          ))
        )}
        <Field label={T.entryTitleLabel}>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD_CLASS} />
        </Field>
      </div>
      <SheetButtons>
        <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
          {T.cancel}
        </button>
        <button
          type="button"
          onClick={() => onSubmit(leaveDays.map((date) => ({ date, leaveTypeId, amount: { unit: 'day' }, title, done: false })))}
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
