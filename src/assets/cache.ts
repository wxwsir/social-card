/**
 * 图片缓存。
 *
 * 渲染层要求同步取图（`image(id): Drawable | null`），而图片是从 IndexedDB
 * 异步读出来的，所以中间加一层缓存：先把用到的图解码进内存，之后渲染就能同步命中了。
 *
 * 缓存只保存「已解码」的图，不保存 Blob——解码结果（ImageBitmap）绘制最快。
 */

import { getAsset, putAsset, deleteAsset } from '../data/store'
import type { CardData } from '../data/schema'
import type { AssetResolver, Drawable } from '../render/types'

interface Entry {
  drawable: Drawable
  /** 回退到 <img> 时创建的 object URL，需要在淘汰时释放。 */
  url?: string
}

const cache = new Map<string, Entry>()

/** 交给渲染层的解析器：永远同步、永远可能返回 null。 */
export const assets: AssetResolver = {
  image: (id) => cache.get(id)?.drawable ?? null,
}

async function decode(blob: Blob): Promise<Entry> {
  if (typeof createImageBitmap === 'function') {
    try {
      return { drawable: await createImageBitmap(blob) }
    } catch {
      // 少数浏览器对某些格式不支持 createImageBitmap，退回 <img>。
    }
  }
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.src = url
  await img.decode()
  return { drawable: img, url }
}

function release(id: string): void {
  const entry = cache.get(id)
  if (!entry) return
  if (entry.url) URL.revokeObjectURL(entry.url)
  if (typeof ImageBitmap !== 'undefined' && entry.drawable instanceof ImageBitmap) {
    entry.drawable.close()
  }
  cache.delete(id)
}

/** 卡片数据里引用到的全部图片 id。 */
export function imageIdsOf(data: CardData): string[] {
  const ids: string[] = []
  if (data.profile.avatarId) ids.push(data.profile.avatarId)
  for (const social of data.socials) {
    if (social.qrImageId) ids.push(social.qrImageId)
  }
  return ids
}

/** 把还没进缓存的图解码进来；返回是否加载了新内容（用于决定要不要重绘）。 */
export async function ensureAssets(ids: string[]): Promise<boolean> {
  const missing = ids.filter((id) => !cache.has(id))
  if (missing.length === 0) return false

  let loaded = false
  await Promise.all(
    missing.map(async (id) => {
      const asset = await getAsset(id)
      if (!asset) return
      cache.set(id, await decode(asset.blob))
      loaded = true
    }),
  )
  return loaded
}

/** 上传：存库 + 立即解码进缓存，调用方随后重绘即可同步取到。 */
export async function putImage(id: string, blob: Blob): Promise<void> {
  await putAsset(id, blob)
  release(id)
  cache.set(id, await decode(blob))
}

/** 删除单张图片（替换头像时清理旧图）。 */
export async function removeImage(id: string): Promise<void> {
  await deleteAsset(id)
  release(id)
}

export function clearImageCache(): void {
  for (const id of [...cache.keys()]) release(id)
}
