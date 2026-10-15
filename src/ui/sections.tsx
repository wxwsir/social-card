/** 左侧编辑面板的各个区块。每个区块只负责改自己那一部分数据。 */

import { useState, type Dispatch, type SetStateAction } from 'react'
import { newAssetId } from '../data/store'
import { describeFetchedAt } from '../data/time'
import type {
  AvatarShape,
  BlockConfig,
  BlockId,
  CardData,
  CustomAchievement,
  Social,
  SocialPlatform,
  ThemeSelection,
} from '../data/schema'
import type { ThemeParams } from '../render/types'
import { GithubFetchError, fetchGithubStats } from '../data/github'
import { putImage, removeImage } from '../assets/cache'
import { CheckboxField, Field, SelectField, TagField, TextAreaField, TextField } from './fields'

export interface SectionProps {
  data: CardData
  setData: Dispatch<SetStateAction<CardData>>
}

const AVATAR_SHAPES: { value: AvatarShape; label: string }[] = [
  { value: 'squircle', label: '超椭圆' },
  { value: 'rounded', label: '圆角方' },
  { value: 'circle', label: '圆形' },
]

const PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: 'github', label: 'GitHub' },
  { value: 'twitter', label: '推特 X' },
  { value: 'wechat', label: '微信' },
  { value: 'qq', label: 'QQ' },
  { value: 'email', label: '邮箱' },
  { value: 'website', label: '网站' },
  { value: 'custom', label: '自定义' },
]

const BLOCK_NAMES: Record<BlockId, string> = {
  header: '头像 / 姓名',
  identity: '身份标签',
  socials: '社交账号',
  achievements: '成就',
  footer: '页脚',
}

/** 上传一张图到本地库，返回它的 id。 */
async function uploadImage(prefix: string, file: File): Promise<string> {
  const id = newAssetId(prefix)
  await putImage(id, file)
  return id
}

export function SectionProfile({ data, setData }: SectionProps) {
  const { profile } = data

  const patch = (next: Partial<CardData['profile']>) =>
    setData((prev) => ({ ...prev, profile: { ...prev.profile, ...next } }))

  return (
    <section>
      <h2>个人信息</h2>
      <Field label="头像">
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            const old = data.profile.avatarId
            const id = await uploadImage('avatar', file)
            patch({ avatarId: id })
            if (old) await removeImage(old)
          }}
        />
      </Field>
      {profile.avatarId && (
        <button
          type="button"
          className="ghost"
          onClick={() => {
            const id = profile.avatarId
            patch({ avatarId: undefined })
            if (id) void removeImage(id)
          }}
        >
          移除头像
        </button>
      )}
      <SelectField
        label="头像形状"
        value={profile.avatarShape}
        options={AVATAR_SHAPES}
        onChange={(avatarShape) => patch({ avatarShape })}
      />
      <TextField label="姓名" value={profile.name} onChange={(name) => patch({ name })} />
      <TextField
        label="用户名 / ID"
        value={profile.handle ?? ''}
        placeholder="@your_handle"
        onChange={(handle) => patch({ handle })}
      />
      <TextAreaField
        label="一句话简介"
        value={profile.bio ?? ''}
        placeholder="写点别人一眼能记住的东西"
        onChange={(bio) => patch({ bio })}
      />
    </section>
  )
}

export function SectionIdentity({ data, setData }: SectionProps) {
  const { identity } = data

  const patch = (next: Partial<CardData['identity']>) =>
    setData((prev) => ({ ...prev, identity: { ...prev.identity, ...next } }))

  return (
    <section>
      <h2>身份标签</h2>
      <TextField
        label="头衔"
        value={identity.title ?? ''}
        placeholder="全栈工程师 / 开源维护者"
        onChange={(title) => patch({ title })}
      />
      <TagField
        label="标签（用逗号分隔）"
        value={identity.tags}
        placeholder="TypeScript，Rust，开源"
        onChange={(tags) => patch({ tags })}
      />
      <TextField
        label="所在地"
        value={identity.location ?? ''}
        onChange={(location) => patch({ location })}
      />
      <TextField label="公司 / 组织" value={identity.org ?? ''} onChange={(org) => patch({ org })} />
    </section>
  )
}

