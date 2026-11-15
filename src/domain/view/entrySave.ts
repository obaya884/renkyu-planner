import { type DraftError, type EntryDraft, checkEntryDraft } from '../entries/checkDraft'
import { STORAGE_LIMITS, canAdd } from '../storage/limits'
import type { PlannerInput } from './input'
import type { RangePreview } from './rangePreview'

/** 保存できない理由。D-10: 足すと日程が上限を超える（tooManyEntries）を、日程の入力の理由に足す */
export type SaveError = DraftError | 'tooManyEntries'

export type EntrySave = Readonly<{
  /** 保存する日程。1 件を足す・直すときは入力の 1 件、期間で足すときは足す日ごとの 1 日の日程 */
  drafts: readonly EntryDraft[]
  /** 保存する日程の理由（重なりを除く）。期間の理由は RangePreview の errors にある */
  errors: readonly SaveError[]
  canSave: boolean
}>

/** D-10: 足すとき（editingId が null）だけ、adding 件を足すと日程が上限を超えるか。直すときは件数が変わらないので数えない */
function overLimit(input: PlannerInput, adding: number, editingId: string | null): boolean {
  return editingId === null && !canAdd(input.entries.length, adding, STORAGE_LIMITS.entries)
}

/**
 * §5.2・F-307: 日程のモーダルで保存する日程と、保存できるか。
 * `range` は終わりの日を入れたときの previewRange、空なら null。期間のときは、量を 1 日にし、
 * 引く休暇・予定の名前・状態は入力のまま、足す日ごとに 1 日ずつ検証する（R-17・F-104）
 */
export function planEntrySave(input: PlannerInput, draft: EntryDraft, editingId: string | null, range: RangePreview | null): EntrySave {
  if (range === null) {
    const errors: SaveError[] = [...checkEntryDraft(input, draft, editingId).errors]
    if (overLimit(input, 1, editingId)) errors.push('tooManyEntries')
    return { drafts: [draft], errors, canSave: errors.length === 0 }
  }
  const { leaveTypeId, title, done } = draft
  const drafts: readonly EntryDraft[] = range.days.map((date) => ({ date, leaveTypeId, amount: { unit: 'day' }, title, done }))
  const errors: SaveError[] = [...new Set(drafts.flatMap((d) => checkEntryDraft(input, d, null).errors))]
  if (overLimit(input, drafts.length, null)) errors.push('tooManyEntries')
  return { drafts, errors, canSave: range.errors.length === 0 && errors.length === 0 }
}
