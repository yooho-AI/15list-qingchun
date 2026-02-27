/**
 * [INPUT]: 依赖 store.ts 状态，bgm.ts 音频，data.ts 常量
 * [OUTPUT]: 对外提供 AppShell 组件
 * [POS]: 游戏主框架：Header(时间+属性+荧光棒音乐+菜单) + Tab 内容区 + TabBar。桌面 430px 居中壳。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore, PERIODS, GLOBAL_STAT_METAS } from '@/lib/store'
import type { GlobalResources } from '@/lib/store'
import { useBgm } from '@/lib/bgm'
import TabDialogue from './tab-dialogue'
import TabScene from './tab-scene'
import TabCharacter from './tab-character'

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

  const period = PERIODS[currentPeriodIndex]

  // 心理低于40时警告
  const mentalWarning = globalResources.mental <= 40

  return (
    <div className={`${P}-shell`}>
      {/* ── Header ── */}
      <header className={`${P}-header`}>
        <div className={`${P}-header-left`}>
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
          <button className={`${P}-header-btn`} onClick={onMenuOpen}>
            ☰
          </button>
        </div>
      </header>

      {/* ── Tab 内容区 ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
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
    </div>
  )
}
