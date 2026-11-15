import { calendarEventTitle } from '@/app/texts'
import type { IsoDate } from '@/domain/shared/date'
import { googleCalendarUrl } from '@/domain/transfer/googleCalendar'
import { type CalendarEvent, calendarEntries, calendarUid, isUpcoming } from '@/domain/transfer/ics'
import { clipText } from '@/domain/storage/limits'
import type { Amount, Entry, Settings } from '@/domain/types'

/** F-506・E-3: 日程 1 件をカレンダーの予定にする。題は §6 の決まり */
export function calendarEventOf(entry: Entry, settings: Settings): CalendarEvent {
  const leaveTypeName = settings.leaveTypes.find((t) => t.id === entry.leaveTypeId)?.name ?? ''
  return { uid: calendarUid(entry.id), date: entry.date, summary: calendarEventTitle(entry, leaveTypeName, settings.workMinutes) }
}

/** F-506・E-1: カレンダー用のファイルに入れる予定（これからの予定を、日付の早い順に） */
export function calendarEventsOf(entries: readonly Entry[], settings: Settings, today: IsoDate): readonly CalendarEvent[] {
  return calendarEntries(entries, today).map((e) => calendarEventOf(e, settings))
}

/** F-506・画面定義書 §5.2: 日程のモーダルの「Google カレンダーに追加」の行き先。これからの予定でなければ null（行を出さない） */
export function calendarUrlOf(entry: Entry | undefined, settings: Settings, today: IsoDate): string | null {
  return entry && isUpcoming(entry, today) ? googleCalendarUrl(calendarEventOf(entry, settings)) : null
}

/**
 * F-506・画面定義書 §5.1・§5.2: 足すときの「Google カレンダーに追加」の行き先。days は足す日（休みの日を除いた日）で、
 * 最初の日から最後の日までを 1 件の帯の予定にする。足す日が無い、または最後の日が今日より前（これからの予定でない）なら null（押せない見た目で出す）。
 * 題は日程と同じ決まり（保存するときと同じに、名前は 100 文字で切る）
 */
export function addCalendarUrlOf(
  days: readonly IsoDate[],
  entry: Readonly<{ leaveTypeId: string; amount: Amount; title: string }>,
  settings: Settings,
  today: IsoDate,
): string | null {
  if (days.length === 0) return null
  const sorted = [...days].sort()
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (last < today) return null
  const { summary } = calendarEventOf({ ...entry, id: '', date: first, title: clipText(entry.title) }, settings)
  return googleCalendarUrl({ date: first, lastDate: last, summary })
}

/**
 * F-506・画面定義書 §5.2: 日を足すモーダルの「Google カレンダーに追加」の行き先。入力中の値だけで決める。
 * 保存できないあいだは null（押せない見た目）。rangeDays は期間で足すときの足す日（休みの日を除いた日）で、期間でなければ null。
 * 期間のときは足す日の最初から最後までを帯にし、量は 1 日にする（保存する日程と同じ。planEntrySave）。
 * 期間でないときは入力中の日付と量をそのまま使う。最後の日が今日より前なら null（addCalendarUrlOf）
 */
export function entrySheetAddUrlOf(input: Readonly<{
  canSave: boolean
  rangeDays: readonly IsoDate[] | null
  date: IsoDate
  entry: Readonly<{ leaveTypeId: string; amount: Amount; title: string }>
  settings: Settings
  today: IsoDate
}>): string | null {
  const { canSave, rangeDays, date, entry, settings, today } = input
  if (!canSave) return null
  const amount: Amount = rangeDays === null ? entry.amount : { unit: 'day' }
  return addCalendarUrlOf(rangeDays ?? [date], { ...entry, amount }, settings, today)
}
