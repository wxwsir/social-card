/**
 * 阶段 1 用的硬编码示例数据。
 *
 * 此时还没有编辑 UI，卡片数据直接写在代码里——这是刻意的：
 * 先把渲染层调好看，UI 只是给它套壳。
 */

import { DEFAULT_BLOCKS, type CardData } from './schema'

export const sampleCard: CardData = {
  version: 1,
  canvas: { width: 540, height: 960 },
  profile: {
    avatarShape: 'squircle',
    name: '陈墨',
    handle: '@chenmo_dev',
    bio: '写代码、写文档，也写点没什么用的工具。相信好的工具应该让人少想一点。',
  },
  identity: {
    title: '全栈工程师 / 开源维护者',
    tags: ['TypeScript', 'Rust', '开源', '独立开发'],
    location: '杭州',
    org: '某科技有限公司',
  },
  socials: [
    { platform: 'github', value: 'chenmo-dev' },
    { platform: 'twitter', value: '@chenmo_dev' },
    { platform: 'wechat', value: 'chenmo_dev', label: '微信' },
    { platform: 'qq', value: '1024 7788', label: 'QQ' },
    { platform: 'email', value: 'hi@chenmo.dev' },
    { platform: 'website', value: 'chenmo.dev' },
  ],
  achievements: {
    github: {
      username: 'chenmo-dev',
      fetchedAt: '2026-10-12',
      stats: {
        login: 'chenmo-dev',
        avatarUrl: '',
        publicRepos: 47,
        followers: 1286,
        totalStars: 3412,
        topLanguage: 'TypeScript',
        accountAgeYears: 8,
      },
    },
    custom: [
      { title: '开源之夏 优秀学生', year: '2024' },
      { title: '《深入理解构建系统》作者', year: '2025' },
    ],
  },
  footer: {
    website: 'chenmo.dev',
    vcardQr: { enabled: false },
  },
  theme: {
    presetId: 'terminal',
    overrides: {
      primary: '#3fb950',
      bg: '#0b0f14',
    },
  },
  blocks: DEFAULT_BLOCKS,
}
