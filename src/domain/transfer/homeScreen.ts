import { type IsoDate, addDays } from '@/domain/shared/date'
import type { StoredData } from '@/domain/storage/stored'
import { DEFAULT_SETTINGS } from '@/domain/types'
import { MAX_BACKUP_LINK_LENGTH } from './backupLink'

/**
 * ホーム画面への追加の案内（試作。仕様にはまだ無い）。iPhone・iPad の Safari は、しばらく開かないサイトの保存データを消すことがあり、
 * ホーム画面のアプリにはこの決まりが掛からない。ここは案内を出すか、どこから始めるかの判定だけを持つ
 */

/**
 * 案内の相手。safari と chrome は案内を出す相手（iPhone・iPad の Safari と Chrome で、ホーム画面のアプリではない）、
 * homeApp はホーム画面のアプリとして開いている、other はそれ以外（Android・PC・iOS のほかのブラウザ）。
 * 画面がまだ端末を読んでいないあいだは null で表す
 */
export type HomeScreenAudience = 'safari' | 'chrome' | 'homeApp' | 'other'

/** 案内を出すブラウザ。共有のボタンの場所が違うので、手順の文を分ける */
export type GuideBrowser = 'safari' | 'chrome'

/** 案内を出す相手ならそのブラウザ、出さない相手なら null */
export function guideBrowser(audience: HomeScreenAudience | null): GuideBrowser | null {
  return audience === 'safari' || audience === 'chrome' ? audience : null
}

export type HomeScreenEnv = Readonly<{
  userAgent: string
  /** navigator.maxTouchPoints。iPadOS の Safari は UA で Mac を名乗るので、これで見分ける */
  maxTouchPoints: number
  /** navigator.standalone === true か、display-mode: standalone に合う */
  standalone: boolean
  /** PoC 用の抜け道（アドレスの ?guide=1）。どの端末でも案内を出す */
  forced: boolean
}>

/** iOS の Chrome */
const IOS_CHROME = /CriOS\//
/** iOS のほかのブラウザとアプリ内のブラウザ。ホーム画面への追加の手順を確かめていないので出さない */
const NOT_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|GSA\/|FBAN|FBAV|Instagram|Line\/|MicroMessenger|Twitter/

export function homeScreenAudience(env: HomeScreenEnv): HomeScreenAudience {
  if (env.standalone) return 'homeApp'
  const ua = env.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && env.maxTouchPoints > 1)
  if (ios && IOS_CHROME.test(ua)) return 'chrome'
  if (env.forced) return 'safari'
  if (!ios) return 'other'
  return /Safari\//.test(ua) && !NOT_SAFARI.test(ua) ? 'safari' : 'other'
}

/** 「あとで」を押してから、カードをまた出すまでの日数（仮） */
export const GUIDE_SNOOZE_DAYS = 3

/** 今日「あとで」を押したとき、カードをまた出す最初の日 */
export function guideHiddenUntilOf(today: IsoDate): IsoDate {
  return addDays(today, GUIDE_SNOOZE_DAYS)
}

/** 1-A: 主な画面の上のカード。「あとで」を押したら、また出す日（hiddenUntil）まで隠す。二度と出さない道は無い */
export function showsGuideCard(audience: HomeScreenAudience | null, hiddenUntil: IsoDate | null, today: IsoDate): boolean {
  return guideBrowser(audience) !== null && (hiddenUntil === null || today >= hiddenUntil)
}

/** 設定画面の「記録の持ち出し」の節の入口。カードを隠しているあいだも出す */
export function showsSettingsEntry(audience: HomeScreenAudience | null): boolean {
  return guideBrowser(audience) !== null
}

/** 記録が初めのまま（日程が無く、設定も既定のまま）か */
export function isBlankStored(data: StoredData): boolean {
  const s = data.settings
  const d = DEFAULT_SETTINGS
  return (
    data.entries.length === 0 &&
    s.grantDay === null &&
    Object.keys(s.grantYears).length === 0 &&
    s.companyHolidays.length === 0 &&
    s.leaveTypes.length === d.leaveTypes.length &&
    JSON.stringify(s.leaveTypes) === JSON.stringify(d.leaveTypes) &&
    s.workMinutes === d.workMinutes &&
    s.weekStart === d.weekStart
  )
}

/** 1-C: 初めて設定か日程を保存した直後（記録が空から空でなくなったとき）に 1 回だけ勧める */
export function promptsAfterSave(p: Readonly<{ audience: HomeScreenAudience | null; prompted: boolean; wasBlank: boolean; isBlank: boolean }>): boolean {
  return guideBrowser(p.audience) !== null && !p.prompted && p.wasBlank && !p.isBlank
}

/** 手順のモーダルの始まり。記録が空なら手順の 3 歩、記録があれば「記録も一緒に移す」かを聞く */
export function homeSheetStart(blank: boolean): 'steps' | 'choose' {
  return blank ? 'steps' : 'choose'
}

/** 移す控えを入れたアドレス（全体）が長さの上限を超えたら、移す道を出さない */
export function moveLinkView(url: string): 'canMove' | 'tooLong' {
  return url.length > MAX_BACKUP_LINK_LENGTH ? 'tooLong' : 'canMove'
}

/**
 * 控えの目印。読み込んだか「やめる」を押した控えを覚え、同じ控えなら 2 回目から確かめない（ホーム画面のアプリは、
 * # のあとを消しても次に開くとまた付いてくるため）。形は「長さ:FNV-1a 32 ビットの 16 進」
 */
export function backupMarkOf(hash: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < hash.length; i++) {
    h ^= hash.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return `${hash.length}:${h.toString(16).padStart(8, '0')}`
}
