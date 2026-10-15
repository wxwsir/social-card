/**
 * 项目备份：把卡片数据连同图片一起打包成一个 JSON 文件。
 *
 * 图片以 base64 内嵌，因为导出的是一个自包含文件——用户换台电脑、换个浏览器，
 * 导入同一个文件就能完整还原，不必再去翻图片原图。
 */

import type { CardData } from './schema'
import { clearAssets, getAsset, putAsset } from './store'

const FORMAT = 'social-card'
const FORMAT_VERSION = 1

interface ProjectFile {
  format: typeof FORMAT
  version: number
  exportedAt: string
  card: CardData
  assets: { id: string; mime: string; data: string }[]
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      const comma = url.indexOf(',')
      resolve(comma >= 0 ? url.slice(comma + 1) : '')
    }
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(data: string, mime: string): Blob {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime || 'application/octet-stream' })
}

/** 卡片数据里引用到的图片 id（与 assets/cache.ts 的收集逻辑保持一致）。 */
function referencedIds(data: CardData): string[] {
  const ids: string[] = []
  if (data.profile.avatarId) ids.push(data.profile.avatarId)
  for (const social of data.socials) {
    if (social.qrImageId) ids.push(social.qrImageId)
  }
  return ids
}

export async function exportProject(data: CardData): Promise<Blob> {
  const assets: ProjectFile['assets'] = []
  for (const id of referencedIds(data)) {
    const asset = await getAsset(id)
    if (!asset) continue
    assets.push({ id, mime: asset.blob.type, data: await blobToBase64(asset.blob) })
  }

  const file: ProjectFile = {
    format: FORMAT,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    card: data,
    assets,
  }
  return new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
}

/** 导入：把备份里的图片写回本地库，返回还原后的卡片数据。 */
export async function importProject(file: File): Promise<CardData> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('这个文件不是有效的 JSON')
  }

  const project = parsed as Partial<ProjectFile>
  if (project.format !== FORMAT || !project.card) {
    throw new Error('这个文件不是本工具导出的项目备份')
  }
  if (typeof project.version === 'number' && project.version > FORMAT_VERSION) {
    throw new Error('备份来自更新的版本，当前版本无法读取')
  }

  // 备份里的图片是完整的一套，先清掉旧图避免残留孤儿数据。
  await clearAssets()
  for (const asset of project.assets ?? []) {
    if (!asset?.id || typeof asset.data !== 'string') continue
    await putAsset(asset.id, base64ToBlob(asset.data, asset.mime))
  }

  return project.card as CardData
}
