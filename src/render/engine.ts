/**
 * 渲染入口。
 *
 * 预览和导出调用的是同一个函数，唯一区别是 scale：
 * 预览用 devicePixelRatio 对应的倍率，导出用 1/2/3。
 * 因此导出的图与预览不存在「不一致」这一类 bug。
 */

import { renderBlocks } from './layout'
import { drawPattern, fillGradient, pathRoundRect } from './primitives'
import type { RenderInput } from './types'

const PATTERN_OPACITY = 0.07
/** 间距自动压缩的下限倍数。 */
const SPACING_FLOOR = 0.55
/** 内容整体缩放的下限比例。 */
const CONTENT_SCALE_FLOOR = 0.8
/** 压缩幅度小于这个比例就不提——为 1% 的收紧弹一条告警纯属噪音。 */
const WARN_TOLERANCE = 0.05

export interface RenderReport {
  contentHeight: number
  availableHeight: number
  /** 实际使用的间距倍率，低于用户设定值即表示发生了压缩。 */
  spacing: number
  /** 内容整体的额外缩放，1 表示未缩放。 */
  contentScale: number
  /** 压缩到下限仍装不下：底部会被裁掉。 */
  overflow: boolean
  /** 压缩幅度已经大到值得告诉用户；轻微的自动收紧不算。 */
  compressed: boolean
}

interface Compression {
  spacing: number
  contentScale: number
  /** 压缩后内容的高度（未叠加 contentScale）。 */
  height: number
}

/** 用指定的间距倍率量一次内容总高度。区块的测量与绘制是同一套代码。 */
function measureHeightAt(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  width: number,
  spacing: number,
): number {
  const params = input.params
  const adjusted = spacing === params.spacing ? input : { ...input, params: { ...params, spacing } }
  return renderBlocks(ctx, adjusted, 0, width, 0)
}

/**
 * 求解压缩方案。
 *
 * 每个区块的高度、区块之间的间距都与 spacing 严格线性相关，
 * 所以先试目标值，装不下时再用 0 与 1 两次采样解出那条直线，
 * 直接算出刚好装下所需的 spacing，无需二分逼近。
 */
function solveCompression(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  width: number,
  available: number,
): Compression {
  const target = input.params.spacing

  const heightAtTarget = measureHeightAt(ctx, input, width, target)
  if (heightAtTarget <= available) {
    return { spacing: target, contentScale: 1, height: heightAtTarget }
  }

  const h0 = measureHeightAt(ctx, input, width, 0)
  const h1 = measureHeightAt(ctx, input, width, 1)
  const slope = h1 - h0
  const solved = slope > 0 ? (available - h0) / slope : target
  const spacing = Math.max(SPACING_FLOOR, Math.min(target, solved))
  const height = h0 + slope * spacing

  if (height <= available) {
    return { spacing, contentScale: 1, height }
  }

  const scale = available / height
  if (scale >= CONTENT_SCALE_FLOOR) {
    return { spacing, contentScale: scale, height }
  }
  return { spacing, contentScale: CONTENT_SCALE_FLOOR, height }
}

export function renderCard(
  canvas: HTMLCanvasElement,
  input: RenderInput,
  scale: number,
): RenderReport {
  const { data, params } = input
  const width = data.canvas.width
  const height = data.canvas.height

  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法获取 Canvas 2D 上下文')

  // 所有布局代码都在逻辑坐标系（540x960）里工作，缩放交给变换矩阵。
  ctx.setTransform(scale, 0, 0, scale, 0, 0)

  const contentX = params.padding
  const contentWidth = width - params.padding * 2
  const available = height - params.padding * 2

  ctx.clearRect(0, 0, width, height)
  const compression = solveCompression(ctx, input, contentWidth, available)

  const finalParams =
    compression.spacing === params.spacing ? params : { ...params, spacing: compression.spacing }
  const finalInput = finalParams === params ? input : { ...input, params: finalParams }

  const contentHeight = compression.height * compression.contentScale
  const topY = params.padding + Math.max(0, (available - contentHeight) / 2)

  ctx.clearRect(0, 0, width, height)
  if (!input.transparent) drawBackground(ctx, finalInput, width, height)

  // 整体缩放时围绕内容区水平居中，避免缩小后内容偏左。
  const scaledWidth = contentWidth * compression.contentScale
  const offsetX = contentX + (contentWidth - scaledWidth) / 2
  ctx.save()
  ctx.translate(offsetX, topY)
  ctx.scale(compression.contentScale, compression.contentScale)
  renderBlocks(ctx, finalInput, 0, contentWidth, 0)
  ctx.restore()

  const squeezed = compression.spacing < params.spacing * (1 - WARN_TOLERANCE)
  const shrunk = compression.contentScale < 1 - WARN_TOLERANCE
  const overflow = contentHeight > available + 0.5

  return {
    contentHeight,
    availableHeight: available,
    spacing: compression.spacing,
    contentScale: compression.contentScale,
    overflow,
    compressed: squeezed || shrunk,
  }
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  width: number,
  height: number,
): void {
  const { params } = input
  ctx.save()
  if (params.radius > 0) {
    pathRoundRect(ctx, 0, 0, width, height, params.radius)
    ctx.clip()
  }
  if (params.bgKind === 'gradient') {
    fillGradient(ctx, 0, 0, width, height, params.bgFrom, params.bgTo, params.bgAngle)
  } else {
    ctx.fillStyle = params.bgFrom
    ctx.fillRect(0, 0, width, height)
  }
  drawPattern(ctx, params.pattern, width, height, params.primary, PATTERN_OPACITY)
  input.decor?.(ctx, width, height, params)
  ctx.restore()
}
