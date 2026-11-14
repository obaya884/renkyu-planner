import type { Amount } from '@/domain/types'

/** R-11: 量を分に直す。1 日 = 所定労働時間、半日 = その半分 */
export function toMinutes(a: Amount, workMinutes: number): number {
  if (a.unit === 'day') return workMinutes
  if (a.unit === 'half') return workMinutes / 2
  return a.minutes
}

/** §3.2・F-211: 未割り当て（分）が不足か。0.5 分の端数で絶対値が 1 分に満たないときは不足にしない。不足の判定はここで 1 つに決める */
export function isShort(minutes: number): boolean {
  return minutes <= -1
}

/** R-11: 「9 日と 2 時間」「2 時間 30 分」「3 日」「0 日」の形。分未満は切り捨て、負の量は絶対値で出す */
export function formatMinutes(minutes: number, workMinutes: number): string {
  const total = Math.floor(Math.abs(minutes))
  const days = Math.floor(total / workMinutes)
  const rest = total - days * workMinutes
  const hours = Math.floor(rest / 60)
  const mins = rest % 60

  const time: string[] = []
  if (hours > 0) time.push(`${hours} 時間`)
  if (mins > 0) time.push(`${mins} 分`)
  const timeText = time.join(' ')

  if (days === 0) return timeText === '' ? '0 日' : timeText
  if (timeText === '') return `${days} 日`
  return `${days} 日と ${timeText}`
}
