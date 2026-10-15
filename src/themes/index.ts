/**
 * 主题注册表：把主题选择解析成渲染层能直接用的参数。
 *
 * 预设负责给出一套完整的默认值（配色 / 字体 / 背景 / 图案 / 尺寸节奏），
 * 用户覆盖只暴露其中少数几个维度，保证「怎么调都不会变丑」。
 */

import type { ThemeSelection } from '../data/schema'
import { isLight, mix, shade } from '../render/primitives'
import type { DecorHook, ThemeParams, ThemePreset } from '../render/types'
import { auroraPreset } from './presets/aurora'
import { monoPreset } from './presets/mono'
import { terminalPreset } from './presets/terminal'

export const PRESETS: ThemePreset[] = [terminalPreset, monoPreset, auroraPreset]

/** 浅色背景上使用的正文色。 */
const DARK_TEXT = '#16181d'

export function getPreset(id: string): ThemePreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0]
}

export function presetDecor(id: string): DecorHook | undefined {
  return getPreset(id).decor
}

/** 次级文字色由正文色向背景色混合得出，换任何配色都自动协调。 */
function deriveTextDim(text: string, bg: string): string {
  return mix(text, bg, 0.42)
}

export function resolveTheme(selection: ThemeSelection): ThemeParams {
  const defaults = getPreset(selection.presetId).defaults
  const o = selection.overrides

  const bgFrom = o.bg ?? defaults.bgFrom
  const bgTo = o.bg
    ? defaults.bgKind === 'gradient'
      ? shade(o.bg, 0.18)
      : o.bg
    : defaults.bgTo
  // 正文色：用户显式指定优先；只改了背景且背景变浅时自动换成深色正文，
  // 否则预设的浅色正文会在白底上消失。textDim 一律由 text 与背景混合得出。
  const text = o.text ?? (o.bg && isLight(bgFrom) ? DARK_TEXT : defaults.text)
  const textDim = deriveTextDim(text, bgFrom)

  return {
    ...defaults,
    primary: o.primary ?? defaults.primary,
    bgFrom,
    bgTo,
    text,
    textDim,
    font: o.font ?? defaults.font,
    spacing: o.spacing ?? defaults.spacing,
  }
}
