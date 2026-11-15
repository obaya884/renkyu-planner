import { type IsoDate, isValidIsoDate } from '../shared/date'

/** F-307・§5.2: 「期間で足す」を入れた（入れ直した）ときの終わりの日は、日付と同じ日 */
export function endDateOnToggle(date: string): string {
  return date
}

/**
 * F-307・§5.2: 「期間で足す」を入れているあいだに日付を変えたときの終わりの日。
 * 日付が終わりの日を追い越したら日付と同じ日に直し、それ以外は触らない（どちらかが空・正しくないときも触らない）
 */
export function endDateAfterDateChange(date: IsoDate | string, endDate: string): string {
  if (!isValidIsoDate(date) || !isValidIsoDate(endDate)) return endDate
  return endDate < date ? date : endDate
}
