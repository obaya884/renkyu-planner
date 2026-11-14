import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { SHEET, UNSET } from '@/domain/view/fixture'
import { T } from '@/app/texts'
import { AddSheetBody } from './AddSheet'
import { EntrySheetBody } from './EntrySheet'
import { GrantSheetBody } from './GrantSheet'

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
test('R-17・Review Focus 3: 休みの日と重なった日程を開くと、理由を出し、保存できない', () => {
  const y = { id: 'y', date: '2026-11-23', leaveTypeId: 'paid', amount: { unit: 'day' }, title: '', done: false } as const
  const h = html(<EntrySheetBody input={{ ...SHEET, entries: [...SHEET.entries, y] }} entry={y} defaultDate="2026-11-16" onSubmit={noop} onRemove={noop} onClose={noop} />)
  expect(h).toContain('この日は休みの日です。休みの日には入れられません')
  expect(h).toMatch(/<button[^>]*disabled[^>]*>保存する/)
  expect(h).toContain(T.remove)
})
test('F-101・F-405: 付与日と日数の面。次の付与年は、繰り越しの初期値が今の未割り当て', () => {
  const first = html(<GrantSheetBody input={UNSET} grantYearStart={null} onSubmit={noop} onClose={noop} />)
  expect(first).toContain(T.localOnly)
  expect(first).toContain(T.submitGrantFirst)
  const next = html(<GrantSheetBody input={SHEET} grantYearStart="2027-05-01" onSubmit={noop} onClose={noop} />)
  expect(next).toContain('2027/5/1〜2028/4/30 の分')
  expect(next).toContain('value="14"') // 付与日数の初期値は前の年と同じ
  expect(next).toContain('value="4"') // 繰り越しの日
  expect(next).toContain('value="2"') // 繰り越しの時間
})