export function SectionSocials({ data, setData }: SectionProps) {
  const patchAt = (index: number, next: Partial<Social>) =>
    setData((prev) => ({
      ...prev,
      socials: prev.socials.map((item, i) => (i === index ? { ...item, ...next } : item)),
    }))

  const move = (index: number, delta: number) =>
    setData((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.socials.length) return prev
      const socials = [...prev.socials]
      const [item] = socials.splice(index, 1)
      socials.splice(target, 0, item)
      return { ...prev, socials }
    })

  const remove = (index: number) =>
    setData((prev) => {
      const item = prev.socials[index]
      if (item?.qrImageId) void removeImage(item.qrImageId)
      return { ...prev, socials: prev.socials.filter((_, i) => i !== index) }
    })

  return (
    <section>
      <h2>社交账号</h2>
      {data.socials.length === 0 && <p className="hint">还没有条目。点下面的按钮加一条。</p>}
      {data.socials.map((social, index) => (
        <div className="entry" key={`${social.platform}-${index}`}>
          <div className="entry-head">
            <span className="entry-title">第 {index + 1} 条</span>
            <div className="entry-tools">
              <button type="button" className="icon" onClick={() => move(index, -1)}>
                ↑
              </button>
              <button type="button" className="icon" onClick={() => move(index, 1)}>
                ↓
              </button>
              <button type="button" className="icon" onClick={() => remove(index)}>
                ✕
              </button>
            </div>
          </div>
          <SelectField
            label="平台"
            value={social.platform}
            options={PLATFORMS}
            onChange={(platform) => patchAt(index, { platform })}
          />
          <TextField
            label="显示名（留空用平台名）"
            value={social.label ?? ''}
            onChange={(label) => patchAt(index, { label })}
          />
          <TextField
            label="账号 / 内容"
            value={social.value}
            placeholder="chenmo-dev"
            onChange={(value) => patchAt(index, { value })}
          />
          {(social.platform === 'wechat' || social.platform === 'qq') && (
            <>
              <Field label="二维码图片（微信 / QQ 无法程序生成，需自己上传）">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    const old = social.qrImageId
                    const id = await uploadImage('qr', file)
                    patchAt(index, { qrImageId: id })
                    if (old) await removeImage(old)
                  }}
                />
              </Field>
              {social.qrImageId && (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    patchAt(index, { qrImageId: undefined })
                    void removeImage(social.qrImageId!)
                  }}
                >
                  移除二维码
                </button>
              )}
            </>
          )}
        </div>
      ))}
      <button
        type="button"
        className="ghost"
        onClick={() =>
          setData((prev) => ({
            ...prev,
            socials: [...prev.socials, { platform: 'github', value: '' }],
          }))
        }
      >
        + 添加一条
      </button>
    </section>
  )
}

