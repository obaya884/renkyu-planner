/** D-10: 記録の上限（数字は仮）。件数と、名前の長さ（JavaScript の文字列の length）と、id の長さ。休暇の種類の件数は有休を含めて数える */
export const STORAGE_LIMITS = { entries: 5000, companyHolidays: 100, leaveTypes: 20, grantYears: 100, textLength: 100, idLength: 64 } as const

/** 読み込むファイルの大きさの上限（3MB） */
export const MAX_IMPORT_BYTES = 3_145_728

/** D-10: 日程と休暇の種類の id は、半角の英数字・ハイフン・下線だけの 1〜64 文字 */
export function isValidId(s: string): boolean {
  return s.length >= 1 && s.length <= STORAGE_LIMITS.idLength && /^[A-Za-z0-9_-]+$/.test(s)
}

/** D-10: 名前を textLength で切る（保存する名前の長さをそろえる）。サロゲートペアの途中で切れたときは、その片割れも落とす */
export function clipText(s: string): string {
  if (s.length <= STORAGE_LIMITS.textLength) return s
  const cut = s.slice(0, STORAGE_LIMITS.textLength)
  const last = cut.charCodeAt(cut.length - 1)
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut
}

/** D-10: いま count 件あるところに adding 件を足しても、上限 limit を超えないか */
export function canAdd(count: number, adding: number, limit: number): boolean {
  return count + adding <= limit
}
