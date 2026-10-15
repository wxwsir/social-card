/** 内置字体的族名，渲染层与加载层共用。 */

import type { FontChoice } from '../data/schema'

export const FONT_SANS = 'Noto Sans SC'
export const FONT_MONO = 'JetBrains Mono'

/** 字体档位到族名的映射。卡片正文跟随主题，数字与地址固定用等宽体。 */
export function familyFor(choice: FontChoice): string {
  return choice === 'mono' ? FONT_MONO : FONT_SANS
}