export function SectionAchievements({ data, setData }: SectionProps) {
  const gh = data.achievements.github

  const patchCustom = (index: number, next: Partial<CustomAchievement>) =>
    setData((prev) => ({
      ...prev,
      achievements: {
        ...prev.achievements,
        custom: prev.achievements.custom.map((item, i) =>
          i === index ? { ...item, ...next } : item,
        ),
      },
    }))

  const moveCustom = (index: number, delta: number) =>
    setData((prev) => {
      const custom = prev.achievements.custom
      const target = index + delta
      if (target < 0 || target >= custom.length) return prev
      const next = [...custom]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return { ...prev, achievements: { ...prev.achievements, custom: next } }
    })

  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)

  const patchGithubUsername = (username: string) =>
    setData((prev) => {
      // 清空用户名意味着不再展示 GitHub 统计——删掉整个 github 块。
      if (!username.trim()) {
        return {
          ...prev,
          achievements: { ...prev.achievements, github: undefined },
        }
      }
      const current = prev.achievements.github
      if (!current) {
        return {
          ...prev,
          achievements: {
            ...prev.achievements,
            github: {
              username,
              fetchedAt: '',
              stats: {
                login: username,
                avatarUrl: '',
                publicRepos: 0,
                followers: 0,
                totalStars: 0,
                topLanguage: null,
                accountAgeYears: 0,
              },
            },
          },
        }
      }
      return {
        ...prev,
        achievements: { ...prev.achievements, github: { ...current, username } },
      }
    })

  const refreshGithub = async () => {
    if (!gh?.username.trim()) return
    setFetching(true)
    setFetchError(null)
    setTruncated(false)
    try {
      const { stats, truncated: isTruncated, fetchedAt } = await fetchGithubStats(gh.username)
      setTruncated(isTruncated)
      setData((prev) => ({
        ...prev,
        achievements: {
          ...prev.achievements,
          github: { username: gh.username, fetchedAt, stats },
        },
      }))
    } catch (error) {
      // 失败不清空已有的数据——用户刷新时看到的是旧快照 + 一条错误提示，
      // 这比「点了刷新结果卡片上 GitHub 数字全没了」靠谱得多。
      const message =
        error instanceof GithubFetchError
          ? error.message
          : error instanceof Error
            ? `网络错误：${error.message}`
            : '未知错误'
      setFetchError(message)
    } finally {
      setFetching(false)
    }
  }

  return (
    <section>
      <h2>成就 · GitHub</h2>
      <TextField
        label="GitHub 用户名"
        value={gh?.username ?? ''}
        placeholder="chenmo-dev"
        onChange={(username) => patchGithubUsername(username)}
      />

      {gh && gh.fetchedAt && (
        <p className="hint">数据更新于 {describeFetchedAt(gh.fetchedAt)}</p>
      )}
      {truncated && (
        <p className="hint">
          * 用户仓库超过 200 个，stars 与主语言为近似值。
        </p>
      )}

      <button
        type="button"
        className="ghost"
        onClick={refreshGithub}
        disabled={fetching || !gh?.username.trim()}
      >
        {fetching ? '拉取中…' : gh?.fetchedAt ? '重新拉取' : '拉取 GitHub 数据'}
      </button>
      {fetchError && <p className="hint" style={{ color: '#f09393' }}>{fetchError}</p>}

      <h2 style={{ marginTop: 18 }}>个人荣誉</h2>

      {data.achievements.custom.length === 0 && (
        <p className="hint">还没有荣誉条目，点下面的按钮加一条。</p>
      )}

      {data.achievements.custom.map((item, index) => (
        <div className="entry" key={index}>
          <div className="entry-head">
            <span className="entry-title">荣誉 {index + 1}</span>
            <div className="entry-tools">
              <button type="button" className="icon" onClick={() => moveCustom(index, -1)}>
                ↑
              </button>
              <button type="button" className="icon" onClick={() => moveCustom(index, 1)}>
                ↓
              </button>
              <button
                type="button"
                className="icon"
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    achievements: {
                      ...prev.achievements,
                      custom: prev.achievements.custom.filter((_, i) => i !== index),
                    },
                  }))
                }
              >
                ✕
              </button>
            </div>
          </div>
          <TextField
            label="标题"
            value={item.title}
            onChange={(title) => patchCustom(index, { title })}
          />
          <TextField label="年份" value={item.year ?? ''} onChange={(year) => patchCustom(index, { year })} />
        </div>
      ))}
      <button
        type="button"
        className="ghost"
        onClick={() =>
          setData((prev) => ({
            ...prev,
            achievements: {
              ...prev.achievements,
              custom: [...prev.achievements.custom, { title: '' }],
            },
          }))
        }
      >
        + 添加荣誉
      </button>
    </section>
  )
}

