import { T } from '@/app/texts'
import type { WeekStart } from '@/domain/types'

const OPTIONS: readonly { value: WeekStart; label: string }[] = [
  { value: 'monday', label: T.monday },
  { value: 'sunday', label: T.sunday },
]

/** §6: 週の始まり。「週の始まり」の見出しと、「月曜」「日曜」の 2 つのラジオ */
export function WeekStartRow({ weekStart, onChange }: { weekStart: WeekStart; onChange: (w: WeekStart) => void }) {
  return (
    <fieldset>
      <legend className="text-sm text-sub">{T.weekStartLabel}</legend>
      <div className="flex gap-4">
        {OPTIONS.map((o) => (
          <label key={o.value} className="flex min-h-11 items-center gap-2">
            <input type="radio" name="weekStart" value={o.value} checked={weekStart === o.value} onChange={() => onChange(o.value)} className="h-5 w-5 accent-primary" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
