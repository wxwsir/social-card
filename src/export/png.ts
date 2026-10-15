/**
 * PNG 导出与文件下载。
 *
 * 导出走的是 renderCard，与页面预览完全同一套绘制代码，
 * 只是把 scale 换成 1/2/3——所以导出结果不存在与预览不一致的可能。
 */

import { renderCard } from '../render/engine'
import type { RenderReport } from '../render/engine'
import type { RenderInput } from '../render/types'
import { downloadBlob } from './download'

export interface ExportResult {
  blob: Blob
  /** 本次渲染的版面报告，导出后据此提示用户是否发生了压缩或裁切。 */
  report: RenderReport
}

export async function renderToBlob(input: RenderInput, scale: number): Promise<ExportResult> {
  const canvas = document.createElement('canvas')
  const report = renderCard(canvas, input, scale)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('导出 PNG 失败')
  return { blob, report }
}

export async function exportCardPNG(
  input: RenderInput,
  scale: number,
  filename: string,
): Promise<ExportResult> {
  const result = await renderToBlob(input, scale)
  downloadBlob(result.blob, filename)
  return result
}
