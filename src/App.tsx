/**
 * [INPUT]: 依赖 store.ts 全局状态，bgm.ts 音频，data.ts 类型+角色数据，analytics.ts 埋点
 * [OUTPUT]: 对外提供 App 根组件
 * [POS]: 应用入口，三阶段开场(邀请函→群像闪切→姓名输入) ↔ GameScreen + EndingModal + MenuOverlay
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

// ── Phase 1: 邀请函 ─────────────────────────────────
function InviteCard({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="qc-start-bg">
      <motion.div
        className="qc-invite-card"
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      >
        <div className="qc-invite-logo">TIANXING MEDIA</div>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
        <h1 className="qc-invite-title">练习生选拔通知</h1>
        <p className="qc-invite-body">
          恭喜你通过天星传媒练习生初选。<br />
          即日起，请前往公司报到，开启你的偶像之路。<br />
          12期综艺考核，决定你的出道命运。
        </p>
        <div className="qc-invite-seal">天星传媒 · 练习生事业部</div>
        <motion.button
          className="qc-invite-cta"
          onClick={onConfirm}
          whileTap={{ scale: 0.97 }}
        >
          确认入社
        </motion.button>
      </motion.div>
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

// ── Phase 3: 姓名输入 ────────────────────────────────
function NameInput() {
  const [name, setName] = useState('')
  const setPlayerInfo = useGameStore((s) => s.setPlayerInfo)
  const initGame = useGameStore((s) => s.initGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const hasSave = useGameStore((s) => s.hasSave)

  const handleStart = useCallback(() => {
    if (!name.trim()) return
    setPlayerInfo(name.trim())
    initGame()
    trackGameStart()
    trackPlayerCreate(name.trim())
  }, [name, setPlayerInfo, initGame])

  const handleContinue = useCallback(() => {
    loadGame()
    trackGameContinue()
  }, [loadGame])

  const leads = ALL_CHARACTERS.filter((c) => c.isLead)

  return (
    <div className="qc-start-bg">
      <motion.div
        className="qc-start-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ fontSize: 56, marginBottom: 8 }}>{STORY_INFO.emoji}</div>
        <div className="qc-letter-genre">{STORY_INFO.genre}</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          {STORY_INFO.title}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          {STORY_INFO.description}
        </p>

        {/* 男主预览：真实立绘头像 */}
        <div className="qc-preview-grid">
          {leads.map((c) => (
            <div key={c.id} className="qc-preview-card">
              <img className="qc-preview-avatar" src={c.portrait} alt={c.name} />
              <div className="qc-preview-name">{c.name}</div>
              <div className="qc-preview-title">{c.title}</div>
            </div>
          ))}
        </div>

        {/* 名字输入 */}
        <input
          className="qc-start-input"
          placeholder="输入你的艺名（最多8字）"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 8))}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
        />

        {/* 按钮 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <button
            className="qc-start-btn"
            onClick={handleStart}
            disabled={!name.trim()}
          >
            踏上星光之路
          </button>
          {hasSave() && (
            <button className="qc-start-btn-secondary" onClick={handleContinue}>
              继续游戏
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── 开场路由 ─────────────────────────────────────────
function StartScreen() {
  const [phase, setPhase] = useState<'invite' | 'montage' | 'input'>('invite')

  return (
    <AnimatePresence mode="wait">
      {phase === 'invite' && (
        <motion.div key="invite" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <InviteCard onConfirm={() => setPhase('montage')} />
        </motion.div>
      )}
      {phase === 'montage' && (
        <motion.div key="montage" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <CharacterMontage onComplete={() => setPhase('input')} />
        </motion.div>
      )}
      {phase === 'input' && (
        <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
