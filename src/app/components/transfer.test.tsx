import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { T, errorText, importCountsText, transferNoteText } from '@/app/texts'
import { ImportSheetBody } from './ImportSheet'
import { TransferSection } from './TransferSection'

const noop = () => {}
const html = (el: React.ReactElement) => renderToStaticMarkup(el)
const section = (p: Partial<React.ComponentProps<typeof TransferSection>> = {}) =>
  html(<TransferSection note={null} canRestore={false} onExport={noop} onPickFile={noop} onRestore={noop} onExportIcs={noop} onClear={noop} {...p} />)

test('F-505・F-506・§6: 記録の持ち出しの節。4 つのボタンと、保存先の説明', () => {
  const h = section()
  expect(h).toContain(T.transferSection)
  const at = (s: string) => h.indexOf(s)
  expect(at(T.exportFile)).toBeLessThan(at(T.importFile))
  expect(at(T.importFile)).toBeLessThan(at(T.exportIcs))
  expect(at(T.exportIcs)).toBeLessThan(at(T.clearAll))
  expect(h).toContain('type="file"')
  expect(h).toContain('記録は、このブラウザの中にだけ保存しています。運営には送られません。機種を変えるときや、ほかの端末で使うときは、ファイルに書き出して読み込んでください。')
  expect(h).not.toContain(T.restoreImport)
})
test('F-505・§6・§8.3: 読み込んだあとの 1 行と「読み込む前に戻す」、読めないファイルの 1 行', () => {
  expect(transferNoteText('imported')).toBe('読み込みました')
  expect(transferNoteText('restored')).toBe('読み込む前に戻しました')
  expect(errorText('unreadableFile')).toBe('このファイルは読み込めませんでした')
  expect(transferNoteText('unreadableFile')).toBe('このファイルは読み込めませんでした')
  expect(section({ note: 'unreadableFile' })).toMatch(/role="alert"[^>]*>このファイルは読み込めませんでした</)
  const imported = section({ note: 'imported', canRestore: true })
  expect(imported).toContain('読み込みました')
  expect(imported).toContain(T.restoreImport)
})
test('§5.6: 読み込む前に確かめるモーダル。件数と、置き換わることを出す', () => {
  expect(importCountsText({ entries: 12, companyHolidays: 1, leaveTypes: 1 })).toBe('日程 12 件、会社の休日 1 件、休暇の種類 1 件を読み込みます')
  const h = html(<ImportSheetBody counts={{ entries: 12, companyHolidays: 1, leaveTypes: 1 }} onSubmit={noop} onClose={noop} />)
  expect(h).toContain(T.importTitle)
  expect(h).toContain('日程 12 件、会社の休日 1 件、休暇の種類 1 件を読み込みます')
  expect(h).toContain('いまの記録は置き換わります')
  expect(h.indexOf(T.cancel)).toBeLessThan(h.indexOf(T.importSubmit)) // 確定を右に置く（§4）
})
