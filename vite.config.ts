import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * base 决定了构建产物里的资源引用路径。
 *
 * 本地 dev：'./'（相对路径，怎么跑都能找到）。
 * GitHub Pages 项目页：需要 '/仓库名/' 绝对路径，否则资源会从根路径找，404。
 *
 * 部署时设置环境变量 VITE_BASE=/social-card/ 再 npm run build 即可；
 * 仓库名换成你自己的。也可以在 GitHub Actions 里从 GITHUB_REPOSITORY 自动解析
 * （.github/workflows/deploy.yml 已这样做）。
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const base = env.VITE_BASE || './'
  return {
    base,
    plugins: [react()],
  }
})
