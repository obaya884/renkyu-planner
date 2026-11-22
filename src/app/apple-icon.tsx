import { ImageResponse } from 'next/og'
import { AppIconArt } from './appIcon'

// 試作。iOS のホーム画面のアイコン（apple-touch-icon、180×180）。ビルドのときに静的な画像として出る
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(<AppIconArt size={size.width} />, size)
}
