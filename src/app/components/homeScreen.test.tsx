import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import holidays from '@/data/holidays.json'
import { Planner } from '@/app/Planner'
import { T, homeGuideBody, homeMoveLead, homeNoMoveText, homePromptBody } from '@/app/texts'
import { HomeGuideCard, HomePromptSheetBody } from './HomeGuide'
import { HomeScreenSheetBody } from './HomeScreenSheet'
import { TransferSection } from './TransferSection'

const noop = () => {}
const html = (el: React.ReactElement) => renderToStaticMarkup(el)
const sheet = (view: React.ComponentProps<typeof HomeScreenSheetBody>['view']) => html(<HomeScreenSheetBody view={view} browser="safari" onMove={noop} onSkip={noop} onClose={noop} />)

test('試作（ホーム画面）: 最初の HTML（サーバーで出す分）には案内も手順も入れない', () => {
  const h = html(<Planner holidays={holidays}>{null}</Planner>)
  expect(h).not.toContain(T.homeGuideTitle)
  expect(h).not.toContain(T.homeStepsTitle)
  expect(h).not.toContain(T.homePromptTitle)
})
test('試作（ホーム画面）: 手順の 3 歩。共有のボタンの絵 →「ホーム画面に追加」→「追加」の順で、閉じるがある', () => {
  const h = sheet({ kind: 'steps' })
  expect(h).toContain(T.homeStepsTitle)
  const at = (s: string) => h.indexOf(s)
  expect(at(`aria-label="${T.homeShareIconLabel}"`)).toBeGreaterThan(-1)
  expect(at('<svg')).toBeGreaterThan(-1)
  expect(at(`aria-label="${T.homeShareIconLabel}"`)).toBeLessThan(at(`>${T.homeStep2Key}<`))
  expect(at(`>${T.homeStep2Key}<`)).toBeLessThan(at(`>${T.homeStep3Key}<`))
  expect(h).toContain(T.homeStepsAfter)
  expect(h).toContain(`>${T.close}</button>`)
  expect(h).not.toContain(T.homeMoveGo)
})
test('試作（ホーム画面）: 記録があるときは、件数を添えて移すかを聞く。控えを作っているあいだは移すボタンを押せない', () => {
  const h = sheet({ kind: 'choose', entryCount: 3, preparing: false })
  expect(homeMoveLead(3, 'safari')).toBe('ホーム画面のアプリは、Safari とは別の場所に記録を持ちます。いまの記録（日程 3 件）も一緒に移せます。')
  expect(h).toContain(homeMoveLead(3, 'safari'))
  expect(h).toContain(T.homeMoveGo)
  expect(h).toContain(T.homeMoveSkip)
  expect(h).not.toContain('<ol')
  expect(sheet({ kind: 'choose', entryCount: 3, preparing: true })).toMatch(/disabled=""[^>]*>記録も一緒に移す</)
})
test('試作（ホーム画面）: 準備ができたら、題を変えて同じ 3 歩と「やめる」。長すぎるときは移さずに書き出しを勧める', () => {
  const ready = sheet({ kind: 'ready' })
  expect(ready).toContain(T.homeReadyTitle)
  expect(ready).toContain(T.homeReadyAfter)
  expect(ready).toContain(T.homeStep3Key)
  expect(ready).toContain(`>${T.cancel}</button>`)
  const long = sheet({ kind: 'noMove', reason: 'tooLong' })
  expect(long).toContain(homeNoMoveText('tooLong', 'safari'))
  expect(long).toContain(T.exportFile)
  expect(long).not.toContain(T.homeMoveGo)
})
test('試作（ホーム画面）: 上のカードと、保存のあとの勧め', () => {
  const card = html(<HomeGuideCard browser="safari" onOpen={noop} onClose={noop} />)
  for (const s of [T.homeGuideTitle, homeGuideBody('safari'), T.homeGuideOpen, T.homeGuideClose]) expect(card).toContain(s)
  const prompt = html(<HomePromptSheetBody browser="safari" onGo={noop} onLater={noop} />)
  for (const s of [T.homePromptTitle, homePromptBody('safari'), T.homePromptStrong, T.homePromptGo, T.homePromptLater]) expect(prompt).toContain(s)
})
test('試作（ホーム画面）: 設定画面の入口は、渡したときだけ主な画面へのリンクの形で出す', () => {
  const props = { note: null, canRestore: false, link: null, onExport: noop, onMakeLink: noop, onStartImport: noop, onPickFile: noop, onRestore: noop, onExportIcs: noop, onClear: noop }
  expect(html(<TransferSection {...props} />)).not.toContain(T.homeEntry)
  expect(html(<TransferSection {...props} onHomeScreen={noop} />)).toMatch(/<a[^>]*href="\/"[^>]*>ホーム画面に追加する手順を見る<\/a>/)
})
test('試作（ホーム画面）: Chrome では、文の中のブラウザの名前と、共有のボタンの場所の文を Chrome のものにする', () => {
  const card = html(<HomeGuideCard browser="chrome" onOpen={noop} onClose={noop} />)
  expect(card).toContain('Chrome は、しばらく開かないサイトの記録を消すことがあります。')
  expect(card).not.toContain('Safari')
  const prompt = html(<HomePromptSheetBody browser="chrome" onGo={noop} onLater={noop} />)
  expect(prompt).toContain('この iPhone の Chrome の中にあります')
  expect(prompt).not.toContain('Safari')
  const steps = html(<HomeScreenSheetBody view={{ kind: 'steps' }} browser="chrome" onMove={noop} onSkip={noop} onClose={noop} />)
  expect(steps).toContain('アドレスの欄の右にある共有のボタン')
  const choose = html(<HomeScreenSheetBody view={{ kind: 'choose', entryCount: 3, preparing: false }} browser="chrome" onMove={noop} onSkip={noop} onClose={noop} />)
  expect(choose).toContain('ホーム画面のアプリは、Chrome とは別の場所に記録を持ちます。いまの記録（日程 3 件）も一緒に移せます。')
  const failed = html(<HomeScreenSheetBody view={{ kind: 'noMove', reason: 'failed' }} browser="chrome" onMove={noop} onSkip={noop} onClose={noop} />)
  expect(failed).toContain(homeNoMoveText('failed', 'chrome'))
  expect(failed).not.toContain('Safari')
})
