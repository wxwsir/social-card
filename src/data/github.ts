/**
 * GitHub 公开 API 拉取。
 *
 * 浏览器端直接调用，不经过任何后端代理——所以没有鉴权，60 次/小时/IP 的未登录配额。
 * 调用方要准备好处理 403 限速（带 X-RateLimit-Reset 时间戳）和 404 用户不存在。
 *
 * 需要两个请求：
 *   GET /users/{username}              — login / avatar_url / public_repos / followers / created_at
 *   GET /users/{username}/repos?per_page=100  — 累加 stargazers_count 得 totalStars，
 *                                                按出现频次选 topLanguage
 *
 * repos 超过 100 个就翻两页，再就停——大部分 v1 用户都到不了 200，
 * 为少数几百 repo 的人烧 6 次配额不值得。
 */

import type { GithubStats } from './schema'

const API = 'https://api.github.com'
const PAGE_SIZE = 100
const MAX_PAGES = 2

export interface GithubFetchResult {
  stats: GithubStats
  /** repos 超过 MAX_PAGES × PAGE_SIZE 时，totalStars / topLanguage 是近似值。 */
  truncated: boolean
  fetchedAt: string
}

export class GithubFetchError extends Error {
  readonly status: number
  /** 速率限制被触发时，浏览器可重试的时间戳（毫秒）；其他错误为 undefined。 */
  readonly retryAfterMs?: number

  constructor(status: number, message: string, retryAfterMs?: number) {
    super(message)
    this.status = status
    this.retryAfterMs = retryAfterMs
  }
}

/** GET 一个 GitHub API endpoint。 */
async function githubGet(path: string): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (res.status === 200) return res

  let detail = ''
  try {
    detail = (await res.json())?.message ?? ''
  } catch {
    // 有些错误不是 JSON
  }

  if (res.status === 403) {
    const resetHeader = res.headers.get('X-RateLimit-Reset')
    const retryAfterMs = resetHeader ? Number(resetHeader) * 1000 : undefined
    const human = retryAfterMs
      ? `速率限制，大约 ${new Date(retryAfterMs).toLocaleTimeString('zh-CN')} 后可重试`
      : '速率限制，请稍后再试'
    throw new GithubFetchError(403, human, retryAfterMs)
  }
  if (res.status === 404) {
    throw new GithubFetchError(404, `GitHub 上找不到这个用户：${path.match(/\/users\/([^/?]+)/)?.[1] ?? path}`)
  }
  if (res.status === 422) {
    throw new GithubFetchError(422, 'GitHub 不接受这个用户名')
  }
  throw new GithubFetchError(res.status, `GitHub API 返回 ${res.status}${detail ? `：${detail}` : ''}`)
}

function ageYears(createdAt: string): number {
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return 0
  const now = new Date()
  let years = now.getFullYear() - created.getFullYear()
  const hasPassedAnniversary =
    now.getMonth() > created.getMonth() ||
    (now.getMonth() === created.getMonth() && now.getDate() >= created.getDate())
  if (!hasPassedAnniversary) years -= 1
  return Math.max(0, years)
}

export async function fetchGithubStats(username: string): Promise<GithubFetchResult> {
  const trimmed = username.trim()
  if (!trimmed) throw new GithubFetchError(422, 'GitHub 用户名不能为空')
  if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    throw new GithubFetchError(422, 'GitHub 用户名只能包含字母、数字和连字符')
  }

  // 请求 1：用户基本信息
  const userRes = await githubGet(`/users/${encodeURIComponent(trimmed)}`)
  const user = (await userRes.json()) as {
    login: string
    avatar_url: string
    public_repos: number
    followers: number
    created_at: string
  }

  // 请求 2：全部仓库，汇总 stars 与主语言
  let stars = 0
  const langCounts = new Map<string, number>()
  let page = 1
  let truncated = false

  while (page <= MAX_PAGES) {
    const reposRes = await githubGet(
      `/users/${encodeURIComponent(trimmed)}/repos?per_page=${PAGE_SIZE}&page=${page}`,
    )
    const repos = (await reposRes.json()) as Array<{
      stargazers_count: number
      language: string | null
      fork: boolean
    }>
    if (repos.length === 0) break

    for (const repo of repos) {
      stars += repo.stargazers_count
      // fork 的仓库不贡献主语言统计——用户的语言指纹来自自己写的代码。
      if (!repo.fork && repo.language) {
        langCounts.set(repo.language, (langCounts.get(repo.language) ?? 0) + 1)
      }
    }

    if (repos.length < PAGE_SIZE) break
    if (page === MAX_PAGES) {
      truncated = true
      break
    }
    page++
  }

  const topLanguage = [...langCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const stats: GithubStats = {
    login: user.login,
    avatarUrl: user.avatar_url ?? '',
    publicRepos: user.public_repos ?? 0,
    followers: user.followers ?? 0,
    totalStars: stars,
    topLanguage,
    accountAgeYears: ageYears(user.created_at),
  }

  return { stats, truncated, fetchedAt: new Date().toISOString() }
}
