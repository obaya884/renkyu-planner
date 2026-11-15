import { T, companyHolidayText } from '@/app/texts'
import type { CompanyHolidayRow } from '@/domain/view/settingsView'

const ROW_CLASS = 'flex min-h-11 w-full items-center py-2 text-left'

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
        <button key={r.index} type="button" onClick={() => onOpen(r.index)} className={ROW_CLASS}>
          {companyHolidayText(r.holiday)}
        </button>
      ))}
      <button type="button" onClick={onAdd} className={`${ROW_CLASS} text-primary`}>
        {T.addCompanyHoliday}
      </button>
    </div>
  )
}
