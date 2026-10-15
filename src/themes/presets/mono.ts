import type { ThemePreset } from '../../render/types'

/**
 * Mono 极简风：冷灰 + 黑体 + 无装饰。
 *
 * 这套最接近"文档 / 简历"观感——没有霓虹、没有纹理，
 * 只靠排版节奏和字体本身撑住画面，适合想让内容安静地被读到的用户。
 *
 * 特意把 defaults.text 设成深色（#1a1a2e）而不是留空，
 * 让切换到 Mono 时正文色就已经正确，不依赖 resolveTheme 的 isLight 自动派生。
 */
export const monoPreset: ThemePreset = {
  id: 'mono',
  name: 'Mono 极简',
  defaults: {
    primary: '#2563eb',
    bgFrom: '#f5f5f7',
    bgTo: '#f5f5f7',
    bgKind: 'solid',
    bgAngle: 180,
    pattern: 'noise',
    text: '#1a1a2e',
    font: 'sans',
    spacing: 1,
    radius: 16,
    padding: 46,
  },
}
