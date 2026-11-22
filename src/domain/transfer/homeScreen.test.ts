import { expect, test } from 'vitest'
import { EMPTY_STORED } from '@/domain/storage/stored'
import { backupMarkOf, guideBrowser, homeScreenAudience, homeSheetStart, isBlankStored, moveLinkView, promptsAfterSave, showsGuideCard, showsSettingsEntry } from './homeScreen'
import { MAX_BACKUP_LINK_LENGTH } from './backupLink'

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const IPAD_AS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1'
const IPHONE_LINE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.19.0'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const WINDOWS_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const env = (userAgent: string, p: Partial<{ maxTouchPoints: number; standalone: boolean; forced: boolean }> = {}) => ({
  userAgent,
  maxTouchPoints: 0,
  standalone: false,
  forced: false,
  ...p,
})

test('試作（ホーム画面）: iPhone の Safari には案内を出す', () => {
  expect(homeScreenAudience(env(IPHONE_SAFARI, { maxTouchPoints: 5 }))).toBe('safari')
})
test('試作（ホーム画面）: Mac を名乗る iPad は、タッチの数で見分ける。本物の Mac には出さない', () => {
  expect(homeScreenAudience(env(IPAD_AS_MAC, { maxTouchPoints: 5 }))).toBe('safari')
  expect(homeScreenAudience(env(IPAD_AS_MAC, { maxTouchPoints: 0 }))).toBe('other')
})
test('試作（ホーム画面）: iPhone の Chrome には、Chrome 用の案内を出す。?guide=1 を付けても Chrome のまま', () => {
  expect(homeScreenAudience(env(IPHONE_CHROME, { maxTouchPoints: 5 }))).toBe('chrome')
  expect(homeScreenAudience(env(IPHONE_CHROME, { maxTouchPoints: 5, forced: true }))).toBe('chrome')
  expect(homeScreenAudience(env(IPHONE_CHROME, { maxTouchPoints: 5, standalone: true }))).toBe('homeApp')
  expect(guideBrowser('chrome')).toBe('chrome')
  expect(guideBrowser('safari')).toBe('safari')
  expect(guideBrowser('homeApp')).toBeNull()
  expect(guideBrowser('other')).toBeNull()
  expect(guideBrowser(null)).toBeNull()
  expect(showsGuideCard('chrome', false)).toBe(true)
  expect(showsSettingsEntry('chrome')).toBe(true)
  expect(promptsAfterSave({ audience: 'chrome', prompted: false, wasBlank: true, isBlank: false })).toBe(true)
})
test('試作（ホーム画面）: Android・PC・iOS の Safari と Chrome 以外のブラウザやアプリ内のブラウザには出さない', () => {
  expect(homeScreenAudience(env(ANDROID_CHROME, { maxTouchPoints: 5 }))).toBe('other')
  expect(homeScreenAudience(env(WINDOWS_CHROME))).toBe('other')
  expect(homeScreenAudience(env(IPHONE_LINE, { maxTouchPoints: 5 }))).toBe('other')
})
test('試作（ホーム画面）: ホーム画面のアプリとして開いているときは homeApp。?guide=1 より優先する', () => {
  expect(homeScreenAudience(env(IPHONE_SAFARI, { maxTouchPoints: 5, standalone: true }))).toBe('homeApp')
  expect(homeScreenAudience(env(IPHONE_SAFARI, { maxTouchPoints: 5, standalone: true, forced: true }))).toBe('homeApp')
})
test('試作（ホーム画面）: ?guide=1 なら、どの端末でも案内を出す', () => {
  expect(homeScreenAudience(env(WINDOWS_CHROME, { forced: true }))).toBe('safari')
  expect(homeScreenAudience(env(ANDROID_CHROME, { forced: true }))).toBe('safari')
})

test('試作（ホーム画面）: 上のカードは、出す相手で「閉じる」を押していないときだけ。設定画面の入口は閉じたあとも出す', () => {
  expect(showsGuideCard('safari', false)).toBe(true)
  expect(showsGuideCard('safari', true)).toBe(false)
  expect(showsGuideCard('homeApp', false)).toBe(false)
  expect(showsGuideCard('other', false)).toBe(false)
  expect(showsGuideCard(null, false)).toBe(false)
  expect(showsSettingsEntry('safari')).toBe(true)
  expect(showsSettingsEntry('homeApp')).toBe(false)
  expect(showsSettingsEntry(null)).toBe(false)
})

test('試作（ホーム画面）: 空の記録は、日程も設定も初めのまま', () => {
  expect(isBlankStored(EMPTY_STORED)).toBe(true)
  expect(isBlankStored({ ...EMPTY_STORED, settings: { ...EMPTY_STORED.settings, grantDay: '04-01' } })).toBe(false)
  expect(isBlankStored({ ...EMPTY_STORED, settings: { ...EMPTY_STORED.settings, workMinutes: 450 } })).toBe(false)
  expect(isBlankStored({ ...EMPTY_STORED, entries: [{ id: 'a', date: '2026-12-01', leaveTypeId: 'paid', amount: { kind: 'day' } }] as never })).toBe(false)
})
test('試作（ホーム画面）: 保存のあとに勧めるのは、記録が空から空でなくなった 1 回だけ', () => {
  expect(promptsAfterSave({ audience: 'safari', prompted: false, wasBlank: true, isBlank: false })).toBe(true)
  expect(promptsAfterSave({ audience: 'safari', prompted: true, wasBlank: true, isBlank: false })).toBe(false)
  expect(promptsAfterSave({ audience: 'safari', prompted: false, wasBlank: false, isBlank: false })).toBe(false)
  expect(promptsAfterSave({ audience: 'safari', prompted: false, wasBlank: true, isBlank: true })).toBe(false)
  expect(promptsAfterSave({ audience: 'homeApp', prompted: false, wasBlank: true, isBlank: false })).toBe(false)
  expect(promptsAfterSave({ audience: 'other', prompted: false, wasBlank: true, isBlank: false })).toBe(false)
})

test('試作（ホーム画面）: 手順のモーダルは、記録が空なら手順から、記録があれば移すかを聞くところから', () => {
  expect(homeSheetStart(true)).toBe('steps')
  expect(homeSheetStart(false)).toBe('choose')
})
test('試作（ホーム画面）: 移す控えが長さの上限を超えたら、移す道を出さない', () => {
  expect(moveLinkView('x'.repeat(MAX_BACKUP_LINK_LENGTH))).toBe('canMove')
  expect(moveLinkView('x'.repeat(MAX_BACKUP_LINK_LENGTH + 1))).toBe('tooLong')
})

test('試作（ホーム画面）: 控えの目印は、同じ控えなら同じ、違えば違う。長さを含み、短い', () => {
  const a = '#b1=' + 'A'.repeat(3000)
  const b = '#b1=' + 'A'.repeat(2999) + 'B'
  expect(backupMarkOf(a)).toBe(backupMarkOf(a))
  expect(backupMarkOf(a)).not.toBe(backupMarkOf(b))
  expect(backupMarkOf(a)).toMatch(/^3004:[0-9a-f]{8}$/)
  expect(backupMarkOf('#b1=abc')).not.toBe(backupMarkOf('#b1=acb'))
})
