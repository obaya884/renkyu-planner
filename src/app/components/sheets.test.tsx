import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { SHEET, UNSET } from '@/domain/view/fixture'
import { T } from '@/app/texts'
import { AddSheetBody } from './AddSheet'
import { EntrySheetBody } from './EntrySheet'
import { GrantSheetBody } from './GrantSheet'
import { SHEET_TITLE_ATTR } from './Sheet'

const noop = () => {}
const html = (el: React.ReactElement) => renderToStaticMarkup(el)

test('F-206: 日程に入れる面。休む日・連休・引く休暇・未割り当ての前後', () => {
  const h = html(<AddSheetBody input={SHEET} leaveDays={['2026-11-20']} onSubmit={noop} onClose={noop} />)
  expect(h).toContain('11/20(金)')
  expect(h).toContain('11/20〜11/23 の 4連休')
  expect(h).toContain('有休')
  expect(h).toContain('4 日と 2 時間')
  expect(h).toContain('3 日と 2 時間')
  expect(h).toContain(T.submitAdd)
})
test('Review Focus 2・F-209: 付与日をまたぐと、未割り当てを付与年ごとに 2 行出す', () => {
  const h = html(<AddSheetBody input={SHEET} leaveDays={['2027-04-28', '2027-05-06']} onSubmit={noop} onClose={noop} />)
  expect(h).toContain(T.thisGrantYear)
  expect(h).toContain(T.nextGrantYearLabel)
  expect(h).toContain('18 日と 2 時間')
  expect(h).toContain('16 日と 2 時間') // 今の付与年に 1 日入れた分、繰り越しの初期値も減る
})
test('F-211・F-106: 足りないときは不足と出す。付与日が未設定なら、未割り当ての行を出さない', () => {
  const five = ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-24', '2026-11-25']
  expect(html(<AddSheetBody input={SHEET} leaveDays={five} onSubmit={noop} onClose={noop} />)).toContain(T.short)
  const h = html(<AddSheetBody input={UNSET} leaveDays={['2026-11-20']} onSubmit={noop} onClose={noop} />)
  expect(h).toContain(T.enterGrantToSee)
  expect(h).not.toContain(T.unassigned)
})
test('F-301〜F-303: 日程を直す面と、日を足す面', () => {
  const entry = SHEET.entries.find((e) => e.date === '2026-12-28')!
  const h = html(<EntrySheetBody input={SHEET} entry={entry} defaultDate="2026-11-16" onSubmit={noop} onRemove={noop} onClose={noop} />)
  expect(h).toContain('12/28(月) の日程')
  expect(h).toContain('年末年始')
  expect(h).toContain('12/26〜1/3 の 9連休')
  expect(h).toContain(T.remove)
  expect(h).not.toContain('type="date"')
  const add = html(<EntrySheetBody input={SHEET} entry={null} defaultDate="2026-11-16" onSubmit={noop} onRemove={noop} onClose={noop} />)
  expect(add).toContain(T.addDayTitle)
  expect(add).toContain('type="date"')
  expect(add).toContain('value="2026-11-16"')
  expect(add).not.toContain(T.remove)
})
test('R-19: 日を足す面の日付は 4 つ目の四半期の末日まで。先の日付は理由を出して保存できない', () => {
  const add = html(<EntrySheetBody input={SHEET} entry={null} defaultDate="2026-11-16" onSubmit={noop} onRemove={noop} onClose={noop} />)
  expect(add).toContain('max="2027-09-30"')
  expect(add).not.toContain('まだ入れられません')
  const far = html(<EntrySheetBody input={SHEET} entry={null} defaultDate="2027-10-01" onSubmit={noop} onRemove={noop} onClose={noop} />)
  expect(far).toContain('この日は、まだ入れられません。2027年9月30日までの日を入れてください')
  expect(far).toMatch(/<button[^>]*disabled=""[^>]*>保存する/)
})
test('R-17・Review Focus 3: 休みの日と重なった日程を開くと、理由を出し、保存できない', () => {
  const y = { id: 'y', date: '2026-11-23', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false } as const
  const h = html(<EntrySheetBody input={{ ...SHEET, entries: [...SHEET.entries, y] }} entry={y} defaultDate="2026-11-16" onSubmit={noop} onRemove={noop} onClose={noop} />)
  expect(h).toContain('この日は休みの日です。休みの日には入れられません')
  expect(h).toMatch(/<button[^>]*disabled=""[^>]*>保存する/)
  expect(h).toContain(T.remove)
})
test('F-101・F-405・§5.3: 付与日と日数の面。初めては、この年に使える日数の欄と説明。次の付与年は、使える日数を文で出す', () => {
  const first = html(<GrantSheetBody input={UNSET} grantYearStart={null} onSubmit={noop} onClose={noop} />)
  expect(first).toContain(T.localOnly)
  expect(first).toContain(T.submitGrantFirst)
  expect(first).toContain(T.grantDaysLabel)
  expect(first).toContain(T.entitlementLabel)
  expect(first).toContain(T.entitlementHint)
  expect(first).not.toContain('繰り越し</legend>')
  expect(first).toContain('<option value="30">30</option>') // 初期の月は 4 月。日は 30 まで
  expect(first).not.toContain('<option value="31">31</option>')
  expect(first.match(/type="number"/g)).toHaveLength(3) // 付与日数、使える日数の日と時間
  expect(first).not.toContain('過ぎた四半期を開いて足せます')
  const next = html(<GrantSheetBody input={SHEET} grantYearStart="2027-05-01" onSubmit={noop} onClose={noop} />)
  expect(next).toContain('2027/5/1〜2028/4/30 の分')
  expect(next).toContain('value="14"') // 付与日数の初期値は前の年と同じ
  expect(next.match(/type="number"/g)).toHaveLength(1) // 付与日数だけ
  expect(next).toContain('14 日 ＋ 今の年の残り（いまは 4 日と 2 時間）')
  expect(next).toContain(T.save)
  expect(next).not.toContain('過ぎた四半期を開いて足せます')
})
test('§5.3: 始まった付与年の面は、付与日数と、計算した持ち分を初期値にした使える日数の欄', () => {
  const started = html(<GrantSheetBody input={SHEET} grantYearStart="2026-05-01" onSubmit={noop} onClose={noop} />)
  expect(started).toContain('2026/5/1〜2027/4/30 の分')
  expect(started.match(/type="number"/g)).toHaveLength(3)
  expect(started).toContain('value="14"')
  expect(started).not.toContain(T.entitlementHint)
})

