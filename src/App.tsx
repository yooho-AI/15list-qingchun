/**
 * [INPUT]: 依赖 store.ts 全局状态，bgm.ts 音频，data.ts 类型+角色数据，analytics.ts 埋点
 * [OUTPUT]: 对外提供 App 根组件
 * [POS]: 应用入口，三阶段开场(全屏Splash→群像闪切→姓名输入) ↔ GameScreen + EndingModal + MenuOverlay
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/store'
import { STORY_INFO, ENDINGS } from '@/lib/store'
import { buildCharacters } from '@/lib/data'
import { useBgm } from '@/lib/bgm'
import { trackGameStart, trackPlayerCreate, trackGameContinue } from '@/lib/analytics'
import AppShell from '@/components/game/app-shell'
import '@/styles/globals.css'
import '@/styles/opening.css'
import '@/styles/rich-cards.css'

// ── 结局类型映射（数据驱动，零 if/else） ────────────
const ENDING_TYPE_MAP: Record<string, { label: string; color: string; icon: string }> = {
  TE: { label: '⭐ True Ending', color: '#ffd700', icon: '👑' },
  HE: { label: '🎉 Happy Ending', color: '#ff4d8d', icon: '🌟' },
  BE: { label: '💀 Bad Ending', color: '#64748b', icon: '💔' },
  NE: { label: '🌙 Normal Ending', color: '#f59e0b', icon: '🌙' },
}

// ── 角色数据（群像闪切用） ───────────────────────────
const ALL_CHARACTERS = Object.values(buildCharacters())

// ── 开场粒子（模块级初始化） ─────────────────────────
const SPLASH_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 3 + Math.random() * 6,
  delay: Math.random() * 5,
  duration: 3 + Math.random() * 3,
  kind: i % 4,
}))

// ── Phase 1: 全屏沉浸式开场 ─────────────────────────
function SplashScreen({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="qc-splash" onClick={onConfirm}>
      <div className="qc-splash-bg" />
      <div className="qc-splash-particles">
        {SPLASH_PARTICLES.map((p) => (
          <div
            key={p.id}
            className={`qc-particle qc-particle-${p.kind}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>
      <div className="qc-splash-content">
        <motion.div
          className="qc-splash-character"
          initial={{ opacity: 0, y: '8%', filter: 'blur(12px)' }}
          animate={{ opacity: 1, y: '0%', filter: 'blur(0px)' }}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <img src="/characters/guyanche.jpg?v=3" alt="" />
        </motion.div>
        <div className="qc-splash-ui">
          <div className="qc-splash-top">
            <motion.div
              className="qc-splash-logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.6 }}
            >
              TIANXING MEDIA
            </motion.div>
            <motion.h1
              className="qc-splash-title"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, duration: 0.6 }}
            >
              青春练习生
            </motion.h1>
            <motion.p
              className="qc-splash-tagline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 2.3, duration: 0.6 }}
            >
              12期考核，你的出道命运由你书写
            </motion.p>
          </div>
          <motion.div
            className="qc-splash-bottom"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3, duration: 0.5 }}
          >
            <button className="qc-splash-cta">接受邀请，成为制作人</button>
            <div className="qc-splash-seal">天星传媒 · 练习生事业部</div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// ── Phase 2: 群像闪切 ────────────────────────────────
function CharacterMontage({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0)
  const { toggle, isPlaying } = useBgm()

  // BGM 启动
  useEffect(() => {
    if (!isPlaying) toggle()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 自动推进
  useEffect(() => {
    const timer = setTimeout(() => {
      if (index < ALL_CHARACTERS.length) {
        setIndex((i) => i + 1)
      } else {
        onComplete()
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [index, onComplete])

  const char = ALL_CHARACTERS[index]
  const fromLeft = index % 2 === 0

  return (
    <div className="qc-start-bg" style={{ padding: 0 }}>
      <div style={{ maxWidth: 430, width: '100%', height: '100dvh', position: 'relative', overflow: 'hidden', background: '#0f0f0f' }}>
        <AnimatePresence mode="wait">
          {char ? (
            <motion.div
              key={char.id}
              className="qc-montage-portrait"
              initial={{ opacity: 0, x: fromLeft ? -60 : 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <img src={char.portrait} alt={char.name} />
              <div className="qc-montage-overlay">
                <div className="qc-montage-name">{char.name}</div>
                <div className="qc-montage-title">{char.title}</div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="qc-montage-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div style={{ fontSize: 56 }}>?</div>
              <div className="qc-montage-empty-text">你的位置</div>
              <div className="qc-montage-empty-sub">等你来占</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 进度点 */}
        <div className="qc-montage-dots">
          {[...ALL_CHARACTERS, null].map((_, i) => (
            <div
              key={i}
              className={`qc-montage-dot ${i === index ? 'qc-montage-dot-active' : ''}`}
            />
          ))}
        </div>

        {/* 跳过按钮 */}
        <button className="qc-montage-skip" onClick={onComplete}>
          跳过
        </button>
      </div>
    </div>
  )
}

