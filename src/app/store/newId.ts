type IdSource = { randomUUID?: () => string; getRandomValues(a: Uint8Array): Uint8Array }

/**
 * D-7: 日程の id。`crypto.randomUUID()` があればそれを使う。
 * 無い環境（https でも localhost でもない接続）では、`getRandomValues` の 16 バイトから UUID v4 の形の文字列を作る
 */
export function newId(c: IdSource): string {
  if (typeof c.randomUUID === 'function') return c.randomUUID()
  const b = c.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40 // 版 4
  b[8] = (b[8] & 0x3f) | 0x80 // バリアント 10
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
