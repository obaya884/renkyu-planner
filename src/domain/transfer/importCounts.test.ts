import { expect, test } from 'vitest'
import { SHEET } from '@/domain/view/fixture'
import { importCounts } from './importCounts'

test('§5.6・G-3: 読み込む件数。休暇の種類は有休を含める', () => {
  expect(importCounts({ version: 1, settings: SHEET.settings, entries: SHEET.entries })).toEqual({ entries: 12, companyHolidays: 1, leaveTypes: 1 })
})
