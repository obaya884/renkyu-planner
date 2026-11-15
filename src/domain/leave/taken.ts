import type { IsoDate } from '@/domain/shared/date'
import type { Entry } from '@/domain/types'

/** R-13・F-305: 日程が取得済みか。日付が今日以前なら取得済み、今日より後なら予定。日程は取得済みかどうかを持たない */
export function isTaken(entry: Pick<Entry, 'date'>, today: IsoDate): boolean {
  return entry.date <= today
}
