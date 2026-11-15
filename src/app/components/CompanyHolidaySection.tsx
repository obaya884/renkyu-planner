import { ROW_CLASS, TapRow } from '@/app/components/SettingsRow'
import { T, companyHolidayText, errorText } from '@/app/texts'
import type { CompanyHolidayRow } from '@/domain/view/settingsView'


/** §6 の会社の休日の節。並びは domain/view の組み立てのまま描く */
export function CompanyHolidaySection({
  rows,
  full,
  onOpen,
  onAdd,
}: {
  rows: readonly CompanyHolidayRow[]
  /** D-10: 上限に達している。足すボタンの代わりに理由を出す */
  full: boolean
  onOpen: (index: number) => void
  onAdd: () => void
}) {
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <TapRow key={r.index} onClick={() => onOpen(r.index)}>
          <span>{companyHolidayText(r.holiday)}</span>
        </TapRow>
      ))}
      {full ? (
        <p className="text-sm text-sub">{errorText('tooManyCompanyHolidays')}</p>
      ) : (
        <button type="button" onClick={onAdd} className={`${ROW_CLASS} text-primary`}>
          {T.addCompanyHoliday}
        </button>
      )}
    </div>
  )
}
