import { familyFor } from '../../fonts/families'
import { drawIcon, fillRoundRect, strokeRoundRect, withAlpha } from '../primitives'
import { drawLines, measure, truncate, type FontSpec } from '../text'
import type { BlockContext, BlockRenderer } from '../types'

/** 身份标签：药丸形 chips，按可用宽度自动折行并整体居中。 */
function drawChips(
  c: BlockContext,
  tags: string[],
  top: number,
): number {
  const { ctx, params, x, width } = c
  const f: FontSpec = { family: familyFor(params.font), weight: 500, size: 13, letterSpacing: 0.3 }
  const padX = 11
  const padY = 6
  const gap = 8
  const rowGap = 8
  const chipH = f.size + padY * 2

  const rows: { text: string; w: number }[][] = []
  let row: { text: string; w: number }[] = []
  let rowW = 0
  for (const tag of tags) {
    const text = truncate(ctx, tag, f, width - padX * 2)
    const w = measure(ctx, text, f) + padX * 2
    const addW = row.length === 0 ? w : gap + w
    if (rowW + addW > width && row.length > 0) {
      rows.push(row)
      row = [{ text, w }]
      rowW = w
    } else {
      row.push({ text, w })
      rowW += addW
    }
  }
  if (row.length > 0) rows.push(row)

  const textOffset = (chipH - f.size * 1.2) / 2
  let y = top
  for (const r of rows) {
    const totalW = r.reduce((sum, chip) => sum + chip.w, 0) + gap * (r.length - 1)
    let cursor = x + (width - totalW) / 2
    for (const chip of r) {
      fillRoundRect(ctx, cursor, y, chip.w, chipH, chipH / 2, withAlpha(params.primary, 0.12))
      strokeRoundRect(ctx, cursor, y, chip.w, chipH, chipH / 2, withAlpha(params.primary, 0.4), 1)
      drawLines(ctx, [chip.text], cursor + chip.w / 2, y + textOffset, f, params.primary, 'center', f.size * 1.2)
      cursor += chip.w + gap
    }
    y += chipH + rowGap
  }
  return y - rowGap - top
}

export const identityBlock: BlockRenderer = {
  id: 'identity',
  draw(c) {
    const { ctx, data, params, x, width } = c
    const family = familyFor(params.font)
    const spacing = params.spacing
    const cx = x + width / 2
    let y = c.y

    if (data.identity.title) {
      const f: FontSpec = { family, weight: 500, size: 15.5, letterSpacing: 1.5 }
      drawLines(
        ctx,
        [truncate(ctx, data.identity.title, f, width)],
        cx,
        y,
        f,
        params.primary,
        'center',
        22,
      )
      y += 22 + 14 * spacing
    }

    if (data.identity.tags.length > 0) {
      y += drawChips(c, data.identity.tags, y) + 14 * spacing
    }

    const meta = [data.identity.org, data.identity.location].filter(Boolean).join('  ·  ')
    if (meta) {
      const f: FontSpec = { family, weight: 400, size: 13 }
      const iconSize = 15
      const textW = measure(ctx, meta, f)
      const startX = cx - (textW + iconSize + 7) / 2
      drawIcon(ctx, 'location', startX, y + 1, iconSize, params.textDim)
      drawLines(ctx, [meta], startX + iconSize + 7, y, f, params.textDim, 'left', 18)
      y += 18
    }

    return y - c.y
  },
}
