import type { MetadataRoute } from 'next'
import { APP_DESCRIPTION, APP_NAME } from './site'
import { APP_BACKGROUND, APP_THEME_COLOR } from './appIcon'

/**
 * Web アプリのマニフェスト（試作）。ホーム画面に追加したときの名前と見た目。
 * start_url は書かない。書くと、ホーム画面に追加したときにアドレスの # のあとの控えが落ちる。書かなければ、追加したときのアドレスで開く想定
 * （実機で確かめる点）
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    display: 'standalone',
    theme_color: APP_THEME_COLOR,
    background_color: APP_BACKGROUND,
    icons: [{ src: '/icon', sizes: '512x512', type: 'image/png' }],
  }
}
