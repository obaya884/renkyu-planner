/**
 * ホーム画面のアイコン（試作。絵柄は仮）。主色の地に、白いカレンダーの形。
 * ImageResponse の同梱の字体には日本語が無く、日本語を出すとビルドのときに Google Fonts から取りに行くので、文字は入れない
 */
export const APP_THEME_COLOR = '#0d9488'
export const APP_BACKGROUND = '#ffffff'
/** 試し用のアドレスだと分かるよう、PoC のあいだはアイコンの地を赤にする（本番は主色） */
const POC_ICON_COLOR = '#dc2626'

/** 一辺 size の正方形のアイコンの中身。icon.tsx と apple-icon.tsx が ImageResponse に渡す */
export function AppIconArt({ size }: { size: number }) {
  const u = size / 16
  const cell = { width: u * 2, height: u * 1.6, borderRadius: u * 0.3, background: '#fecaca' }
  const row = (key: string) => (
    <div key={key} style={{ display: 'flex', gap: u * 0.8 }}>
      <div style={cell} />
      <div style={cell} />
      <div style={cell} />
    </div>
  )
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: POC_ICON_COLOR }}>
      <div style={{ width: u * 10, height: u * 9.5, display: 'flex', flexDirection: 'column', borderRadius: u * 1.2, background: '#ffffff', overflow: 'hidden' }}>
        <div style={{ height: u * 2.2, background: '#7f1d1d' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: u * 0.8 }}>
          {row('a')}
          {row('b')}
        </div>
      </div>
    </div>
  )
}
