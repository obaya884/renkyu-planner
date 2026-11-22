import { ImageResponse } from 'next/og'
import { AppIconArt } from './appIcon'

// 試作。リクエスト時の API を使わないので、ビルドのときに静的な画像として出る（app-icons の docs）
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<AppIconArt size={size.width} />, size)
}
