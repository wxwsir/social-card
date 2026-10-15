/**
 * 字体加载。
 *
 * 内置字体通过 unicode-range 分成多个子集文件，浏览器只会下载「实际用到的字」
 * 所在的子集。但 Canvas 不会自动触发子集加载，必须显式把文本交给
 * document.fonts.load，否则导出时会出现豆腐块。
 */

import type { CardData } from '../data/schema'
import { FONT_MONO, FONT_SANS } from './families'

const WEIGHTS = [400, 500, 700]

/**
 * 收集卡片上所有会被渲染的字符。
 *
 * 除了用户填的内容，还要带上区块里写死的标签文字——那些字同样需要字形子集，
 * 漏掉就会在导出图里变成豆腐块。
 */
export function collectText(data: CardData): string {
  const parts: string[] = [
    data.profile.name,
    data.profile.handle ?? '',
    data.profile.bio ?? '',
    data.identity.title ?? '',
    data.identity.tags.join(''),
    data.identity.location ?? '',
    data.identity.org ?? '',
    ...data.socials.flatMap((s) => [s.label ?? '', s.value]),
    ...data.achievements.custom.flatMap((a) => [a.title, a.year ?? '', a.note ?? '']),
    data.footer.website ?? '',
    'stars repos followers 数据更新于 主语言 加入 年…0123456789',
  ]
  const gh = data.achievements.github
  if (gh) {
    parts.push(`@${gh.stats.login} ${gh.stats.topLanguage ?? ''} ${gh.fetchedAt}`)
  }
  return parts.join('')
}

/** sampleText 应当是卡片上所有会被渲染的字符，包括区块里写死的标签文字。 */
export async function loadFonts(sampleText: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return

  const specs: string[] = []
  for (const weight of WEIGHTS) {
    specs.push(`${weight} 16px "${FONT_SANS}"`)
    specs.push(`${weight} 16px "${FONT_MONO}"`)
  }

  await Promise.all(specs.map((spec) => document.fonts.load(spec, sampleText)))
  await document.fonts.ready
}
