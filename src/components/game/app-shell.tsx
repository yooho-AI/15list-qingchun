/**
 * [INPUT]: 依赖 store.ts 状态(含抽屉/记录)，bgm.ts 音频，data.ts 常量，dashboard-drawer.tsx
 * [OUTPUT]: 对外提供 AppShell 组件
 * [POS]: 游戏主框架：Header(📓+时间+属性+🎵+☰+📜) + 三向手势Tab内容区 + TabBar + DashboardDrawer + RecordSheet + Toast
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore, PERIODS, GLOBAL_STAT_METAS } from '@/lib/store'
import type { GlobalResources } from '@/lib/store'
import { useBgm } from '@/lib/bgm'
import TabDialogue from './tab-dialogue'
import TabScene from './tab-scene'
import TabCharacter from './tab-character'
import DashboardDrawer from './dashboard-drawer'

const P = 'qc'

const TAB_CONFIG = [
  { key: 'scene', icon: '🗺️', label: '场景' },
  { key: 'dialogue', icon: '💬', label: '对话' },
  { key: 'character', icon: '👤', label: '人物' },
] as const

// ── 荧光棒音乐播放器 ────────────────────────────────

function MusicPlayer() {
  const { isPlaying, toggle } = useBgm()
  const [showPanel, setShowPanel] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={`${P}-music-btn`}
        onClick={() => setShowPanel(!showPanel)}
      >
        <div className={`${P}-glowstick ${isPlaying ? `${P}-glowstick-playing` : ''}`} />
      </button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            className={`${P}-music-panel`}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className={`${P}-music-title`}>
              {isPlaying ? '♫ 正在播放' : '♫ 已暂停'}
            </div>
            <div className={`${P}-wave-container`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`${P}-wave-bar ${P}-wave-bar-${i} ${!isPlaying ? `${P}-wave-bar-paused` : ''}`}
                />
              ))}
            </div>
            <button className={`${P}-music-toggle`} onClick={toggle}>
              {isPlaying ? '暂停' : '播放'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── RecordSheet（右侧事件记录抽屉） ──────────────────

function RecordSheet({ onClose }: { onClose: () => void }) {
  const storyRecords = useGameStore((s) => s.storyRecords)

  return (
    <motion.div
      className={`${P}-record-overlay`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`${P}-record-sheet`}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${P}-record-header`}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>📜 事件记录</span>
          <button className={`${P}-dash-close`} onClick={onClose}>✕</button>
        </div>

        <div className={`${P}-record-timeline ${P}-scrollbar`}>
          {storyRecords.length === 0 ? (
            <div className={`${P}-placeholder`} style={{ padding: '40px 20px' }}>
              <span className={`${P}-placeholder-icon`}>📜</span>
              <span style={{ fontSize: 14 }}>暂无记录</span>
            </div>
          ) : (
            storyRecords.slice().reverse().map((rec) => (
              <div key={rec.id} className={`${P}-record-item`}>
                <div className={`${P}-record-dot`} />
                <div>
                  <div className={`${P}-record-meta`}>第{rec.day}期 · {rec.period}</div>
                  <div className={`${P}-record-title`}>{rec.title}</div>
                  <div className={`${P}-record-content`}>{rec.content}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── AppShell ─────────────────────────────────────────

interface AppShellProps {
  onMenuOpen: () => void
}

export default function AppShell({ onMenuOpen }: AppShellProps) {
  const currentDay = useGameStore((s) => s.currentDay)
  const currentPeriodIndex = useGameStore((s) => s.currentPeriodIndex)
  const globalResources = useGameStore((s) => s.globalResources)
  const activeTab = useGameStore((s) => s.activeTab)
  const setActiveTab = useGameStore((s) => s.setActiveTab)
  const showDashboard = useGameStore((s) => s.showDashboard)
  const showRecords = useGameStore((s) => s.showRecords)
  const toggleDashboard = useGameStore((s) => s.toggleDashboard)
  const toggleRecords = useGameStore((s) => s.toggleRecords)

  const period = PERIODS[currentPeriodIndex]
  const mentalWarning = globalResources.mental <= 40

  // ── Toast 通知 ──
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const unsub = useGameStore.subscribe(
      (state, prev) => {
        // 检测 saveGame 被调用（消息数变化 + 非typing = 刚保存）
        if (state.messages.length > prev.messages.length && !state.isTyping && prev.isTyping) {
          setToast('✅ 已保存')
          if (toastTimer.current) clearTimeout(toastTimer.current)
          toastTimer.current = setTimeout(() => setToast(null), 2000)
        }
      }
    )
    return () => { unsub(); if (toastTimer.current) clearTimeout(toastTimer.current) }
  }, [])

  // ── 三向手势导航 ──
  const touchRef = useRef({ x: 0, y: 0 })

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    const dy = e.changedTouches[0].clientY - touchRef.current.y
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 60) {
      if (dx > 0) toggleDashboard()
      else toggleRecords()
    }
  }, [toggleDashboard, toggleRecords])

  return (
    <div className={`${P}-shell`}>
      {/* ── Header ── */}
      <header className={`${P}-header`}>
        <div className={`${P}-header-left`}>
          <button className={`${P}-header-btn`} onClick={toggleDashboard}>📓</button>
          <span>第{currentDay}期</span>
          <span>{period?.icon} {period?.name}</span>
        </div>

        <div className={`${P}-header-center`}>
          {GLOBAL_STAT_METAS.slice(0, 3).map((meta) => (
            <div
              key={meta.key}
              className={`${P}-header-stat ${meta.key === 'mental' && mentalWarning ? `${P}-mental-warning` : ''}`}
            >
              <span>{meta.icon}</span>
              <span style={{ color: meta.color, fontWeight: 600 }}>
                {globalResources[meta.key as keyof GlobalResources]}
              </span>
            </div>
          ))}
        </div>

        <div className={`${P}-header-right`}>
          {GLOBAL_STAT_METAS.slice(3).map((meta) => (
            <div
              key={meta.key}
              className={`${P}-header-stat ${meta.key === 'mental' && mentalWarning ? `${P}-mental-warning` : ''}`}
            >
              <span>{meta.icon}</span>
              <span style={{ color: meta.color, fontWeight: 600 }}>
                {globalResources[meta.key as keyof GlobalResources]}
              </span>
            </div>
          ))}
          <MusicPlayer />
          <button className={`${P}-header-btn`} onClick={onMenuOpen}>☰</button>
          <button className={`${P}-header-btn`} onClick={toggleRecords}>📜</button>
        </div>
      </header>

      {/* ── Tab 内容区（三向手势绑定） ── */}
      <div
        style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            style={{ height: '100%' }}
          >
            {activeTab === 'dialogue' && <TabDialogue />}
            {activeTab === 'scene' && <TabScene />}
            {activeTab === 'character' && <TabCharacter />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${P}-toast`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TabBar ── */}
      <nav className={`${P}-tab-bar`}>
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            className={`${P}-tab-item ${activeTab === tab.key ? `${P}-tab-active` : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ── DashboardDrawer（左抽屉） ── */}
      <AnimatePresence>
        {showDashboard && <DashboardDrawer onClose={toggleDashboard} />}
      </AnimatePresence>

      {/* ── RecordSheet（右抽屉） ── */}
      <AnimatePresence>
        {showRecords && <RecordSheet onClose={toggleRecords} />}
      </AnimatePresence>
    </div>
  )
}
