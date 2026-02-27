/**
 * [INPUT]: 依赖 store.ts 全部游戏状态, data.ts 的 SCENES/ITEMS, bgm.ts, framer-motion (Reorder)
 * [OUTPUT]: 对外提供 DashboardDrawer 组件（练习生手帐）
 * [POS]: 左侧滑入抽屉，7组件：扉页/人物轮播/场景网格/训练目标/道具格/排名预览/音乐。拖拽排序。被 app-shell 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import {
  useGameStore, SCENES, ITEMS, GLOBAL_STAT_METAS,
  getCurrentChapter, getAvailableCharacters,
} from '../../lib/store'
import type { GlobalResources } from '../../lib/store'
import { useBgm } from '../../lib/bgm'

const P = 'qc'
const ORDER_KEY = 'qc-dash-order'
const DEFAULT_ORDER = ['characters', 'scenes', 'goals', 'items', 'ranking', 'music']

// ── 扉页 ─────────────────────────────────────────────

function FrontPage() {
  const { currentDay, currentPeriodIndex, actionPoints } = useGameStore()
  const chapter = getCurrentChapter(currentDay)
  const PERIODS = ['早晨', '中午', '晚上']
  const PERIOD_ICONS = ['🌅', '☀️', '🌙']

  return (
    <div className={`${P}-dash-front`}>
      <div className={`${P}-dash-front-episode`}>第{currentDay}期</div>
      <div className={`${P}-dash-front-period`}>
        <span>{PERIOD_ICONS[currentPeriodIndex]}</span>
        <span>{PERIODS[currentPeriodIndex]}</span>
      </div>
      <div className={`${P}-dash-front-chapter`}>
        第{chapter.id}章「{chapter.name}」
      </div>
      <div className={`${P}-dash-front-ap`}>
        <div className={`${P}-dash-front-bars`}>
          {Array.from({ length: 3 }, (_, i) => (
            <span
              key={i}
              className={`${P}-dash-bar ${i < actionPoints ? `${P}-dash-bar-filled` : ''}`}
            />
          ))}
        </div>
        <span className={`${P}-dash-front-ap-text`}>
          行动力 {actionPoints}/3
        </span>
      </div>
    </div>
  )
}

// ── 人物轮播 ─────────────────────────────────────────

const SLIDE_VARIANTS = {
  enter: (d: number) => ({ x: d > 0 ? 260 : -260, opacity: 0, rotate: d > 0 ? 6 : -6 }),
  center: { x: 0, opacity: 1, rotate: 0 },
  exit: (d: number) => ({ x: d < 0 ? 260 : -260, opacity: 0, rotate: d < 0 ? 6 : -6 }),
}

function CharacterGallery({ onClose }: { onClose: () => void }) {
  const {
    characters, characterStats, currentCharacter, currentDay,
    selectCharacter,
  } = useGameStore()

  const available = getAvailableCharacters(currentDay, characters)
  const charEntries = Object.entries(characters)

  const [[idx, direction], setPage] = useState<[number, number]>(() => {
    const i = charEntries.findIndex(([id]) => id === currentCharacter)
    return [i >= 0 ? i : 0, 0]
  })

  const touchX = useRef(0)
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current
    if (dx < -50 && idx < charEntries.length - 1) setPage([idx + 1, 1])
    else if (dx > 50 && idx > 0) setPage([idx - 1, -1])
  }

  const handleClick = (charId: string) => {
    if (charId in available) { selectCharacter(charId); onClose() }
  }

  const [id, char] = charEntries[idx]
  const isAvailable = id in available
  const stats = characterStats[id] ?? {}

  return (
    <div className={`${P}-dash-gallery-wrap`}>
      <div
        className={`${P}-dash-carousel`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence initial={false} mode="wait" custom={direction}>
          <motion.div
            key={idx}
            custom={direction}
            variants={SLIDE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: 'easeInOut' }}
            className={`${P}-dash-photo`}
            onClick={() => handleClick(id)}
            style={{ cursor: isAvailable ? 'pointer' : 'default' }}
          >
            {isAvailable ? (
              <>
                <div className={`${P}-dash-photo-img`}>
                  <img src={char.portrait} alt={char.name} />
                  <div className={`${P}-dash-photo-nameplate`}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{char.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>{char.title}</div>
                  </div>
                </div>
                {char.statMetas.slice(0, 1).map((meta) => {
                  const val = stats[meta.key] ?? 0
                  return (
                    <div key={meta.key} className={`${P}-dash-photo-stat`}>
                      <span>{meta.icon}</span>
                      <div className={`${P}-dash-photo-stat-track`}>
                        <div
                          className={`${P}-dash-photo-stat-fill`}
                          style={{ width: `${val}%`, background: meta.color }}
                        />
                      </div>
                      <span style={{ color: meta.color, fontSize: 12, fontWeight: 600 }}>{val}</span>
                    </div>
                  )
                })}
              </>
            ) : (
              <div className={`${P}-dash-photo-locked`}>
                <span style={{ fontSize: 32, opacity: 0.3 }}>🔒</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>尚未出现</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={`${P}-dash-dots`}>
        {charEntries.map(([cid], i) => (
          <button
            key={cid}
            className={`${P}-dash-dot ${i === idx ? `${P}-dash-dot-active` : ''}`}
            onClick={() => setPage([i, i > idx ? 1 : -1])}
          />
        ))}
      </div>
    </div>
  )
}

// ── 场景网格 (2×2) ───────────────────────────────────

function SceneMap({ onClose }: { onClose: () => void }) {
  const { currentScene, unlockedScenes, selectScene } = useGameStore()
  const sceneEntries = Object.entries(SCENES)

  const handleClick = (sid: string) => {
    if (unlockedScenes.includes(sid) && sid !== currentScene) {
      selectScene(sid); onClose()
    }
  }

  return (
    <div className={`${P}-dash-scene-grid`}>
      {sceneEntries.map(([sid, scene]) => {
        const isCurrent = sid === currentScene
        const isLocked = !unlockedScenes.includes(sid)
        return (
          <button
            key={sid}
            className={[
              `${P}-dash-scene-cell`,
              isCurrent && `${P}-dash-scene-cur`,
              isLocked && `${P}-dash-scene-lock`,
            ].filter(Boolean).join(' ')}
            onClick={() => handleClick(sid)}
            disabled={isLocked}
          >
            <span style={{ fontSize: 20 }}>{isLocked ? '🔒' : scene.icon}</span>
            <span style={{ fontSize: 12 }}>{isLocked ? '???' : scene.name}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── 训练目标 ─────────────────────────────────────────

function TrainingGoals() {
  const { currentDay, globalResources } = useGameStore()
  const chapter = getCurrentChapter(currentDay)
  const progress = Math.round(
    (globalResources.vocal + globalResources.dance + globalResources.charm) / 3
  )

  return (
    <div className={`${P}-dash-goals`}>
      <div className={`${P}-dash-chapter-badge`}>
        第{chapter.id}章「{chapter.name}」
      </div>
      <ul className={`${P}-dash-goal-list`}>
        {chapter.objectives.map((obj, i) => (
          <li key={i} className={`${P}-dash-goal-item`}>
            <span className={`${P}-dash-goal-dot`} />
            <span>{obj}</span>
          </li>
        ))}
      </ul>
      <div className={`${P}-dash-progress`}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>综合实力</span>
        <div className={`${P}-dash-progress-track`}>
          <div
            className={`${P}-dash-progress-fill`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>{progress}</span>
      </div>
    </div>
  )
}

// ── 道具格子 ─────────────────────────────────────────

function ItemBoard() {
  const { inventory } = useGameStore()
  const collected = ITEMS.filter((item) => (inventory[item.id] ?? 0) > 0)

  if (collected.length === 0) {
    return <div className={`${P}-dash-empty`}>暂无道具</div>
  }

  return (
    <div className={`${P}-dash-item-grid`}>
      {collected.map((item) => (
        <div key={item.id} className={`${P}-dash-item-cell`}>
          <span style={{ fontSize: 22 }}>{item.icon}</span>
          <span style={{ fontSize: 11 }}>{item.name}</span>
          {(inventory[item.id] ?? 0) > 1 && (
            <span className={`${P}-dash-item-count`}>×{inventory[item.id]}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 排名预览 (5全局属性mini条形图) ───────────────────

function RankingPreview() {
  const globalResources = useGameStore((s) => s.globalResources)

  return (
    <div className={`${P}-dash-ranking`}>
      {GLOBAL_STAT_METAS.map((meta) => {
        const val = globalResources[meta.key as keyof GlobalResources]
        return (
          <div key={meta.key} className={`${P}-dash-rank-row`}>
            <span style={{ fontSize: 11, minWidth: 40 }}>{meta.icon} {meta.label}</span>
            <div className={`${P}-dash-rank-track`}>
              <div
                className={`${P}-dash-rank-fill`}
                style={{ width: `${val}%`, background: meta.color }}
              />
            </div>
            <span style={{ fontSize: 11, color: meta.color, fontWeight: 600, minWidth: 24, textAlign: 'right' }}>
              {val}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── 音乐播放器 ───────────────────────────────────────

function MusicSection() {
  const { isPlaying, toggle } = useBgm()

  return (
    <div className={`${P}-dash-music`}>
      <div className={`${P}-dash-music-cover ${isPlaying ? `${P}-dash-music-spin` : ''}`}>
        <img src="/scenes/practice.jpg" alt="" />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>青春进行曲</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>原声</div>
      <div className={`${P}-dash-music-controls`}>
        <button className={`${P}-dash-music-side`} disabled>⏪</button>
        <button className={`${P}-dash-music-play`} onClick={(e) => toggle(e)}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className={`${P}-dash-music-side`} disabled>⏩</button>
      </div>
    </div>
  )
}

// ── 可拖拽 Section 包装 ──────────────────────────────

function DashSection({ id, title, children }: {
  id: string; title: string; children: React.ReactNode
}) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={id} dragListener={false} dragControls={controls}>
      <div className={`${P}-dash-reorder`}>
        <div className={`${P}-dash-section-header`}>
          <div className={`${P}-dash-section-title`}>{title}</div>
          <div className={`${P}-dash-grip`} onPointerDown={(e) => controls.start(e)}>⋮⋮</div>
        </div>
        {children}
      </div>
    </Reorder.Item>
  )
}

// ── 标题映射 ─────────────────────────────────────────

const SECTION_TITLES: Record<string, string> = {
  characters: '练习生们',
  scenes: '场景',
  goals: '训练目标',
  items: '道具',
  ranking: '能力雷达',
  music: '氛围音乐',
}

// ── DashboardDrawer 主体 ─────────────────────────────

export default function DashboardDrawer({ onClose }: { onClose: () => void }) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem(ORDER_KEY)
      if (s) {
        const arr = JSON.parse(s) as string[]
        if (DEFAULT_ORDER.every((k) => arr.includes(k))) return arr
      }
    } catch { /* noop */ }
    return [...DEFAULT_ORDER]
  })

  useEffect(() => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order))
  }, [order])

  const renderSection = (key: string) => {
    switch (key) {
      case 'characters': return <CharacterGallery onClose={onClose} />
      case 'scenes':     return <SceneMap onClose={onClose} />
      case 'goals':      return <TrainingGoals />
      case 'items':      return <ItemBoard />
      case 'ranking':    return <RankingPreview />
      case 'music':      return <MusicSection />
      default:           return null
    }
  }

  return (
    <motion.div
      className={`${P}-dash-overlay`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`${P}-dash-drawer`}
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${P}-dash-header`}>
          <div className={`${P}-dash-title`}>练习生手帐</div>
          <button className={`${P}-dash-close`} onClick={onClose}>✕</button>
        </div>

        <div className={`${P}-dash-scroll ${P}-scrollbar`}>
          <FrontPage />
          <Reorder.Group
            axis="y"
            values={order}
            onReorder={setOrder}
            style={{ listStyle: 'none', padding: 0, margin: 0 }}
          >
            {order.map((key) => (
              <DashSection key={key} id={key} title={SECTION_TITLES[key] ?? key}>
                {renderSection(key)}
              </DashSection>
            ))}
          </Reorder.Group>
        </div>
      </motion.div>
    </motion.div>
  )
}
