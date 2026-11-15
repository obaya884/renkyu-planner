'use client'

import { useState } from 'react'
import { SHORT_FIELD_CLASS } from '@/app/components/Sheet'
import { T, errorText } from '@/app/texts'
import { isValidWorkMinutes, workMinutesFrom } from '@/domain/entries/settingsInput'

/** §6: 1 日の所定労働時間。時間と分の欄。保存のボタンは置かず、受け付けられる値になるたびに onChange を呼ぶ */
export function WorkMinutesRow({ workMinutes, onChange }: { workMinutes: number; onChange: (minutes: number) => void }) {
  const [hours, setHours] = useState(String(Math.floor(workMinutes / 60)))
  const [minutes, setMinutes] = useState(String(workMinutes % 60))
  const [invalid, setInvalid] = useState(false)

  const edit = (nextHours: string, nextMinutes: string) => {
    setHours(nextHours)
    setMinutes(nextMinutes)
    const total = workMinutesFrom(nextHours, nextMinutes)
    const ok = isValidWorkMinutes(total)
    // 空の欄には文を出さない。入力の途中で消えるため
    setInvalid(!ok && nextHours !== '' && nextMinutes !== '')
    if (ok) onChange(total)
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          aria-label={T.hoursUnit}
          value={hours}
          onChange={(e) => edit(e.target.value, minutes)}
          className={`${SHORT_FIELD_CLASS} w-20`}
        />
        <span className="whitespace-nowrap">{T.hoursUnit}</span>
        <input
          type="text"
          inputMode="numeric"
          aria-label={T.minutesUnit}
          value={minutes}
          onChange={(e) => edit(hours, e.target.value)}
          className={`${SHORT_FIELD_CLASS} w-20`}
        />
        <span className="whitespace-nowrap">{T.minutesUnit}</span>
      </div>
      {invalid && <p className="mt-1 text-sm text-warn-ink">{errorText('invalidWorkMinutes')}</p>}
    </div>
  )
}
