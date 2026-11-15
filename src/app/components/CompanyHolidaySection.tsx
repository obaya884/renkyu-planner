import { ROW_CLASS, TapRow } from '@/app/components/SettingsRow'
import { T, companyHolidayText } from '@/app/texts'
import type { CompanyHolidayRow } from '@/domain/view/settingsView'


/** §6 の会社の休日の節。並びは domain/view の組み立てのまま描く */
export function CompanyHolidaySection({
  rows,
  onOpen,
  onAdd,
}: {
  rows: readonly CompanyHolidayRow[]
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
      <button type="button" onClick={onAdd} className={`${ROW_CLASS} text-primary`}>
        {T.addCompanyHoliday}
      </button>
    </div>
  )
}
