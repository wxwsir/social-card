import { withAlpha } from '../../render/primitives'
import type { ThemePreset } from '../../render/types'

/** 跟 primitives.ts 里同名函数的本地副本——同一份实现，不循环引入私有函数。 */
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

/**
 * Aurora 极光风：深紫 → 青蓝渐变 + 散点星图。
 *
 * 装饰钩子在渐变背景上撒一批位置 / 大小 / 透明度都不同的星星，
 * 固定种子保证同一张卡片每次渲染星星位置都一样——不会一会儿有、一会儿没。
 */
export const auroraPreset: ThemePreset = {
  id: 'aurora',
  name: 'Aurora 极光',
  defaults: {
    primary: '#7dd3fc',
    bgFrom: '#1e1b4b',
    bgTo: '#0c4a6e',
    bgKind: 'gradient',
    bgAngle: 160,
    pattern: 'dots',
    text: '#e2e8f0',
    font: 'sans',
    spacing: 1,
    radius: 20,
    padding: 46,
  },
  decor(ctx, width, height, params) {
    ctx.save()
    const rand = mulberry32(20261015 * 7)

    // 主星：更大更亮，散布在整个背景
    ctx.fillStyle = withAlpha(params.primary, 0.9)
    for (let i = 0; i < 14; i++) {
      const x = rand() * width
      const y = rand() * height
      const r = 1.2 + rand() * 2.5
      ctx.globalAlpha = 0.5 + rand() * 0.5
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // 副星：更小更暗，作为背景点
    ctx.fillStyle = withAlpha(params.primary, 0.5)
    for (let i = 0; i < 40; i++) {
      const x = rand() * width
      const y = rand() * height
      const r = 0.4 + rand() * 0.9
      ctx.globalAlpha = 0.2 + rand() * 0.3
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // 顶部一条极光线——用 radial gradient 横向铺一条淡紫色光带
    const gradientY = height * 0.12
    const grad = ctx.createLinearGradient(0, gradientY - 30, 0, gradientY + 30)
    grad.addColorStop(0, withAlpha('#c4b5fd', 0))
    grad.addColorStop(0.5, withAlpha('#c4b5fd', 0.18))
    grad.addColorStop(1, withAlpha('#c4b5fd', 0))
    ctx.globalAlpha = 1
    ctx.fillStyle = grad
    ctx.fillRect(0, gradientY - 30, width, 60)

    ctx.restore()
  },
}
