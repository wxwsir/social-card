import { FONT_MONO, familyFor } from '../../fonts/families'
import { drawImageCover, pathAvatarShape, withAlpha } from '../primitives'
import { drawLines, truncate, wrapText, type FontSpec } from '../text'
import type { BlockContext, BlockRenderer, Drawable } from '../types'

/** 取头像占位字符：中文取前两个字，英文取各词首字母。 */
function initialsOf(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  if (/[\u2E80-\u9FFF]/.test(trimmed[0])) return trimmed.slice(0, 2)
  const words = trimmed.split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/** 头像：有上传图片就裁切填充，没有就用主题色 + 名字首字兜底。 */
function drawAvatar(c: BlockContext, x: number, y: number, size: number): void {
  const { ctx, data, params, assets } = c
  const shape = data.profile.avatarShape
  const img: Drawable | null = data.profile.avatarId
    ? assets.image(data.profile.avatarId)
    : null

  ctx.save()
  pathAvatarShape(ctx, shape, x, y, size)
  ctx.clip()
  if (img) {
    drawImageCover(ctx, img, x, y, size, size)
  } else {
    ctx.fillStyle = withAlpha(params.primary, 0.14)
    ctx.fillRect(x, y, size, size)
    const f: FontSpec = {
      family: familyFor(params.font),
      weight: 700,
      size: size * 0.36,
      letterSpacing: 2,
    }
    const lineHeight = f.size * 1.2
    drawLines(ctx, [initialsOf(data.profile.name)], x + size / 2, y + (size - lineHeight) / 2, f, params.primary, 'center', lineHeight)
  }
  ctx.restore()

  ctx.save()
  pathAvatarShape(ctx, shape, x, y, size)
  ctx.strokeStyle = withAlpha(params.primary, 0.5)
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

export const headerBlock: BlockRenderer = {
  id: 'header',
  draw(c) {
    const { ctx, data, params, x, width } = c
    const family = familyFor(params.font)
    const spacing = params.spacing
    const cx = x + width / 2
    let y = c.y

    const avatarSize = 104
    drawAvatar(c, cx - avatarSize / 2, y, avatarSize)
    y += avatarSize + 22 * spacing

    const nameFont: FontSpec = { family, weight: 700, size: 36, letterSpacing: 1 }
    const nameLine = nameFont.size * 1.25
    drawLines(
      ctx,
      [truncate(ctx, data.profile.name, nameFont, width)],
      cx,
      y,
      nameFont,
      params.text,
      'center',
      nameLine,
    )
    y += nameLine + 6 * spacing

    if (data.profile.handle) {
      const f: FontSpec = { family: FONT_MONO, weight: 400, size: 15, letterSpacing: 0.5 }
      drawLines(
        ctx,
        [truncate(ctx, data.profile.handle, f, width)],
        cx,
        y,
        f,
        params.primary,
        'center',
        20,
      )
      y += 20 + 10 * spacing
    }

    if (data.profile.bio) {
      const f: FontSpec = { family, weight: 400, size: 14.5 }
      const lines = wrapText(ctx, data.profile.bio, f, width * 0.88)
      const lineHeight = 24
      drawLines(ctx, lines, cx, y, f, params.textDim, 'center', lineHeight)
      y += lines.length * lineHeight
    }

    return y - c.y
  },
}
