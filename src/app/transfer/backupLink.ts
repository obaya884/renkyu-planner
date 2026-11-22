import type { Result } from '@/domain/shared/result'
import { MAX_IMPORT_BYTES } from '@/domain/storage/limits'
import type { StoredData } from '@/domain/storage/stored'
import { backupHashOf, backupPayloadOf, fromBase64Url, packStored, toBase64Url, unpackStored } from '@/domain/transfer/backupLink'

/**
 * 控えのリンク（試作）の圧縮と展開。ブラウザ（と Node 22）の CompressionStream('deflate-raw') を使う。
 * 詰めた形と base64url は domain/transfer/backupLink.ts
 */

async function readAll(stream: ReadableStream<Uint8Array>, maxBytes: number): Promise<Uint8Array | null> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    // 膨らむ細工に備え、上限を超えたらそこで止める
    if (total > maxBytes) {
      await reader.cancel().catch(() => {})
      return null
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

function streamOf(bytes: Uint8Array<ArrayBuffer>): ReadableStream<BufferSource> {
  return new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
}

export async function compress(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const out = await readAll(streamOf(bytes).pipeThrough(new CompressionStream('deflate-raw')), Number.MAX_SAFE_INTEGER)
  return out ?? new Uint8Array()
}

/** 展開する。壊れている・途中で切れている・上限を超えるなら null */
async function decompress(bytes: Uint8Array<ArrayBuffer>, maxBytes: number): Promise<Uint8Array | null> {
  try {
    return await readAll(streamOf(bytes).pipeThrough(new DecompressionStream('deflate-raw')), maxBytes)
  } catch {
    return null
  }
}

/** いまの記録から控えのリンクを作る。base はリンクの # の前（主な画面の URL） */
export async function makeBackupLink(data: StoredData, base: string): Promise<string> {
  const packed = new TextEncoder().encode(packStored(data))
  return `${base}${backupHashOf(toBase64Url(await compress(packed)))}`
}

/** 控えのリンクのハッシュ（# から）を読む。読めなければ失敗を返し、例外を外へ出さない */
export async function readBackupHash(hash: string, newId: () => string): Promise<Result<StoredData>> {
  const unreadable = { ok: false, reason: '読めないリンクです' } as const
  const payload = backupPayloadOf(hash)
  if (payload === null || payload.length > MAX_IMPORT_BYTES) return unreadable
  const bytes = fromBase64Url(payload)
  if (bytes === null) return unreadable
  const raw = await decompress(bytes, MAX_IMPORT_BYTES)
  if (raw === null) return unreadable
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(raw)
  } catch {
    return unreadable
  }
  return unpackStored(text, newId)
}
