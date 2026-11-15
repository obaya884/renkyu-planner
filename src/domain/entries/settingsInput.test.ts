import { expect, test } from 'vitest'
import { isValidWorkMinutes, workMinutesFrom } from './settingsInput'

test('F-102・D-4: 時間と分から所定労働時間（分）', () => {
  expect(workMinutesFrom('7', '45')).toBe(465)
  expect(workMinutesFrom('8', '0')).toBe(480)
  expect(workMinutesFrom('', '0')).toBeNaN()
  expect(workMinutesFrom('7.5', '0')).toBeNaN()
  expect(workMinutesFrom('7', '60')).toBeNaN()
  expect(isValidWorkMinutes(workMinutesFrom('24', '0'))).toBe(true)
  expect(isValidWorkMinutes(1441)).toBe(false)
  expect(isValidWorkMinutes(workMinutesFrom('0', '0'))).toBe(false)
})
