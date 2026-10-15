import { FONT_MONO } from '../../fonts/families'
import { withAlpha } from '../primitives'
import { drawLines, type FontSpec } from '../text'
import type { BlockRenderer } from '../types'

export const footerBlock: BlockRenderer = {
  id: 'footer',
  draw(c) {
    const { ctx, data, params, x, width } = c
    let y = c.y

    ctx.save()
    ctx.strokeStyle = withAlpha(params.text, 0.12)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y + 0.5)
    ctx.lineTo(x + width, y + 0.5)
    ctx.stroke()
    ctx.restore()
    y += 20 * params.spacing

    if (data.footer.website) {
      const f: FontSpec = { family: FONT_MONO, weight: 400, size: 12.5, letterSpacing: 0.8 }
      drawLines(ctx, [data.footer.website], x + width / 2, y, f, params.textDim, 'center', 18)
      y += 18
    }

    return y - c.y
  },
}