test('R-17・F-306: 休む日が会社の休日と重なったら、理由を出して入れられない（日程に入れる面）', () => {
  const input = { ...SHEET, settings: { ...SHEET.settings, companyHolidays: [...SHEET.settings.companyHolidays, { kind: 'once', start: '2026-11-20', end: '2026-11-20' } as const] } }
  const h = html(<AddSheetBody input={input} leaveDays={['2026-11-20']} onSubmit={noop} onClose={noop} />)
  expect(h).toContain('この日は休みの日です。休みの日には入れられません')
  expect(h).toMatch(/<button[^>]*disabled=""[^>]*>予定に入れる/)
  expect(h.split('この日は休みの日です').length).toBe(2) // 同じ理由は 1 回だけ
  const ok = html(<AddSheetBody input={SHEET} leaveDays={['2026-11-20']} onSubmit={noop} onClose={noop} />)
  expect(ok).not.toMatch(/<button[^>]*disabled=""[^>]*>予定に入れる/)
})
test('F-206: 引く休暇に残りを添える。付与日をまたぐときと付与日が未設定のときは名前だけ', () => {
  expect(html(<AddSheetBody input={SHEET} leaveDays={['2026-11-20']} onSubmit={noop} onClose={noop} />)).toContain('残り 9 日と 2 時間')
  expect(html(<AddSheetBody input={SHEET} leaveDays={['2027-04-28', '2027-05-06']} onSubmit={noop} onClose={noop} />)).not.toContain('（残り')
  expect(html(<AddSheetBody input={UNSET} leaveDays={['2026-11-20']} onSubmit={noop} onClose={noop} />)).not.toContain('（残り')
})
test('§5.3: 初めての入力でも、題の下に付与年の期間を出す', () => {
  const h = html(<GrantSheetBody input={UNSET} grantYearStart={null} onSubmit={noop} onClose={noop} />)
  expect(h).toContain('2026/4/1〜2027/3/31 の分')
})

test('§5・P-1: 3 つの面の題は、開いたときに焦点を受ける（入力欄に焦点を入れない）', () => {
  const entry = SHEET.entries.find((e) => e.date === '2026-12-28')!
  const bodies = [
    <AddSheetBody key="add" input={SHEET} leaveDays={['2026-11-20']} onSubmit={noop} onClose={noop} />,
    <EntrySheetBody key="entry" input={SHEET} entry={entry} defaultDate="2026-11-16" onSubmit={noop} onRemove={noop} onClose={noop} />,
    <EntrySheetBody key="new" input={SHEET} entry={null} defaultDate="2026-11-16" onSubmit={noop} onRemove={noop} onClose={noop} />,
    <GrantSheetBody key="grant" input={UNSET} grantYearStart={null} onSubmit={noop} onClose={noop} />,
  ]
  for (const body of bodies) {
    const title = html(body).match(/<h2[^>]*>/)?.[0] ?? ''
    expect(title).toContain('tabindex="-1"')
    expect(title).toContain(`${SHEET_TITLE_ATTR}=""`)
  }
})
