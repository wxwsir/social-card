/** Canvas 绘制原语：圆角、异形裁剪、渐变、图案、图标。 */

import { ICON_PATHS, type IconName } from '../icons/paths'
import type { Drawable } from './types'
import type { AvatarShape, PatternKind } from '../data/schema'

// ---------- 颜色 ----------

interface Rgb {
  r: number
  g: number
  b: number
}

export function hexToRgb(hex: string): Rgb {
  let h = hex.replace('#', '')
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** amount > 0 提亮，< 0 压暗，范围 -1..1。 */
export function shade(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  const mix = (c: number) =>
    Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount))
  const to = (c: number) => mix(c).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/** 在两种颜色之间插值，t 取 0..1。 */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a)
  const y = hexToRgb(b)
  const to = (ca: number, cb: number) =>
    Math.round(ca + (cb - ca) * t)
      .toString(16)
      .padStart(2, '0')
  return `#${to(x.r, y.r)}${to(x.g, y.g)}${to(x.b, y.b)}`
}

/** 判断颜色是否偏亮，用于自动决定叠加层用黑还是白。 */
export function isLight(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

// ---------- 形状 ----------

export function pathRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** 超椭圆（iOS 风格的 squircle），n 越大越接近正方形。 */
export function pathSquircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  n = 5,
): void {
  const r = size / 2
  const cx = x + r
  const cy = y + r
  const steps = 96
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const cos = Math.cos(t)
    const sin = Math.sin(t)
    const px = cx + Math.sign(cos) * Math.pow(Math.abs(cos), 2 / n) * r
    const py = cy + Math.sign(sin) * Math.pow(Math.abs(sin), 2 / n) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/** 构造头像形状的路径但不落笔，便于先裁剪再描边。 */
export function pathAvatarShape(
  ctx: CanvasRenderingContext2D,
  shape: AvatarShape,
  x: number,
  y: number,
  size: number,
): void {
  if (shape === 'circle') {
    ctx.beginPath()
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
  } else if (shape === 'squircle') {
    pathSquircle(ctx, x, y, size)
  } else {
    pathRoundRect(ctx, x, y, size, size, size * 0.24)
  }
}

/** 把当前上下文裁剪成指定头像形状，调用方负责 save / restore。 */
export function clipAvatarShape(
  ctx: CanvasRenderingContext2D,
  shape: AvatarShape,
  x: number,
  y: number,
  size: number,
): void {
  pathAvatarShape(ctx, shape, x, y, size)
  ctx.clip()
}

export function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
): void {
  pathRoundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = color
  ctx.fill()
}

export function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  lineWidth = 1,
): void {
  pathRoundRect(ctx, x, y, w, h, r)
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

// ---------- 图片 ----------

/** 按 object-fit: cover 的方式绘制图片，多余部分居中裁掉。 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: Drawable,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const iw = img.width
  const ih = img.height
  if (iw === 0 || ih === 0) return
  const scale = Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

/** 按 object-fit: contain 的方式绘制，完整显示不裁切。 */
export function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: Drawable,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const iw = img.width
  const ih = img.height
  if (iw === 0 || ih === 0) return
  const scale = Math.min(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

// ---------- 图标 ----------

const iconCache = new Map<IconName, Path2D>()

function iconPath(name: IconName): Path2D {
  let p = iconCache.get(name)
  if (!p) {
    p = new Path2D(ICON_PATHS[name])
    iconCache.set(name, p)
  }
  return p
}

/** 在 (x, y) 处绘制一个 size x size 的图标，颜色随主题。 */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.fillStyle = color
  ctx.fill(iconPath(name))
  ctx.restore()
}

// ---------- 图案 ----------

/** 确定性随机数，保证预览与导出得到完全一致的纹理。 */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 在整块画布上绘制程序生成的纹理，图案颜色跟随主题色。 */
export function drawPattern(
  ctx: CanvasRenderingContext2D,
  kind: PatternKind,
  w: number,
  h: number,
  color: string,
  opacity: number,
): void {
  if (kind === 'none' || opacity <= 0) return
  ctx.save()
  ctx.strokeStyle = withAlpha(color, opacity)
  ctx.fillStyle = withAlpha(color, opacity)
  ctx.lineWidth = 1

  if (kind === 'grid') {
    const step = 48
    for (let x = step; x < w; x += step) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, h)
      ctx.stroke()
    }
    for (let y = step; y < h; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(w, y + 0.5)
      ctx.stroke()
    }
  } else if (kind === 'stripes') {
    const step = 32
    ctx.lineWidth = 8
    for (let i = -h; i < w + h; i += step) {
      ctx.beginPath()
      ctx.moveTo(i, h)
      ctx.lineTo(i + h, 0)
      ctx.stroke()
    }
  } else if (kind === 'dots') {
    const step = 36
    for (let x = step / 2; x < w; x += step) {
      for (let y = step / 2; y < h; y += step) {
        ctx.beginPath()
        ctx.arc(x, y, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (kind === 'noise') {
    const rand = mulberry32(20261015)
    const count = Math.round((w * h) / 900)
    for (let i = 0; i < count; i++) {
      const x = rand() * w
      const y = rand() * h
      ctx.fillRect(x, y, 1.5, 1.5)
    }
  }
  ctx.restore()
}

// ---------- 其他 ----------

/** 在指定矩形内绘制线性渐变（angle 为角度制，0 表示从上到下）。 */
export function fillGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  from: string,
  to: string,
  angleDeg: number,
  roundRadius = 0,
): void {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  const cx = x + w / 2
  const cy = y + h / 2
  const len = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad))
  const dx = (Math.cos(rad) * len) / 2
  const dy = (Math.sin(rad) * len) / 2
  const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy)
  g.addColorStop(0, from)
  g.addColorStop(1, to)
  if (roundRadius > 0) pathRoundRect(ctx, x, y, w, h, roundRadius)
  else {
    ctx.beginPath()
    ctx.rect(x, y, w, h)
  }
  ctx.fillStyle = g
  ctx.fill()
}
