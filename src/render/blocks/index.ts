import type { BlockId } from '../../data/schema'
import type { BlockRenderer } from '../types'
import { achievementsBlock } from './achievements'
import { footerBlock } from './footer'
import { headerBlock } from './header'
import { identityBlock } from './identity'
import { socialsBlock } from './socials'

/** 区块注册表：BlockId 到绘制函数的唯一映射。新增区块只需在这里注册。 */
export const BLOCK_RENDERERS: Record<BlockId, BlockRenderer> = {
  header: headerBlock,
  identity: identityBlock,
  socials: socialsBlock,
  achievements: achievementsBlock,
  footer: footerBlock,
}
