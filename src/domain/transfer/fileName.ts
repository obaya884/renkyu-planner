import type { IsoDate } from '@/domain/shared/date'

/** D-11: 記録を書き出すファイルの名前。today は書き出した日（日本の暦日） */
export function recordFileName(today: IsoDate): string {
  return `renkyu-planner-${today}.json`
}

/** カレンダー用のファイル（.ics）の名前。today は書き出した日（日本の暦日） */
export function icsFileName(today: IsoDate): string {
  return `renkyu-planner-${today}.ics`
}
