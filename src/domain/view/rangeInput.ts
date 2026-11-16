import type { RangeError } from '../entries/entryRange'
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

/**
 * F-307・§5.2・§8.3: 期間で足すときの誤りを、どの欄の下に出すかで分ける。
 * 日付が空か正しくなければ日付の欄の下、終わりの日が空か正しくなければ終わりの日の欄の下（両方なら両方）。
 * 日付に関するほかの誤りは終わりの日の欄の下のまま
 */
export function rangeErrorPlaces(
  errors: readonly RangeError[],
  date: string,
  endDate: string,
): Readonly<{ date: readonly RangeError[]; end: readonly RangeError[] }> {
  const dateBad = !isValidIsoDate(date)
  const endBad = !isValidIsoDate(endDate)
  return {
    date: errors.filter((e) => e === 'invalidDate' && dateBad),
    end: errors.filter((e) => e !== 'invalidDate' || endBad),
  }
}