export function SectionFooter({ data, setData }: SectionProps) {
  return (
    <section>
      <h2>页脚</h2>
      <TextField
        label="网址"
        value={data.footer.website ?? ''}
        placeholder="chenmo.dev"
        onChange={(website) => setData((prev) => ({ ...prev, footer: { ...prev.footer, website } }))}
      />
    </section>
  )
}

export function SectionBlocks({ data, setData }: SectionProps) {
  const move = (index: number, delta: number) =>
    setData((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.blocks.length) return prev
      const blocks = [...prev.blocks]
      const [item] = blocks.splice(index, 1)
      blocks.splice(target, 0, item)
      return { ...prev, blocks }
    })

  const toggle = (index: number, enabled: boolean) =>
    setData((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block, i) => (i === index ? { ...block, enabled } : block)),
    }))

  return (
    <section>
      <h2>版块与顺序</h2>
      {data.blocks.map((block: BlockConfig, index) => (
        <div className="row" key={block.id}>
          <CheckboxField
            label={BLOCK_NAMES[block.id]}
            checked={block.enabled}
            onChange={(enabled) => toggle(index, enabled)}
          />
          <div className="entry-tools">
            <button type="button" className="icon" onClick={() => move(index, -1)}>
              ↑
            </button>
            <button type="button" className="icon" onClick={() => move(index, 1)}>
              ↓
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}

export function SectionTheme({
  data,
  setData,
  presets,
  resolved,
}: SectionProps & {
  presets: { id: string; name: string }[]
  /** 预设默认值叠加用户覆盖后的最终参数，控件显示的是「实际生效值」。 */
  resolved: ThemeParams
}) {
  const { theme } = data

  const patch = (next: Partial<ThemeSelection['overrides']>) =>
    setData((prev) => ({
      ...prev,
      theme: { ...prev.theme, overrides: { ...prev.theme.overrides, ...next } },
    }))

  return (
    <section>
      <h2>外观</h2>
      <SelectField
        label="主题"
        value={theme.presetId}
        options={presets.map((preset) => ({ value: preset.id, label: preset.name }))}
        onChange={(presetId) =>
          setData((prev) => ({
            ...prev,
            // 切换预设时清掉 bg/text/primary 这类「跟主题强绑定」的覆盖——
            // 从 Terminal（深）切到 Mono（浅）如果继承了之前的深色背景，
            // 新预设看起来就像坏了。font / spacing 是跨主题通用的，保留。
            theme: {
              presetId,
              overrides: {
                font: prev.theme.overrides.font,
                spacing: prev.theme.overrides.spacing,
              },
            },
          }))
        }
      />
      <Field label="主色">
        <input
          type="color"
          value={resolved.primary}
          onChange={(e) => patch({ primary: e.target.value })}
        />
      </Field>
      <Field label="背景色">
        <input type="color" value={resolved.bgFrom} onChange={(e) => patch({ bg: e.target.value })} />
      </Field>
      <Field label="文字色">
        <input
          type="color"
          value={resolved.text}
          onChange={(e) => patch({ text: e.target.value })}
        />
      </Field>
      <SelectField
        label="字体"
        value={resolved.font}
        options={[
          { value: 'sans', label: '黑体 Noto Sans SC' },
          { value: 'mono', label: '等宽 JetBrains Mono' },
        ]}
        onChange={(font) => patch({ font })}
      />
      <Field label={`间距 ${resolved.spacing.toFixed(2)}`}>
        <input
          type="range"
          min={0.8}
          max={1.4}
          step={0.05}
          value={resolved.spacing}
          onChange={(e) => patch({ spacing: Number(e.target.value) })}
        />
      </Field>
      <button
        type="button"
        className="ghost"
        onClick={() =>
          patch({
            primary: undefined,
            bg: undefined,
            text: undefined,
            font: undefined,
            spacing: undefined,
          })
        }
      >
        恢复主题默认
      </button>
    </section>
  )
}
