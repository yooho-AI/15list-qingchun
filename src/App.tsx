/**
 * [INPUT]: 依赖 store.ts 全局状态，bgm.ts 音频，data.ts 类型
 * [OUTPUT]: 对外提供 App 根组件
 * [POS]: 应用入口，StartScreen ↔ GameScreen 二态 + EndingModal + MenuOverlay
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/store'
import { STORY_INFO, ENDINGS } from '@/lib/store'
import { useBgm } from '@/lib/bgm'
import AppShell from '@/components/game/app-shell'
import '@/styles/globals.css'

// ── 结局类型映射（数据驱动，零 if/else） ────────────
const ENDING_TYPE_MAP: Record<string, { label: string; color: string; icon: string }> = {
  TE: { label: '⭐ True Ending', color: '#ffd700', icon: '👑' },
  HE: { label: '🎉 Happy Ending', color: '#ff4d8d', icon: '🌟' },
  BE: { label: '💀 Bad Ending', color: '#64748b', icon: '💔' },
  NE: { label: '🌙 Normal Ending', color: '#f59e0b', icon: '🌙' },
}

// ── 开始页面 ─────────────────────────────────────────
function StartScreen() {
  const [name, setName] = useState('')
  const { isPlaying, toggle } = useBgm()
  const setPlayerInfo = useGameStore((s) => s.setPlayerInfo)
  const initGame = useGameStore((s) => s.initGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const hasSave = useGameStore((s) => s.hasSave)

  const handleStart = useCallback(() => {
    if (!name.trim()) return
    setPlayerInfo(name.trim())
    initGame()
  }, [name, setPlayerInfo, initGame])

  const handleContinue = useCallback(() => {
    loadGame()
  }, [loadGame])

  const characters = [
    { name: '顾言澈', title: '顶流男明星', color: '#6366f1' },
    { name: '沈哲远', title: '舞蹈导师', color: '#ef4444' },
    { name: '周慕深', title: '王牌经纪人', color: '#0ea5e9' },
  ]

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

        {/* 角色预览 */}
        <div className="qc-preview-grid">
          {characters.map((c) => (
            <div key={c.name} className="qc-preview-card">
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: `linear-gradient(135deg, ${c.color}22, ${c.color}44)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, border: `2px solid ${c.color}33`,
              }}>
                {c.name[0]}
              </div>
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

        {/* 音乐控制 */}
        <button
          onClick={toggle}
          style={{
            marginTop: 16, background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 20, opacity: 0.5,
          }}
        >
          {isPlaying ? '🔊' : '🔇'}
        </button>
      </motion.div>
    </div>
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