// ── Phase 3: 姓名输入（暗色通行证） ─────────────────
function NameInput() {
  const [name, setName] = useState('')
  const setPlayerInfo = useGameStore((s) => s.setPlayerInfo)
  const initGame = useGameStore((s) => s.initGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const hasSave = useGameStore((s) => s.hasSave)
  const sendMessage = useGameStore((s) => s.sendMessage)

  const handleStart = useCallback(() => {
    if (!name.trim()) return
    setPlayerInfo(name.trim())
    initGame()
    trackGameStart()
    trackPlayerCreate(name.trim())
    setTimeout(() => {
      sendMessage('（推开天星传媒的大门，深吸一口气，我来报到了。）')
    }, 300)
  }, [name, setPlayerInfo, initGame, sendMessage])

  const handleContinue = useCallback(() => {
    loadGame()
    trackGameContinue()
  }, [loadGame])

  const leads = ALL_CHARACTERS.filter((c) => c.isLead)

  return (
    <div className="qc-start-bg">
      <motion.div
        className="qc-start-inner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="qc-start-logo">TIANXING MEDIA</div>
        <h1 className="qc-start-title">练习生通行证</h1>
        <p className="qc-start-desc">{STORY_INFO.description}</p>

        {/* 3 男主竖卡 */}
        <div className="qc-start-leads">
          {leads.map((c, i) => (
            <motion.div
              key={c.id}
              className="qc-start-lead"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.12 }}
            >
              <img src={c.portrait} alt={c.name} />
              <div className="qc-start-lead-info">
                <div className="qc-start-lead-name">{c.name}</div>
                <div className="qc-start-lead-title">{c.title}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <input
          className="qc-start-input"
          placeholder="你的艺名"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 8))}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
        />
        <button
          className="qc-start-btn"
          onClick={handleStart}
          disabled={!name.trim()}
        >
          正式报到
        </button>
        {hasSave() && (
          <button className="qc-start-btn-secondary" onClick={handleContinue}>
            继续训练
          </button>
        )}
      </motion.div>
    </div>
  )
}

// ── 开场路由 ─────────────────────────────────────────
function StartScreen() {
  const [phase, setPhase] = useState<'splash' | 'montage' | 'input'>('splash')

  return (
    <AnimatePresence mode="wait">
      {phase === 'splash' && (
        <motion.div key="splash" style={{ width: '100%' }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <SplashScreen onConfirm={() => setPhase('montage')} />
        </motion.div>
      )}
      {phase === 'montage' && (
        <motion.div key="montage" style={{ width: '100%' }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <CharacterMontage onComplete={() => setPhase('input')} />
        </motion.div>
      )}
      {phase === 'input' && (
        <motion.div key="input" style={{ width: '100%' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <NameInput />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── 结局弹窗 ─────────────────────────────────────────
function EndingModal() {
  const endingType = useGameStore((s) => s.endingType)
  const resetGame = useGameStore((s) => s.resetGame)

  if (!endingType) return null

  const ending = ENDINGS.find((e) => e.id === endingType)
  if (!ending) return null

  const meta = ENDING_TYPE_MAP[ending.type] ?? ENDING_TYPE_MAP.NE

  return (
    <motion.div
      className="qc-ending-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="qc-ending-modal"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div style={{ fontSize: 64, marginBottom: 12 }}>{meta.icon}</div>
        <div style={{
          fontSize: 12, color: meta.color, background: `${meta.color}15`,
          padding: '4px 12px', borderRadius: 10, display: 'inline-block', marginBottom: 8,
        }}>
          {meta.label}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{ending.name}</h2>
        <p style={{
          fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24,
        }}>
          {ending.description}
        </p>
        <button className="qc-start-btn" onClick={resetGame}>
          返回标题
        </button>
        <button
          className="qc-start-btn-secondary"
          style={{ marginTop: 8 }}
          onClick={() => useGameStore.setState({ endingType: null })}
        >
          继续探索
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── 菜单弹窗 ─────────────────────────────────────────
function MenuOverlay({ onClose }: { onClose: () => void }) {
  const saveGame = useGameStore((s) => s.saveGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const resetGame = useGameStore((s) => s.resetGame)
  const hasSave = useGameStore((s) => s.hasSave)

  return (
    <motion.div
      className="qc-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="qc-modal"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>
          菜单
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="qc-menu-btn" onClick={() => { saveGame(); onClose() }}>
            💾 保存游戏
          </button>
          {hasSave() && (
            <button className="qc-menu-btn" onClick={() => { loadGame(); onClose() }}>
              📂 读取存档
            </button>
          )}
          <button className="qc-menu-btn" onClick={resetGame}>
            🏠 返回标题
          </button>
          <button className="qc-menu-btn" onClick={onClose}>
            ▶️ 继续游戏
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── 根组件 ───────────────────────────────────────────
export default function App() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const endingType = useGameStore((s) => s.endingType)
  const [showMenu, setShowMenu] = useState(false)

  if (!gameStarted) return <StartScreen />

  return (
    <>
      <AppShell onMenuOpen={() => setShowMenu(true)} />
      <AnimatePresence>
        {showMenu && <MenuOverlay onClose={() => setShowMenu(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {endingType && <EndingModal />}
      </AnimatePresence>
    </>
  )
}
