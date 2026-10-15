import { withAlpha } from '../../render/primitives'
import type { ThemePreset } from '../../render/types'

/**
 * Terminal 终端风：纯黑底 + 等宽字体 + 荧光绿主色。
 * 装饰钩子画 CRT 扫描线和顶部提示条，强化终端识别度。
 */
export const terminalPreset: ThemePreset = {
  id: 'terminal',
  name: 'Terminal 终端',
  defaults: {
    primary: '#3fb950',
    bgFrom: '#0b0f14',
    bgTo: '#0b0f14',
    bgKind: 'solid',
    bgAngle: 180,
    pattern: 'grid',
    text: '#e6edf3',
    font: 'mono',
    spacing: 1,
    radius: 0,
    padding: 52,
  },
  decor(ctx, width, height, params) {
    ctx.save()
    ctx.fillStyle = withAlpha('#000000', 0.15)
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1)
    }
    ctx.fillStyle = withAlpha(params.primary, 0.85)
    ctx.fillRect(0, 0, width, 3)
    ctx.restore()
  },
}
