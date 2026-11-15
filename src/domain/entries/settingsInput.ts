/** F-102: 時間（0〜24 の整数）と分（0〜59 の整数）の文字から、所定労働時間（分）に直す。どちらかが空・小数・範囲の外なら NaN */
export function workMinutesFrom(hours: string, minutes: string): number {
  if (!/^\d+$/.test(hours) || !/^\d+$/.test(minutes)) return Number.NaN
  const h = Number(hours)
  const m = Number(minutes)
  if (h > 24 || m > 59) return Number.NaN
  return h * 60 + m
}

/** D-4: 所定労働時間は 1〜1440 分の整数 */
export function isValidWorkMinutes(m: number): boolean {
  return Number.isInteger(m) && m >= 1 && m <= 1440
}
