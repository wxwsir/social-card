/**
 * 中文文本测量与换行。
 *
 * Canvas 没有 CSS 那样的自动换行，中英文混排必须自己拆：
 * CJK 字符可以逐字断行；拉丁字母与数字视为不可分割的「词」；
 * 空格是断点但不能留在行首。
 */

export interface FontSpec {
  family: string
  weight: number
  size: number
  /** 字距，单位 px。 */
  letterSpacing?: number
}

const CJK_RE = /[\u2E80-\u303F\u3040-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/

export function fontString(f: FontSpec): string {
  return `${f.weight} ${f.size}px "${f.family}"`
}

/** 设置字体。font 与 letterSpacing 都属于 canvas 绘图状态，会被 save/restore 覆盖。 */
function setFont(ctx: CanvasRenderingContext2D, f: FontSpec): void {
  ctx.font = fontString(f)
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${f.letterSpacing ?? 0}px`
  }
}

export function measure(ctx: CanvasRenderingContext2D, text: string, f: FontSpec): number {
  ctx.save()
  setFont(ctx, f)
  const w = ctx.measureText(text).width
  ctx.restore()
  return w
}

/** 把一段文本拆成不可分割的片段：CJK 单字、拉丁词、空格。 */
function tokenize(text: string): string[] {
  const tokens: string[] = []
  let buf = ''
  for (const ch of text) {
    if (CJK_RE.test(ch)) {
      if (buf) {
        tokens.push(buf)
        buf = ''
      }
      tokens.push(ch)
    } else if (ch === ' ') {
      if (buf) {
        tokens.push(buf)
        buf = ''
      }
      tokens.push(' ')
    } else {
      buf += ch
    }
  }
  if (buf) tokens.push(buf)
  return tokens
}

/** 按最大宽度换行，返回每一行的文本。 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  f: FontSpec,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  ctx.save()
  setFont(ctx, f)

  for (const paragraph of text.split('\n')) {
    if (paragraph === '') {
      lines.push('')
      continue
    }
    let line = ''
    for (const token of tokenize(paragraph)) {
      if (token === ' ') {
        if (line === '') continue
        line += ' '
        continue
      }
      if (line !== '' && ctx.measureText(line + token).width > maxWidth) {
        lines.push(line.replace(/\s+$/, ''))
        line = token
      } else {
        line += token
      }
    }
    if (line !== '') lines.push(line.replace(/\s+$/, ''))
  }

  ctx.restore()
  return lines.length > 0 ? lines : ['']
}

/** 超出宽度时截断并加省略号。 */
export function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  f: FontSpec,
  maxWidth: number,
): string {
  ctx.save()
  setFont(ctx, f)
  let result = text
  if (ctx.measureText(text).width > maxWidth) {
    let lo = 0
    let hi = text.length
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2)
      if (ctx.measureText(text.slice(0, mid) + '…').width <= maxWidth) lo = mid
      else hi = mid - 1
    }
    result = text.slice(0, lo) + '…'
  }
  ctx.restore()
  return result
}

export type TextAlign = 'left' | 'center' | 'right'

/**
 * 按行绘制文本，以「文本框顶部」为基准（textBaseline = top），
 * 这样所有布局计算都可以用 top + 高度累加的方式推 y，不需要关心基线。
 * 返回占用的总高度。
 */
export function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  top: number,
  f: FontSpec,
  color: string,
  align: TextAlign,
  lineHeight: number,
): number {
  ctx.save()
  setFont(ctx, f)
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'top'
  lines.forEach((line, i) => {
    ctx.fillText(line, x, top + i * lineHeight)
  })
  ctx.restore()
  return lines.length * lineHeight
}

/** 绘制单行文本的便捷写法。 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  top: number,
  f: FontSpec,
  color: string,
  align: TextAlign = 'left',
  lineHeight = f.size * 1.3,
): number {
  return drawLines(ctx, [text], x, top, f, color, align, lineHeight)
}
