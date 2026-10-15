/**
 * 本地持久化：IndexedDB。
 *
 * 分两个 store：
 *   card   —— 卡片数据，单档案，永远只有一条 'current' 记录
 *   assets —— 上传的图片原图（头像、微信 / QQ 二维码），以 Blob 存
 *
 * 两者分开是因为图片体积远大于数据：改一个字不必把几 MB 的 Blob 重新读写。
 */

import type { CardData } from './schema'

const DB_NAME = 'social-card'
const DB_VERSION = 1
const CARD_STORE = 'card'
const ASSET_STORE = 'assets'
const CARD_KEY = 'current'

export interface StoredAsset {
  id: string
  blob: Blob
  createdAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(CARD_STORE)) db.createObjectStore(CARD_STORE)
      if (!db.objectStoreNames.contains(ASSET_STORE)) db.createObjectStore(ASSET_STORE, { keyPath: 'id' })
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('打开本地数据库失败'))
  })

  return dbPromise
}

function run<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const request = fn(tx.objectStore(storeName))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('本地数据库操作失败'))
      }),
  )
}

export async function loadCard(): Promise<CardData | null> {
  const data = await run<CardData | undefined>(CARD_STORE, 'readonly', (s) => s.get(CARD_KEY))
  return data ?? null
}

export async function saveCard(data: CardData): Promise<void> {
  await run(CARD_STORE, 'readwrite', (s) => s.put(data, CARD_KEY))
}

/** 清空卡片数据；图片由调用方按需决定是否一起删。 */
export async function clearCard(): Promise<void> {
  await run(CARD_STORE, 'readwrite', (s) => s.delete(CARD_KEY))
}

export async function putAsset(id: string, blob: Blob): Promise<void> {
  const asset: StoredAsset = { id, blob, createdAt: Date.now() }
  await run(ASSET_STORE, 'readwrite', (s) => s.put(asset))
}

export async function getAsset(id: string): Promise<StoredAsset | null> {
  const asset = await run<StoredAsset | undefined>(ASSET_STORE, 'readonly', (s) => s.get(id))
  return asset ?? null
}

export async function deleteAsset(id: string): Promise<void> {
  await run(ASSET_STORE, 'readwrite', (s) => s.delete(id))
}

export async function listAssets(): Promise<StoredAsset[]> {
  return (await run<StoredAsset[]>(ASSET_STORE, 'readonly', (s) => s.getAll())) ?? []
}

export async function clearAssets(): Promise<void> {
  await run(ASSET_STORE, 'readwrite', (s) => s.clear())
}

export function newAssetId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
