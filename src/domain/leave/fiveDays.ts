import { diffDays } from '@/domain/shared/date'
import type { IsoDate } from '@/domain/shared/date'
import { type Entry, PAID_LEAVE_TYPE_ID, type Settings } from '@/domain/types'
import { grantDaysOf } from './balance'
import { grantYearOf } from './grantYear'
import { isTaken } from './taken'

export type FiveDayStatus = Readonly<{ doneDays: number; plannedDays: number; remainingDays: number; warn: boolean }>

type Input = Readonly<{
  settings: Settings
  entries: readonly Entry[]
  grantYearStart: IsoDate
  today: IsoDate
}>

/** R-18: 年 5 日の取得。付与日が未設定か、付与日数が 10 未満なら null */
export function fiveDayStatus(input: Input): FiveDayStatus | null {
  const { settings, entries, grantYearStart, today } = input
  if (settings.grantDay === null) return null
  if (grantDaysOf(settings, grantYearStart) < 10) return null
  const { end } = grantYearOf(grantYearStart, settings.grantDay)

  let doneDays = 0
  let plannedDays = 0
  for (const entry of entries) {
    if (entry.leaveTypeId !== PAID_LEAVE_TYPE_ID) continue
    if (entry.date < grantYearStart || entry.date > end) continue
    const days = entry.amount.unit === 'day' ? 1 : entry.amount.unit === 'half' ? 0.5 : 0
    if (isTaken(entry, today)) doneDays += days
    else plannedDays += days
  }
  const remainingDays = Math.max(0, 5 - doneDays - plannedDays)
  return { doneDays, plannedDays, remainingDays, warn: remainingDays > 0 && diffDays(today, end) <= 90 }
}
