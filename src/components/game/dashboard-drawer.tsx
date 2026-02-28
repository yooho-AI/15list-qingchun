/**
 * [INPUT]: 依赖 store.ts 全部游戏状态, data.ts 的 SCENES/ITEMS/GLOBAL_STAT_METAS, bgm.ts, framer-motion (Reorder)
 * [OUTPUT]: 对外提供 DashboardDrawer 组件（练习生手帐）
 * [POS]: 左侧滑入抽屉，7组件：扉页/缘分速览/偶像卡牌/场景速览/训练目标/我的状态 + 底部迷你播放。拖拽排序。被 app-shell 消费
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
const ORDER_KEY = 'qc-dash-order-v2'
const DEFAULT_ORDER = ['relations', 'characters', 'scenes', 'goals', 'status']

// ── 扉页（紧凑横排） ───────────────────────────────

function FrontPage() {
  const { currentDay, currentPeriodIndex, actionPoints } = useGameStore()
  const chapter = getCurrentChapter(currentDay)
  const PERIODS = ['早晨', '中午', '晚上']
  const PERIOD_ICONS = ['🌅', '☀️', '🌙']

  return (
    <div className={`${P}-dash-front`}>
      <div className={`${P}-dash-front-left`}>
        <div className={`${P}-dash-front-badge`}>{currentDay}</div>
        <div className={`${P}-dash-front-meta`}>
          <span className={`${P}-dash-front-period`}>
            {PERIOD_ICONS[currentPeriodIndex]} {PERIODS[currentPeriodIndex]}
          </span>
          <span className={`${P}-dash-front-chapter`}>
            第{chapter.id}章「{chapter.name}」
          </span>
        </div>
      </div>
      <div className={`${P}-dash-front-right`}>
        <div className={`${P}-dash-front-stars`}>
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className={i < actionPoints ? `${P}-dash-star-filled` : `${P}-dash-star-empty`}>
              {i < actionPoints ? '★' : '☆'}
            </span>
          ))}
        </div>
        <span className={`${P}-dash-front-ap-text`}>行动力</span>
      </div>
    </div>
  )
}

// ── 缘分速览（3 男主好感一览） ──────────────────────

function RelationshipMini({ onClose }: { onClose: () => void }) {
  const { characters, characterStats, selectCharacter } = useGameStore()
  const leads = Object.values(characters).filter((c) => c.isLead)

  return (
    <div className={`${P}-dash-relations`}>
      {leads.map((c) => {
        const val = characterStats[c.id]?.affection ?? 0
        return (
          <button
            key={c.id}
            className={`${P}-dash-relation-item`}
            onClick={() => { selectCharacter(c.id); onClose() }}
          >
            <img
              className={`${P}-dash-relation-avatar`}
              src={c.portrait}
              alt={c.name}
              style={{ borderColor: c.themeColor }}
            />
            <span className={`${P}-dash-relation-name`}>{c.name}</span>
            <span className={`${P}-dash-relation-val`} style={{ color: c.themeColor }}>
              ❤️{val}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── 偶像卡牌（2:3 竖版） ────────────────────────────

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

  // 5 颗心：每 20 点填一颗
  const heartCount = char.statMetas[0]
    ? Math.floor((stats[char.statMetas[0].key] ?? 0) / 20)
    : 0

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
                <div
                  className={`${P}-dash-photo-img`}
                  style={{ boxShadow: `0 0 16px ${char.themeColor}30` }}
                >
                  <img src={char.portrait} alt={char.name} />
                  <div className={`${P}-dash-photo-nameplate`}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{char.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>{char.title}</div>
                  </div>
                </div>
                <div className={`${P}-dash-photo-hearts`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={i < heartCount ? `${P}-dash-heart-filled` : `${P}-dash-heart-empty`}>
                      {i < heartCount ? '❤️' : '🤍'}
                    </span>
                  ))}
                  <span className={`${P}-dash-photo-hearts-val`}>
                    {stats[char.statMetas[0]?.key] ?? 0}
                  </span>
                </div>
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

// ── 场景速览（横向滚动缩略图） ──────────────────────

function SceneMap({ onClose }: { onClose: () => void }) {
  const { currentScene, unlockedScenes, selectScene } = useGameStore()
  const sceneEntries = Object.entries(SCENES)

  const handleClick = (sid: string) => {
    if (unlockedScenes.includes(sid) && sid !== currentScene) {
      selectScene(sid); onClose()
    }
  }

  return (
    <div className={`${P}-dash-scene-scroll`}>
      {sceneEntries.map(([sid, scene]) => {
        const isCurrent = sid === currentScene
        const isLocked = !unlockedScenes.includes(sid)
        return (
          <button
            key={sid}
            className={[
              `${P}-dash-scene-thumb`,
              isCurrent && `${P}-dash-scene-cur`,
              isLocked && `${P}-dash-scene-lock`,
            ].filter(Boolean).join(' ')}
            onClick={() => handleClick(sid)}
            disabled={isLocked}
          >
            <img src={scene.background} alt={scene.name} />
            {isLocked && <div className={`${P}-dash-scene-lock-icon`}>🔒</div>}
            <span className={`${P}-dash-scene-label`}>{isLocked ? '???' : scene.name}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── 训练目标（精简 checkbox） ────────────────────────

function TrainingGoals() {
  const { currentDay } = useGameStore()
  const chapter = getCurrentChapter(currentDay)

  return (
    <div className={`${P}-dash-goals`}>
      <ul className={`${P}-dash-goal-list`}>
        {chapter.objectives.map((obj, i) => (
          <li key={i} className={`${P}-dash-goal-item`}>
            <span className={`${P}-dash-goal-check`}>☐</span>
            <span>{obj}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── 我的状态（属性 pills + 道具贴纸） ───────────────

function StatusBoard() {
  const { globalResources, inventory } = useGameStore()
  const collected = ITEMS.filter((item) => (inventory[item.id] ?? 0) > 0)

  return (
    <div className={`${P}-dash-status`}>
      {/* 属性 pills */}
      <div className={`${P}-dash-stat-pills`}>
        {GLOBAL_STAT_METAS.map((meta) => {
          const val = globalResources[meta.key as keyof GlobalResources]
          return (
            <span
              key={meta.key}
              className={`${P}-dash-stat-pill`}
              style={{ background: `${meta.color}15`, color: meta.color, borderColor: `${meta.color}30` }}
            >
              {meta.icon}{val}
            </span>
          )
        })}
      </div>

      {/* 道具贴纸 */}
      {collected.length > 0 && (
        <div className={`${P}-dash-item-grid`}>
          {collected.map((item) => (
            <div key={item.id} className={`${P}-dash-item-cell`}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 10 }}>{item.name}</span>
              {(inventory[item.id] ?? 0) > 1 && (
                <span className={`${P}-dash-item-count`}>×{inventory[item.id]}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {collected.length === 0 && (
        <div className={`${P}-dash-empty`}>暂无道具</div>
      )}
    </div>
  )
}

// ── 底部迷你播放条 ──────────────────────────────────

function MiniPlayer() {
  const { isPlaying, toggle } = useBgm()

  return (
    <div className={`${P}-dash-mini-player`}>
      <span className={`${P}-dash-mini-note`}>♫</span>
      <span className={`${P}-dash-mini-title`}>青春进行曲</span>
      <button className={`${P}-dash-mini-btn`} onClick={(e) => toggle(e)}>
        {isPlaying ? '⏸' : '▶'}
      </button>
    </div>
  )
}

// ── 可拖拽 Section 包装 ─────────────────────────────

function DashSection({ id, title, children }: {
  id: string; title: string; children: React.ReactNode
}) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={id} dragListener={false} dragControls={controls}>
      <div className={`${P}-dash-reorder`}>
        <div className={`${P}-dash-section-header`}>
          <div className={`${P}-dash-section-title`}>{title}</div>
          <div className={`${P}-dash-grip`} onPointerDown={(e) => controls.start(e)}>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
              <rect y="0" width="14" height="2" rx="1" />
              <rect y="4" width="14" height="2" rx="1" />
              <rect y="8" width="14" height="2" rx="1" />
            </svg>
          </div>
        </div>
        {children}
      </div>
    </Reorder.Item>
  )
}

// ── 标题映射 ────────────────────────────────────────

const SECTION_TITLES: Record<string, string> = {
  relations: '缘分速览',
  characters: '偶像卡牌',
  scenes: '场景速览',
  goals: '训练目标',
  status: '我的状态',
}

// ── DashboardDrawer 主体 ────────────────────────────

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
      case 'relations':  return <RelationshipMini onClose={onClose} />
      case 'characters': return <CharacterGallery onClose={onClose} />
      case 'scenes':     return <SceneMap onClose={onClose} />
      case 'goals':      return <TrainingGoals />
      case 'status':     return <StatusBoard />
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

        <MiniPlayer />
      </motion.div>
    </motion.div>
  )
}
