import { SHORT_SELECT_FIELD_CLASS } from '@/app/components/Sheet'
import { T } from '@/app/texts'

export type Md = { month: number; day: number }
const pad = (n: number) => String(n).padStart(2, '0')
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
export const toMd = (md: string): Md => ({ month: Number(md.slice(0, 2)), day: Number(md.slice(3, 5)) })
export const fromMd = (v: Md) => `${pad(v.month)}-${pad(v.day)}`

/** 月と日の選択。日の選択肢は dayChoices(月) が返す日まで。月を変えて日がその月に無くなったら末日にする */
export function MonthDayPicker({
  label,
  value,
  onChange,
  dayChoices,
}: {
  label: string
  value: Md
  onChange: (v: Md) => void
  dayChoices: (month: number) => readonly number[]
}) {
  return (
    <fieldset>
      <legend className="text-sm text-sub">{label}</legend>
      <div className="flex items-center gap-2">
        <select
          aria-label={`${label} ${T.monthUnit}`}
          value={value.month}
          onChange={(e) => {
            const month = Number(e.target.value)
            onChange({ month, day: Math.min(value.day, dayChoices(month).length) })
          }}
          className={`${SHORT_SELECT_FIELD_CLASS} w-20`}
        >
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {T.monthUnit}
        <select aria-label={`${label} ${T.dayUnit}`} value={value.day} onChange={(e) => onChange({ ...value, day: Number(e.target.value) })} className={`${SHORT_SELECT_FIELD_CLASS} w-20`}>
          {dayChoices(value.month).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {T.dayUnit}
      </div>
    </fieldset>
  )
}
