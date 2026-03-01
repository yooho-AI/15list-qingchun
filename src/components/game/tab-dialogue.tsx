/**
 * [INPUT]: 依赖 store.ts 状态和操作，parser.ts 文本解析，data.ts 道具/快捷操作/场景
 * [OUTPUT]: 对外提供 TabDialogue 组件
 * [POS]: 对话 Tab：富消息路由(场景卡/期变卡/NPC头像气泡/系统/玩家) + 可折叠选项面板 + 背包 + 输入
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, STORY_INFO, ITEMS, QUICK_ACTIONS, SCENES } from '@/lib/store'
import type { Message } from '@/lib/store'
import { parseStoryParagraph } from '@/lib/parser'
import { GameController, CaretUp, CaretDown } from '@phosphor-icons/react'

const P = 'qc'

// ── 场景转场卡 ───────────────────────────────────────
function SceneTransitionCard({ msg }: { msg: Message }) {
  const scene = msg.sceneId ? SCENES[msg.sceneId] : null
  if (!scene) return null

  return (
    <motion.div
      className={`${P}-scene-card`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <img src={scene.background} alt={scene.name} loading="lazy" />
      <div className={`${P}-scene-card-overlay`}>
        <div className={`${P}-scene-card-name`}>{scene.icon} {scene.name}</div>
        <div className={`${P}-scene-card-atmo`}>{scene.atmosphere}</div>
      </div>
      <div className={`${P}-scene-card-badge`}>当前位置</div>
    </motion.div>
  )
}

// ── 期变卡片（逐字打字机） ───────────────────────────
function EpisodeCard({ msg }: { msg: Message }) {
  const info = msg.episodeInfo
  if (!info) return null

  const text = `第${info.episode}期`

  return (
    <motion.div
      className={`${P}-episode-card`}
      initial={{ opacity: 0, y: -30, rotate: -3 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 250 }}
    >
      <div className={`${P}-episode-badge`}>EPISODE</div>
      <div className={`${P}-episode-number`}>
        {text.split('').map((ch, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
          >
            {ch}
          </motion.span>
        ))}
      </div>
      <div className={`${P}-episode-chapter`}>{info.chapter}</div>
    </motion.div>
  )
}

// ── 信笺卡片 ─────────────────────────────────────────
function LetterCard() {
  return (
    <div className={`${P}-letter-card`}>
      <div className={`${P}-letter-title`}>{STORY_INFO.title}</div>
      <p className={`${P}-letter-desc`}>{STORY_INFO.description}</p>
    </div>
  )
}

// ── 打字指示器 ────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className={`${P}-bubble-npc`} style={{ display: 'flex', gap: 4, padding: '12px 20px' }}>
      <span className={`${P}-typing-dot`} />
      <span className={`${P}-typing-dot`} />
      <span className={`${P}-typing-dot`} />
    </div>
  )
}

// ── 流式消息 ─────────────────────────────────────────
function StreamingMessage({ content }: { content: string }) {
  const { narrative } = parseStoryParagraph(content)
  return (
    <div className={`${P}-bubble-npc`}>
      <div dangerouslySetInnerHTML={{ __html: narrative }} />
      <span className={`${P}-cursor`}>▍</span>
    </div>
  )
}

// ── 背包弹窗 ─────────────────────────────────────────
function InventorySheet({ onClose }: { onClose: () => void }) {
  const inventory = useGameStore((s) => s.inventory)
  const useItem = useGameStore((s) => s.useItem)

  const items = ITEMS.filter((item) => (inventory[item.id] ?? 0) > 0)

  return (
    <>
      <motion.div
        className={`${P}-overlay`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ zIndex: 54 }}
      />
      <motion.div
        className={`${P}-inventory-sheet`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className={`${P}-inventory-handle`} />
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>🎒 背包</h3>
        {items.length === 0 ? (
          <div className={`${P}-placeholder`}>
            <span className={`${P}-placeholder-icon`}>🎒</span>
            <span>背包空空如也</span>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`${P}-item-row`}
              onClick={() => { useItem(item.id); onClose() }}
            >
              <span style={{ fontSize: 24 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {item.name}
                  {(inventory[item.id] ?? 0) > 1 && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                      {' '}×{inventory[item.id]}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {item.description}
                </div>
              </div>
            </div>
          ))
        )}
      </motion.div>
    </>
  )
}

// ── 消息气泡路由 ─────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const characters = useGameStore((s) => s.characters)

  // 富消息路由
  if (msg.type === 'scene-transition') return <SceneTransitionCard msg={msg} />
  if (msg.type === 'episode-change') return <EpisodeCard msg={msg} />

  // 系统消息
  if (msg.role === 'system') {
    return (
      <motion.div
        className={`${P}-bubble-system`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {msg.content}
      </motion.div>
    )
  }

  // 玩家消息
  if (msg.role === 'user') {
    return (
      <motion.div
        className={`${P}-bubble-player`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {msg.content}
      </motion.div>
    )
  }

  // NPC 消息：头像 + 气泡
  const char = msg.character ? characters[msg.character] : null
  const { narrative, statHtml } = parseStoryParagraph(msg.content)

  return (
    <motion.div
      className={`${P}-npc-row`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {char ? (
        <img className={`${P}-npc-avatar`} src={char.portrait} alt={char.name} />
      ) : (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--primary-light)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: 'var(--primary)',
        }}>
          AI
        </div>
      )}
      <div className={`${P}-npc-bubble`}>
        <div dangerouslySetInnerHTML={{ __html: narrative }} />
        {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
      </div>
    </motion.div>
  )
}

// ── 对话 Tab 主组件 ──────────────────────────────────
export default function TabDialogue() {
  const messages = useGameStore((s) => s.messages)
  const isTyping = useGameStore((s) => s.isTyping)
  const streamingContent = useGameStore((s) => s.streamingContent)
  const sendMessage = useGameStore((s) => s.sendMessage)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const inventory = useGameStore((s) => s.inventory)

  const [input, setInput] = useState('')
  const [showInventory, setShowInventory] = useState(false)
  const [choicesOpen, setChoicesOpen] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const prevChoicesRef = useRef<string[]>([])

  const choices = QUICK_ACTIONS

  // 自动滚动
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages.length, streamingContent])

  // AI 回复后自动收起选项面板
  useEffect(() => {
    const prev = prevChoicesRef.current
    if (choices.length > 0 && (choices.length !== prev.length || choices[0] !== prev[0])) {
      setChoicesOpen(false)
    }
    prevChoicesRef.current = choices
  }, [choices])

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping) return
    sendMessage(input.trim())
    setInput('')
  }, [input, isTyping, sendMessage])

  const handleQuickAction = useCallback((action: string) => {
    if (isTyping) return
    setChoicesOpen(false)
    sendMessage(action)
  }, [isTyping, sendMessage])

  const char = currentCharacter ? characters[currentCharacter] : null
  const itemCount = Object.values(inventory).reduce((a, b) => a + b, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── 聊天区 ── */}
      <div
        ref={chatRef}
        className={`${P}-scrollbar`}
        style={{
          flex: 1, overflow: 'auto', padding: '0 12px',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {messages.length === 0 && <LetterCard />}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {isTyping && !streamingContent && <TypingIndicator />}
        {streamingContent && <StreamingMessage content={streamingContent} />}

        <div style={{ height: 8, flexShrink: 0 }} />
      </div>

      {/* ── 可折叠选项面板 ── */}
      {choices.length > 0 && (
        <div className={`${P}-choice-wrap`}>
          <AnimatePresence mode="wait">
            {!choicesOpen ? (
              <motion.button
                key="collapsed"
                className={`${P}-choice-toggle`}
                onClick={() => setChoicesOpen(true)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                disabled={isTyping}
              >
                <GameController size={16} weight="fill" />
                <span>展开行动选项</span>
                <span className={`${P}-choice-toggle-badge`}>{choices.length}</span>
                <CaretUp size={14} />
              </motion.button>
            ) : (
              <motion.div
                key="expanded"
                className={`${P}-choice-panel`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <button
                  className={`${P}-choice-panel-header`}
                  onClick={() => setChoicesOpen(false)}
                >
                  <span>选择行动</span>
                  <span className={`${P}-choice-panel-count`}>{choices.length}项</span>
                  <CaretDown size={14} />
                </button>
                <div className={`${P}-choice-list`}>
                  {choices.map((action, idx) => (
                    <motion.button
                      key={`${action}-${idx}`}
                      className={`${P}-choice-btn`}
                      onClick={() => handleQuickAction(action)}
                      disabled={isTyping}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <span className={`${P}-choice-idx`}>{String.fromCharCode(65 + idx)}</span>
                      {action}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── 输入区 ── */}
      <div className={`${P}-input-area`}>
        <button
          className={`${P}-item-btn`}
          onClick={() => setShowInventory(true)}
        >
          🎒
          {itemCount > 0 && <span className={`${P}-item-badge`}>{itemCount}</span>}
        </button>
        <input
          className={`${P}-input`}
          placeholder={char ? `对${char.name}说...` : '说点什么...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
          disabled={isTyping}
        />
        <button
          className={`${P}-send-btn`}
          onClick={handleSend}
          disabled={isTyping || !input.trim()}
        >
          ↑
        </button>
      </div>

      {/* ── 背包弹窗 ── */}
      <AnimatePresence>
        {showInventory && <InventorySheet onClose={() => setShowInventory(false)} />}
      </AnimatePresence>
    </div>
  )
}
