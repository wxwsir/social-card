import { useEffect, useMemo, useRef, useState } from 'react'
import { assets as assetResolver, clearImageCache, ensureAssets, imageIdsOf } from '../assets/cache'
import { exportProject, importProject } from '../data/project'
import { sampleCard } from '../data/sample'
import { clearAssets, clearCard, loadCard, saveCard } from '../data/store'
import { downloadBlob, formatSize } from '../export/download'
import { exportCardPNG } from '../export/png'
import { collectText, loadFonts } from '../fonts/load'
import { renderCard } from '../render/engine'
import type { RenderReport } from '../render/engine'
import type { RenderInput } from '../render/types'
import { presetDecor, PRESETS, resolveTheme } from '../themes'
import {
  SectionAchievements,
  SectionBlocks,
  SectionFooter,
  SectionIdentity,
  SectionProfile,
  SectionSocials,
  SectionTheme,
} from './sections'

const AUTOSAVE_DELAY = 500

/**
 * 把版面报告翻译成给用户看的一句话；版面正常时返回 null。
 *
 * 报的是「用户设定值 → 实际使用值」，而不是百分比：告警的用处是让用户知道
 * 自己调的间距没被真正用上，给出两个具体数字比给一个百分比清楚得多。
 */
function layoutWarning(report: RenderReport, requestedSpacing: number): string | null {
  if (report.overflow) {
    return '内容仍超出画布，底部会被裁掉。请删减条目或调小间距。'
  }
  if (!report.compressed) return null

  const from = requestedSpacing.toFixed(2)
  const to = report.spacing.toFixed(2)
  const shrink =
    report.contentScale < 0.999 ? `，并整体缩小至 ${Math.round(report.contentScale * 100)}%` : ''
  return `内容偏多，已自动收紧间距 ${from} → ${to}${shrink}。`
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const SAVE_TEXT: Record<SaveState, string> = {
  idle: '',
  saving: '保存中…',
  saved: '已保存到本机',
  error: '保存失败，改动可能丢失',
}

export default function App() {
  const [data, setData] = useState(sampleCard)
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [exportScale, setExportScale] = useState(2)
  const [transparent, setTransparent] = useState(false)
  const [fontsReady, setFontsReady] = useState(false)
  const [report, setReport] = useState<RenderReport | null>(null)
  const [assetVersion, setAssetVersion] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const params = useMemo(() => resolveTheme(data.theme), [data.theme])
  const input = useMemo<RenderInput>(
    () => ({ data, params, assets: assetResolver, decor: presetDecor(data.theme.presetId) }),
    [data, params],
  )

  // 首次进入：读本机存档；读不到（首次访问或隐私模式）就用示例卡片。
  useEffect(() => {
    let cancelled = false
    loadCard()
      .then((stored) => {
        if (cancelled) return
        if (stored) setData(stored)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadFonts(collectText(data)).then(() => {
      if (!cancelled) setFontsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [data])

  // 图片是从库里异步读出来的，解码完成后要让预览重绘一次。
  useEffect(() => {
    let cancelled = false
    ensureAssets(imageIdsOf(data)).then((loadedNew) => {
      if (!cancelled && loadedNew) setAssetVersion((v) => v + 1)
    })
    return () => {
      cancelled = true
    }
  }, [data])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !fontsReady || !loaded) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    setReport(renderCard(canvas, input, dpr))
  }, [input, fontsReady, loaded, assetVersion])

  // 自动保存：停止输入 500ms 后落盘，避免每敲一个字就写一次 IndexedDB。
  useEffect(() => {
    if (!loaded) return
    setSaveState('saving')
    const timer = setTimeout(() => {
      saveCard(data)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'))
    }, AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
  }, [data, loaded])

  const warning = report ? layoutWarning(report, params.spacing) : null

  const safeName = (name: string): string =>
    name.replace(/[/\\:*?"<>|]/g, '_').trim() || 'untitled'

  const handleExportPNG = async () => {
    setMessage('导出中…')
    try {
      const { blob, report: exported } = await exportCardPNG(
        { ...input, transparent },
        exportScale,
        `card-${safeName(data.profile.name)}@${exportScale}x.png`,
      )
      const w = data.canvas.width * exportScale
      const h = data.canvas.height * exportScale
      const notice = layoutWarning(exported, params.spacing)
      setMessage(`已导出 ${w}×${h} · ${formatSize(blob.size)}${notice ? ` · ${notice}` : ''}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导出失败')
    }
  }

  const handleExportProject = async () => {
    try {
      const blob = await exportProject(data)
      downloadBlob(blob, `social-card-${new Date().toISOString().slice(0, 10)}.json`)
      setMessage(`已导出项目备份 · ${formatSize(blob.size)}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导出备份失败')
    }
  }

  const handleImportProject = async (file: File) => {
    try {
      const card = await importProject(file)
      clearImageCache()
      setData(card)
      await ensureAssets(imageIdsOf(card))
      setAssetVersion((v) => v + 1)
      setMessage('已导入项目备份')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入失败')
    }
  }

  const handleReset = async () => {
    if (!window.confirm('重置会清空当前编辑的内容和上传的图片，确定吗？')) return
    await clearCard()
    await clearAssets()
    clearImageCache()
    setData(sampleCard)
    setAssetVersion((v) => v + 1)
    setMessage('已重置为初始卡片')
  }

  return (
    <div className="app">
      <aside className="panel">
        <header className="panel-head">
          <h1>社交名片</h1>
          <span className={`save-state ${saveState}`}>{SAVE_TEXT[saveState]}</span>
        </header>

        <SectionProfile data={data} setData={setData} />
        <SectionIdentity data={data} setData={setData} />
        <SectionSocials data={data} setData={setData} />
        <SectionAchievements data={data} setData={setData} />
        <SectionFooter data={data} setData={setData} />
        <SectionTheme
          data={data}
          setData={setData}
          presets={PRESETS.map((preset) => ({ id: preset.id, name: preset.name }))}
          resolved={params}
        />
        <SectionBlocks data={data} setData={setData} />

        <section>
          <h2>导出</h2>
          <label className="field">
            <span className="field-label">倍率</span>
            <select value={exportScale} onChange={(e) => setExportScale(Number(e.target.value))}>
              <option value={1}>1x · 540×960</option>
              <option value={2}>2x · 1080×1920</option>
              <option value={3}>3x · 1620×2880</option>
            </select>
          </label>
          <label className="field checkbox">
            <input
              type="checkbox"
              checked={transparent}
              onChange={(e) => setTransparent(e.target.checked)}
            />
            <span>透明背景</span>
          </label>
          <button type="button" onClick={handleExportPNG} disabled={!fontsReady || !loaded}>
            {fontsReady && loaded ? '导出 PNG' : '准备中…'}
          </button>
          <button type="button" className="ghost" onClick={handleExportProject}>
            导出项目备份（含图片）
          </button>
          <button type="button" className="ghost" onClick={() => importRef.current?.click()}>
            导入项目备份
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void handleImportProject(file)
            }}
          />
          <button type="button" className="danger" onClick={handleReset}>
            重置为初始卡片
          </button>
          {message && <p className="info">{message}</p>}
        </section>
      </aside>

      <main className="stage">
        <canvas ref={canvasRef} className="preview" />
        {warning && (
          <div className={`notice ${report?.overflow ? 'alert' : 'warn'}`}>{warning}</div>
        )}
        <p className="narrow-hint">窄屏只能预览，请在桌面浏览器上编辑。</p>
      </main>
    </div>
  )
}
