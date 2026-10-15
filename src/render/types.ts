import type { CardData, BlockId, FontChoice, PatternKind } from '../data/schema'

/** 已解析的主题参数：预设默认值叠加用户覆盖后的最终结果。 */
export interface ThemeParams {
  primary: string
  bgFrom: string
  bgTo: string
  bgKind: 'solid' | 'gradient'
  bgAngle: number
  pattern: PatternKind
  text: string
  /** 次级文字色，由 text 派生。 */
  textDim: string
  font: FontChoice
  /** 间距倍率，1 为标准节奏。 */
  spacing: number
  /** 卡片外框圆角，0 为直角。 */
  radius: number
  /** 内容区上下留白。 */
  padding: number
}

export type Drawable = HTMLImageElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas

/** 渲染层通过这个接口取图片，完全不感知图片存在哪里。 */
export interface AssetResolver {
  image(id: string): Drawable | null
}

export interface RenderInput {
  data: CardData
  params: ThemeParams
  assets: AssetResolver
  /** 主题装饰钩子，由主题预设提供。 */
  decor?: DecorHook
  /** 导出透明背景：跳过背景与装饰，只留内容。 */
  transparent?: boolean
}

/** 主题装饰钩子：在内容绘制之前调用，用来画背景纹理与几何装饰。 */
export type DecorHook = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: ThemeParams,
) => void

export interface ThemePreset {
  id: string
  name: string
  defaults: Omit<ThemeParams, 'textDim'>
  decor?: DecorHook
}

export interface BlockContext {
  ctx: CanvasRenderingContext2D
  data: CardData
  params: ThemeParams
  assets: AssetResolver
  /** 内容区左边界。 */
  x: number
  /** 内容区宽度。 */
  width: number
  /** 当前区块的顶部 y 坐标。 */
  y: number
}

export interface BlockRenderer {
  id: BlockId
  /** 绘制并返回该区块占用的高度。 */
  draw(c: BlockContext): number
}
