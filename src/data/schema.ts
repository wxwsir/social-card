/** 卡片的领域模型：所有可编辑内容的唯一数据源。 */

export type AvatarShape = 'circle' | 'rounded' | 'squircle'

export type SocialPlatform =
  | 'github'
  | 'twitter'
  | 'wechat'
  | 'qq'
  | 'email'
  | 'website'
  | 'custom'

export type BlockId = 'header' | 'identity' | 'socials' | 'achievements' | 'footer'

export type PatternKind = 'none' | 'grid' | 'stripes' | 'dots' | 'noise'

/** 字体档位：正文黑体 / 等宽体。 */
export type FontChoice = 'sans' | 'mono'

/** GitHub 公开数据的一次快照。 */
export interface GithubStats {
  login: string
  avatarUrl: string
  publicRepos: number
  followers: number
  totalStars: number
  topLanguage: string | null
  accountAgeYears: number
}

/** 手动填写的荣誉条目。 */
export interface CustomAchievement {
  title: string
  year?: string
  note?: string
}

export interface Social {
  platform: SocialPlatform
  /** 覆盖默认显示名，例如把 github 显示成「我的代码仓库」。 */
  label?: string
  /** 用户名 / 链接 / 邮箱。微信与 QQ 这里放说明文字。 */
  value: string
  /** 上传的二维码图片 id（微信 / QQ 专用，无法程序生成）。 */
  qrImageId?: string
}

export interface BlockConfig {
  id: BlockId
  enabled: boolean
}

export interface ThemeSelection {
  presetId: string
  overrides: {
    primary?: string
    bg?: string
    text?: string
    font?: FontChoice
    /** 间距倍率，默认 1。 */
    spacing?: number
  }
}

export interface CardData {
  version: number
  /** 逻辑画布尺寸，导出时整体乘以倍率。 */
  canvas: { width: number; height: number }
  profile: {
    avatarId?: string
    avatarShape: AvatarShape
    name: string
    handle?: string
    bio?: string
  }
  identity: {
    title?: string
    tags: string[]
    location?: string
    org?: string
  }
  socials: Social[]
  achievements: {
    github?: { username: string; fetchedAt: string; stats: GithubStats }
    custom: CustomAchievement[]
  }
  footer: {
    website?: string
    vcardQr?: { enabled: boolean; value?: string }
  }
  theme: ThemeSelection
  /** 数组顺序 = 卡片上的上下顺序。 */
  blocks: BlockConfig[]
}

export const DEFAULT_BLOCKS: BlockConfig[] = [
  { id: 'header', enabled: true },
  { id: 'identity', enabled: true },
  { id: 'socials', enabled: true },
  { id: 'achievements', enabled: true },
  { id: 'footer', enabled: true },
]
