import { expect, test } from 'vitest'
import { MAX_IMPORT_BYTES } from '@/domain/storage/limits'
import { readFileText } from './download'

test('D-12: 3MB ちょうどのファイルは読み、1 バイトでも超えたら中を読まずに null', async () => {
  expect(await readFileText(new File(['a'.repeat(MAX_IMPORT_BYTES)], 'x.json'))).toHaveLength(MAX_IMPORT_BYTES)
  expect(await readFileText(new File(['a'.repeat(MAX_IMPORT_BYTES + 1)], 'x.json'))).toBeNull()
})
