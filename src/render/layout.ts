/**
 * 布局层：按 blocks 数组的顺序把区块垂直堆叠。
 *
 * 每个区块自己负责在给定的 (x, y, width) 内绘制并报告占用的高度，
 * 布局层只做累加和间距，不关心区块内部长什么样。
 */

import { BLOCK_RENDERERS } from './blocks'
import type { RenderInput } from './types'

export const BASE_PADDING = 46
export const BASE_BLOCK_GAP = 26

/** 绘制全部启用的区块，返回内容总高度。 */
export function renderBlocks(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  x: number,
  width: number,
  startY: number,
): number {
  const { data, params, assets } = input
  const gap = BASE_BLOCK_GAP * params.spacing
  let y = startY
  let count = 0

  for (const block of data.blocks) {
    if (!block.enabled) continue
    const renderer = BLOCK_RENDERERS[block.id]
    if (!renderer) continue
    const height = renderer.draw({ ctx, data, params, assets, x, width, y })
    if (height <= 0) continue
    y += height + gap
    count++
  }

  return y - (count > 0 ? gap : 0) - startY
}
