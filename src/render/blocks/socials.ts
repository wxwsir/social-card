import { FONT_MONO, familyFor } from '../../fonts/families'
import { iconForPlatform } from '../../icons/paths'
import { drawIcon, drawImageContain, fillRoundRect } from '../primitives'
import { drawLines, measure, truncate, type FontSpec } from '../text'
import type { BlockRenderer } from '../types'

const ROW_H = 30
const ICON_SIZE = 17
/** 列表整体收窄并居中，避免长链接把版面拉散。 */
const MAX_LIST_WIDTH = 320
/** 微信 / QQ 的二维码：要能被手机扫出来，尺寸不能小，且必须留白色静区。 */
const QR_SIZE = 72
const QR_PAD = 4

export const socialsBlock: BlockRenderer = {
  id: 'socials',
  draw(c) {
    const { ctx, data, params, assets, x, width } = c
    const family = familyFor(params.font)
    const valueFont: FontSpec = { family: FONT_MONO, weight: 400, size: 14.5 }
    const labelFont: FontSpec = { family, weight: 500, size: 13, letterSpacing: 0.5 }

    const listWidth = Math.min(width, MAX_LIST_WIDTH)
    const listX = x + (width - listWidth) / 2
    const textX = listX + ICON_SIZE + 12
    const rowTextTop = (ROW_H - 18) / 2

    let y = c.y
    for (const social of data.socials) {
      const qr = social.qrImageId ? assets.image(social.qrImageId) : null

      if (qr) {
        fillRoundRect(ctx, listX, y, QR_SIZE, QR_SIZE, 8, '#ffffff')
        drawImageContain(
          ctx,
          qr,
          listX + QR_PAD,
          y + QR_PAD,
          QR_SIZE - QR_PAD * 2,
          QR_SIZE - QR_PAD * 2,
        )

        const tx = listX + QR_SIZE + 14
        const available = Math.max(listX + listWidth - tx, 60)
        const blockH = social.label ? 44 : 18
        let ty = y + (QR_SIZE - blockH) / 2
        if (social.label) {
          drawLines(ctx, [social.label], tx, ty, labelFont, params.textDim, 'left', 18)
          ty += 26
        }
        const value = truncate(ctx, social.value, valueFont, available)
        drawLines(ctx, [value], tx, ty, valueFont, params.text, 'left', 18)

        y += QR_SIZE + 12 * params.spacing
        continue
      }

      const icon = iconForPlatform(social.platform)
      if (icon) drawIcon(ctx, icon, listX, y + rowTextTop, ICON_SIZE, params.primary)

      let cursor = textX
      if (social.label) {
        drawLines(ctx, [social.label], cursor, y + rowTextTop, labelFont, params.textDim, 'left', 18)
        cursor += measure(ctx, social.label, labelFont) + 10
      }
      const available = listX + listWidth - cursor
      const value = truncate(ctx, social.value, valueFont, Math.max(available, 40))
      drawLines(ctx, [value], cursor, y + rowTextTop, valueFont, params.text, 'left', 18)

      y += ROW_H
    }

    return y - c.y
  },
}
