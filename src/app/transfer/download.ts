import { MAX_IMPORT_BYTES } from '@/domain/storage/limits'

/** D-11・F-505: 文字列をファイルにして、ブラウザの中で保存させる（通信はしない） */
export function downloadText(fileName: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  // すぐに取り消すと、保存が始まる前に URL が消えるブラウザがある
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** D-12: 選んだファイルの中身。3MB を超えるときは中を読まずに null。読むのに失敗したときも null */
export async function readFileText(file: File): Promise<string | null> {
  if (file.size > MAX_IMPORT_BYTES) return null
  try {
    return await file.text()
  } catch {
    return null
  }
}
