import { FONT_MONO, familyFor } from '../../fonts/families'
import { drawIcon, fillRoundRect, strokeRoundRect, withAlpha } from '../primitives'
import { drawLines, measure, truncate, type FontSpec } from '../text'
import type { BlockRenderer } from '../types'

const PAD = 20
/** GitHub 区块固定高度：标题行 26 + 间距 12 + 数字区 56 + 间距 12 + 元信息 20。 */
const GITHUB_BLOCK_H = 126
const TITLE_H = 26
const STATS_H = 56
const META_H = 20
const SECTION_GAP = 16
const CUSTOM_ROW_H = 26

export const achievementsBlock: BlockRenderer = {
  id: 'achievements',
  draw(c) {
    const { ctx, data, params, x, width } = c
    const gh = data.achievements.github
    const custom = data.achievements.custom
    if (!gh && custom.length === 0) return 0

    const family = familyFor(params.font)
    const inner = width - PAD * 2

    const height =
      PAD +
      (gh ? GITHUB_BLOCK_H : 0) +
      (gh && custom.length > 0 ? SECTION_GAP : 0) +
      custom.length * CUSTOM_ROW_H +
      PAD

    const y = c.y
    fillRoundRect(ctx, x, y, width, height, 16, withAlpha(params.text, 0.05))
    strokeRoundRect(ctx, x, y, width, height, 16, withAlpha(params.text, 0.1), 1)

    let iy = y + PAD

    if (gh) {
      const titleIcon = 16
      drawIcon(ctx, 'github', x + PAD, iy + 2, titleIcon, params.primary)
      const handleFont: FontSpec = { family: FONT_MONO, weight: 500, size: 14 }
      drawLines(
        ctx,
        [`@${gh.stats.login}`],
        x + PAD + titleIcon + 8,
        iy,
        handleFont,
        params.text,
        'left',
        18,
      )
      const dimFont: FontSpec = { family, weight: 400, size: 11 }
      drawLines(
        ctx,
        [`数据更新于 ${gh.fetchedAt}`],
        x + width - PAD,
        iy + 3,
        dimFont,
        params.textDim,
        'right',
        16,
      )
      iy += TITLE_H + 12

      const stats = [
        { value: gh.stats.totalStars, label: 'stars' },
        { value: gh.stats.publicRepos, label: 'repos' },
        { value: gh.stats.followers, label: 'followers' },
      ]
      const colWidth = inner / stats.length
      const valueFont: FontSpec = { family: FONT_MONO, weight: 700, size: 26 }
      const labelFont: FontSpec = { family, weight: 400, size: 11.5, letterSpacing: 0.6 }
      stats.forEach((stat, i) => {
        const cx = x + PAD + colWidth * i + colWidth / 2
        drawLines(ctx, [String(stat.value)], cx, iy, valueFont, params.text, 'center', 32)
        drawLines(ctx, [stat.label], cx, iy + 32, labelFont, params.textDim, 'center', 14)
      })
      iy += STATS_H

      const meta = [
        gh.stats.topLanguage ? `主语言 ${gh.stats.topLanguage}` : null,
        `加入 ${gh.stats.accountAgeYears} 年`,
      ]
        .filter(Boolean)
        .join('   ·   ')
      const metaFont: FontSpec = { family, weight: 400, size: 12 }
      drawLines(ctx, [meta], x + PAD, iy, metaFont, params.textDim, 'left', META_H)
      iy += META_H
    }

    if (custom.length > 0) {
      if (gh) iy += SECTION_GAP
      const itemFont: FontSpec = { family, weight: 500, size: 13.5 }
      const yearFont: FontSpec = { family, weight: 400, size: 12 }
      for (const item of custom) {
        drawIcon(ctx, 'star', x + PAD, iy + 2, 14, params.primary)
        const yearWidth = item.year ? measure(ctx, item.year, yearFont) + 14 : 0
        const titleMax = inner - 22 - yearWidth
        drawLines(
          ctx,
          [truncate(ctx, item.title, itemFont, titleMax)],
          x + PAD + 22,
          iy,
          itemFont,
          params.text,
          'left',
          18,
        )
        if (item.year) {
          drawLines(ctx, [item.year], x + width - PAD, iy + 2, yearFont, params.textDim, 'right', 16)
        }
        iy += CUSTOM_ROW_H
      }
    }

    return height
  },
}
