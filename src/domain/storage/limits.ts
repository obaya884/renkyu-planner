/** D-10: 記録の上限（数字は仮）。件数と、名前の長さ（JavaScript の文字列の length）と、id の長さ */
export const STORAGE_LIMITS = { entries: 5000, companyHolidays: 100, leaveTypes: 100, grantYears: 200, textLength: 100, idLength: 64 } as const

/** 読み込むファイルの大きさの上限（3MB） */
export const MAX_IMPORT_BYTES = 3_145_728

/** D-10: 日程と休暇の種類の id は、半角の英数字・ハイフン・下線だけの 1〜64 文字 */
export function isValidId(s: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(s)
}

/** D-10: いま count 件あるところに adding 件を足しても、上限 limit を超えないか */
export function canAdd(count: number, adding: number, limit: number): boolean {
  return count + adding <= limit
}
