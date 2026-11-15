import type { StoredData } from '@/domain/storage/stored'

/** §5.6 で読み込む前に出す件数 */
export type ImportCounts = Readonly<{ entries: number; companyHolidays: number; leaveTypes: number }>

/** §5.6: 読み込む記録の件数。休暇の種類は有休を含めて数える（G-3） */
export function importCounts(data: StoredData): ImportCounts {
  return { entries: data.entries.length, companyHolidays: data.settings.companyHolidays.length, leaveTypes: data.settings.leaveTypes.length }
}
