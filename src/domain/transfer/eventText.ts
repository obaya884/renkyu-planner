/** 対になったサロゲートは 1 つ目のグループに取り、対になっていないものだけを置き換える（後読みを使わない） */
const SURROGATES = /([\ud800-\udbff][\udc00-\udfff])|[\ud800-\udfff]/g

/** E-4 で題から除く文字。タブを除く制御文字と、行の区切りと見なされうる U+0085・U+2028・U+2029 */
export const ICS_REMOVED_CHARS = /[\u0000-\u0008\u000a-\u001f\u007f\u0085\u2028\u2029]/g

/** E-4・画面定義書 §5.2: 対になっていないサロゲートを U+FFFD に置き換える。どんな文字列でも例外を投げない */
export function toWellFormed(s: string): string {
  return s.replace(SURROGATES, (_, pair: string | undefined) => pair ?? '\ufffd')
}

/** E-4: 除く文字と空白だけの名前は、名前なしとして扱う */
export function isBlankEventName(name: string): boolean {
  return name.replace(ICS_REMOVED_CHARS, '').trim() === ''
}
