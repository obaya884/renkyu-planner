/**
 * 控えのリンク（試作）を渡す。navigator.share が使えれば共有シートを開き、使えなければクリップボードに写す。
 * どちらもできなければ manual を返し、画面がリンクを選べる欄に出す。
 * 共有シートを閉じた（AbortError）ときも manual にする（もう一度押さなくても写せるように）
 */
export async function deliverLink(url: string): Promise<'shared' | 'copied' | 'manual'> {
  if (typeof navigator.share === 'function' && (navigator.canShare?.({ url }) ?? true)) {
    try {
      await navigator.share({ url })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'manual'
      // NotAllowedError（押してから時間がたった）などは、クリップボードを試す
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'manual'
  }
}
