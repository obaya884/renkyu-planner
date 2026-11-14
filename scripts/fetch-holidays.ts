import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { todayInJapan } from '../src/domain/shared/date'
import { type HolidayData, mergeHolidayData, parseHolidayCsv } from '../src/domain/holidays/importCsv'

const URL_CSV = 'https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv'
// package.json に "type": "module" が無く CJS として変換されるため、import.meta と top-level await は使わない
const OUT = join(__dirname, '..', 'src', 'data', 'holidays.json')

async function main(): Promise<void> {
  const res = await fetch(URL_CSV, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = new TextDecoder('shift_jis').decode(await res.arrayBuffer())

  const parsed = parseHolidayCsv(text)
  if (!parsed.ok) throw new Error(parsed.reason)

  const prev: HolidayData | null = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf-8')) : null
  const merged = mergeHolidayData(prev, parsed.value, todayInJapan(new Date()))
  if (!merged.ok) throw new Error(merged.reason)

  writeFileSync(OUT, JSON.stringify(merged.value, null, 2) + '\n')
  console.log(`祝日 ${Object.keys(merged.value.holidays).length} 件を書きました（確定期限 ${merged.value.confirmedUntil}）`)
}

main().catch((e: unknown) => {
  console.error(`祝日の取り込みに失敗しました: ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
