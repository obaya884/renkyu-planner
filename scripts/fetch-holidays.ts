import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { todayInJapan } from '../src/domain/shared/date'
import { type HolidayData, mergeHolidayData, parseHolidayCsv } from '../src/domain/holidays/importCsv'

const URL_CSV = 'https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv'
const OUT = fileURLToPath(new URL('../src/data/holidays.json', import.meta.url))

function fail(reason: string): never {
  console.error(`祝日の取り込みに失敗しました: ${reason}`)
  process.exit(1)
}

const res = await fetch(URL_CSV)
if (!res.ok) fail(`HTTP ${res.status}`)
const text = new TextDecoder('shift_jis').decode(await res.arrayBuffer())

const parsed = parseHolidayCsv(text)
if (!parsed.ok) fail(parsed.reason)

const prev: HolidayData | null = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf-8')) : null
const merged = mergeHolidayData(prev, parsed.value, todayInJapan(new Date()))
if (!merged.ok) fail(merged.reason)

writeFileSync(OUT, JSON.stringify(merged.value, null, 2) + '\n')
console.log(`祝日 ${Object.keys(merged.value.holidays).length} 件を書きました（確定期限 ${merged.value.confirmedUntil}）`)
