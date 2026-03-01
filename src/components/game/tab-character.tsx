/**
 * [INPUT]: 依赖 store.ts 状态（角色/数值），data.ts 角色/工具函数，stream.ts SSE通信
 * [OUTPUT]: 对外提供 TabCharacter 组件
 * [POS]: 人物 Tab：立绘(9:16) + 数值条(category分组) + SVG RelationGraph + 关系列表(真实头像) + CharacterDossier 全屏档案 + PrivateChatSheet 私聊小窗
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, GLOBAL_STAT_METAS } from '@/lib/store'
import type { StatMeta, GlobalResources, Character, CharacterStats } from '@/lib/store'
import { getAvailableCharacters, getStatLevel } from '@/lib/data'
import { streamChat } from '@/lib/stream'
import type { Message as StreamMessage } from '@/lib/stream'

const P = 'qc'

// ── 好感/友好阶段映射 ────────────────────────────────
const AFFECTION_STAGES = ['陌生', '注意到', '暧昧', '心动', '深情']
const FRIENDSHIP_STAGES = ['点头之交', '熟悉', '好友', '知己']

function getRelationStage(isLead: boolean, value: number): string {
  const stages = isLead ? AFFECTION_STAGES : FRIENDSHIP_STAGES
  const idx = Math.min(Math.floor(value / (100 / stages.length)), stages.length - 1)
  return stages[idx]
}

// ── 数值条组件 ────────────────────────────────────────
function StatBar({ label, value, color, icon, delay = 0 }: {
  label: string; value: number; color: string; icon: string; delay?: number
}) {
  return (
    <div className={`${P}-stat-bar`}>
      <span className={`${P}-stat-label`}>{icon} {label}</span>
      <div className={`${P}-stat-track`}>
        <motion.div
          className={`${P}-stat-fill`}
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, value)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay }}
        />
      </div>
      <span className={`${P}-stat-value`} style={{ color }}>{value}</span>
    </div>
  )
}

// ── 全屏档案卡 ───────────────────────────────────────
function CharacterDossier({ char, stats, onClose }: {
  char: Character; stats: CharacterStats; onClose: () => void
}) {
  const [showPersonality, setShowPersonality] = useState(false)
  const firstMeta = char.statMetas[0]
  const val = firstMeta ? (stats[firstMeta.key] ?? 0) : 0

  return (
    <motion.div
      className={`${P}-dossier-overlay`}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
    >
      {/* 立绘 + 呼吸动画 */}
      <div className={`${P}-dossier-portrait`}>
        <img src={char.portrait} alt={char.name} />
        <div className={`${P}-dossier-gradient`} />
        <button className={`${P}-dossier-close`} onClick={onClose}>✕</button>
      </div>

      {/* 内容区 */}
      <div className={`${P}-dossier-content`}>
        <div className={`${P}-dossier-badge`}>档案</div>
        <h2 className={`${P}-dossier-name`}>{char.name}</h2>
        <div className={`${P}-dossier-title-row`}>
          {char.gender === 'male' ? '♂' : '♀'} {char.age}岁 · {char.title}
        </div>

        {/* 关系阶段 */}
        {firstMeta && (
          <div className={`${P}-dossier-section`}>
            <div className={`${P}-dossier-section-title`}>关系</div>
            <div className={`${P}-dossier-relation`}>
              <span style={{ color: firstMeta.color }}>
                {char.isLead ? '❤️' : '⭐'} {val}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                · {getRelationStage(char.isLead, val)}
              </span>
            </div>
            <StatBar
              label={firstMeta.label}
              value={val}
              color={firstMeta.color}
              icon={firstMeta.icon}
            />
          </div>
        )}

        {/* 数值条（交错动画） */}
        {char.statMetas.length > 1 && (
          <div className={`${P}-dossier-section`}>
            <div className={`${P}-dossier-section-title`}>属性</div>
            {char.statMetas.slice(1).map((meta, i) => (
              <StatBar
                key={meta.key}
                label={meta.label}
                value={stats[meta.key] ?? 0}
                color={meta.color}
                icon={meta.icon}
                delay={i * 0.1}
              />
            ))}
          </div>
        )}

        {/* 描述 */}
        <div className={`${P}-dossier-section`}>
          <div className={`${P}-dossier-section-title`}>简介</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {char.description}
          </p>
        </div>

        {/* 触发点（前6字 + "…"） */}
        <div className={`${P}-dossier-section`}>
          <div className={`${P}-dossier-section-title`}>触发暗示</div>
          {char.triggerPoints.map((t, i) => (
            <div key={i} className={`${P}-dossier-trigger`}>
              {t.slice(0, 6)}…
            </div>
          ))}
        </div>

        {/* 性格（可展开） */}
        <div className={`${P}-dossier-section`}>
          <div className={`${P}-dossier-section-title`}>性格</div>
          <div
            className={`${P}-dossier-personality`}
            onClick={() => setShowPersonality(!showPersonality)}
          >
            {showPersonality ? char.personality : `${char.personality.slice(0, 20)}…`}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── 私聊小窗 ────────────────────────────────────────
interface PChatMsg {
  role: 'user' | 'assistant'
  content: string
}

function PrivateChatSheet({ char, onClose }: {
  char: Character; onClose: () => void
}) {
  const [messages, setMessages] = useState<PChatMsg[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [streaming, setStreaming] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, streaming, scrollToBottom])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || typing) return

    setInput('')
    const newMsg: PChatMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, newMsg])
    setTyping(true)
    setStreaming('')
    abortRef.current = false

    const systemPrompt: StreamMessage = {
      role: 'system',
      content: `你是${char.name}，${char.age}岁，${char.title}。\n性格：${char.personality}\n说话风格：${char.speakingStyle}\n行为模式：${char.behaviorPatterns}\n\n这是一次日常私聊，请以${char.name}的口吻与用户自然对话。\n不涉及游戏剧情推进，不输出数值变化，不给选项。\n回复控制在100-200字以内。`
    }

    const apiMessages: StreamMessage[] = [
      systemPrompt,
      ...([...messages, newMsg].map(m => ({
        role: m.role as StreamMessage['role'],
        content: m.content,
      })))
    ]

    let accumulated = ''

    try {
      await streamChat(
        apiMessages,
        (chunk) => {
          if (abortRef.current) return
          accumulated += chunk
          setStreaming(accumulated)
        },
        () => {
          if (abortRef.current) return
          setMessages(prev => [...prev, { role: 'assistant', content: accumulated }])
          setStreaming('')
          setTyping(false)
        }
      )
    } catch {
      setStreaming('')
      setTyping(false)
      setMessages(prev => [...prev, { role: 'assistant', content: '（网络异常，请稍后再试）' }])
    }
  }

  const handleClose = () => {
    abortRef.current = true
    onClose()
  }

  return (
    <motion.div
      className={`${P}-pchat-overlay`}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
    >
      {/* Header */}
      <div className={`${P}-pchat-header`}>
        <img className={`${P}-pchat-avatar`} src={char.portrait} alt={char.name} />
        <div className={`${P}-pchat-name`}>{char.name}</div>
        <button className={`${P}-pchat-close`} onClick={handleClose}>✕</button>
      </div>

      {/* Messages */}
      <div className={`${P}-pchat-messages`} ref={scrollRef}>
        {messages.length === 0 && !streaming && (
          <div className={`${P}-pchat-hint`}>与{char.name}开始私聊吧~</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`${P}-pchat-bubble ${P}-pchat-${m.role}`}>
            {m.content}
          </div>
        ))}
        {streaming && (
          <div className={`${P}-pchat-bubble ${P}-pchat-assistant`}>
            {streaming}
            <span className={`${P}-pchat-cursor`}>▍</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`${P}-pchat-input-area`}>
        <input
          className={`${P}-pchat-input`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && sendMessage()}
          placeholder="说点什么..."
          disabled={typing}
        />
        <button
          className={`${P}-pchat-send`}
          onClick={sendMessage}
          disabled={typing || !input.trim()}
        >
          发送
        </button>
      </div>
    </motion.div>
  )
}

// ── SVG 关系图常量 ───────────────────────────────────
const W = 380, H = 300, CX = 190, CY = 150, R = 105, NODE_R = 22

const STATIC_RELATIONS: Record<string, string> = {
  guyanche: '声乐导师', shenzheyuan: '舞蹈搭档', zhoumushen: '经纪人',
  linshiyu: '同期', zhaoxiaoman: '同期', chenkeer: '同期', suniannian: '同期',
}

function RelationGraph({ onSelectChar }: {
  onSelectChar: (id: string) => void
}) {
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const currentCharacter = useGameStore((s) => s.currentCharacter)

  const entries = Object.entries(characters)
  const count = entries.length

  return (
    <div className={`${P}-relation-svg`}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto">
        {/* 连接线 */}
        {entries.map(([id], i) => {
          const angle = (2 * Math.PI * i) / count - Math.PI / 2
          const nx = CX + R * Math.cos(angle)
          const ny = CY + R * Math.sin(angle)
          const isSelected = id === currentCharacter
          return (
            <line
              key={`line-${id}`}
              x1={CX} y1={CY} x2={nx} y2={ny}
              stroke={isSelected ? characters[id].themeColor : '#e2e8f0'}
              strokeWidth={isSelected ? 2 : 1}
              strokeDasharray={isSelected ? 'none' : '4 3'}
            />
          )
        })}

        {/* 中点关系标签 */}
        {entries.map(([id, char], i) => {
          const angle = (2 * Math.PI * i) / count - Math.PI / 2
          const mx = CX + (R * 0.55) * Math.cos(angle)
          const my = CY + (R * 0.55) * Math.sin(angle)
          const stats = characterStats[id]
          const firstMeta = char.statMetas[0]
          const val = firstMeta ? (stats?.[firstMeta.key] ?? 0) : 0
          const label = STATIC_RELATIONS[id] ?? ''
          const stage = getRelationStage(char.isLead, val)

          return (
            <g key={`label-${id}`}>
              <rect
                x={mx - 22} y={my - 8} width={44} height={16} rx={4}
                fill="white" stroke="#e2e8f0" strokeWidth={0.5}
              />
              <text
                x={mx} y={my + 3}
                textAnchor="middle" fontSize={8} fill="#64748b"
              >
                {id === currentCharacter ? stage : label}
              </text>
            </g>
          )
        })}

        {/* 中心节点 */}
        <circle cx={CX} cy={CY} r={NODE_R + 4} fill="none" stroke="var(--primary)" strokeWidth={1} opacity={0.3} />
        <circle cx={CX} cy={CY} r={NODE_R} fill="var(--primary)" />
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize={12} fill="white" fontWeight={600}>我</text>

        {/* NPC 节点 */}
        {entries.map(([id, char], i) => {
          const angle = (2 * Math.PI * i) / count - Math.PI / 2
          const nx = CX + R * Math.cos(angle)
          const ny = CY + R * Math.sin(angle)
          const isSelected = id === currentCharacter
          const clipId = `clip-${id}`

          return (
            <g
              key={`node-${id}`}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectChar(id)}
            >
              <defs>
                <clipPath id={clipId}>
                  <circle cx={nx} cy={ny} r={NODE_R} />
                </clipPath>
              </defs>
              <circle
                cx={nx} cy={ny} r={NODE_R + 2}
                fill="none"
                stroke={isSelected ? char.themeColor : '#e2e8f0'}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              <image
                href={char.portrait}
                x={nx - NODE_R} y={ny - NODE_R}
                width={NODE_R * 2} height={NODE_R * 2}
                clipPath={`url(#${clipId})`}
                preserveAspectRatio="xMidYMin slice"
              />
              <text
                x={nx} y={ny + NODE_R + 12}
                textAnchor="middle" fontSize={10} fill="var(--text-secondary)"
              >
                {char.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── 分组标签 ──────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  relation: '🤝 关系',
  status: '📊 状态',
  skill: '⚡ 技能',
}

export default function TabCharacter() {
  const currentDay = useGameStore((s) => s.currentDay)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const globalResources = useGameStore((s) => s.globalResources)
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const [dossierChar, setDossierChar] = useState<string | null>(null)
  const [pchatCharId, setPchatCharId] = useState<string | null>(null)

  const available = getAvailableCharacters(currentDay, characters)
  const char = currentCharacter ? characters[currentCharacter] : null
  const stats = currentCharacter ? characterStats[currentCharacter] : null

  // 按 category 分组 statMetas
  const grouped = char
    ? (['relation', 'status', 'skill'] as const)
        .map((cat) => ({
          category: cat,
          label: CATEGORY_LABELS[cat],
          metas: char.statMetas.filter((m: StatMeta) => m.category === cat),
        }))
        .filter((g) => g.metas.length > 0)
    : []

  // 关系图：按首项数值降序
  const sorted = Object.entries(available).sort(([aId], [bId]) => {
    const aChar = available[aId]
    const bChar = available[bId]
    const aKey = aChar.statMetas[0]?.key
    const bKey = bChar.statMetas[0]?.key
    const aVal = aKey ? (characterStats[aId]?.[aKey] ?? 0) : 0
    const bVal = bKey ? (characterStats[bId]?.[bKey] ?? 0) : 0
    return bVal - aVal
  })

  const dossierCharData = dossierChar ? characters[dossierChar] : null
  const dossierStats = dossierChar ? characterStats[dossierChar] : null

  return (
    <div
      className={`${P}-scrollbar`}
      style={{ height: '100%', overflow: 'auto', padding: 12 }}
    >
      {/* ── 角色立绘 ── */}
      {char ? (
        <div className={`${P}-portrait-hero`}>
          <img
            src={char.portrait}
            alt={char.name}
            loading="lazy"
            style={{ aspectRatio: '9/16', objectFit: 'cover', width: '100%' }}
          />
          <div className={`${P}-scene-hero-overlay`}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{char.name}</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{char.title}</div>
            <div style={{ marginTop: 4 }}>
              {(() => {
                const firstMeta = char.statMetas[0]
                if (!firstMeta) return null
                const val = stats?.[firstMeta.key] ?? 0
                const level = getStatLevel(val)
                return (
                  <span style={{
                    fontSize: 11, background: 'rgba(139, 92, 246, 0.15)',
                    padding: '2px 8px', borderRadius: 8, color: level.color,
                  }}>
                    {level.name}
                  </span>
                )
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div className={`${P}-placeholder`} style={{ marginBottom: 16 }}>
          <span className={`${P}-placeholder-icon`}>👤</span>
          <span style={{ fontSize: 14 }}>选择一个角色开始互动</span>
        </div>
      )}

      {/* ── 玩家属性面板 ── */}
      <div className={`${P}-card`} style={{ padding: 16, marginBottom: 16 }}>
        <div className={`${P}-stat-group-title`}>⭐ 我的属性</div>
        {GLOBAL_STAT_METAS.map((meta) => (
          <StatBar
            key={meta.key}
            label={meta.label}
            value={globalResources[meta.key as keyof GlobalResources]}
            color={meta.color}
            icon={meta.icon}
          />
        ))}
      </div>

      {/* ── 选中角色数值条 ── */}
      {char && stats && grouped.length > 0 && (
        <div className={`${P}-card`} style={{ padding: 16, marginBottom: 16 }}>
          {grouped.map((group) => (
            <div key={group.category} className={`${P}-stat-group`}>
              <div className={`${P}-stat-group-title`}>{group.label}</div>
              {group.metas.map((meta: StatMeta) => (
                <StatBar
                  key={meta.key}
                  label={meta.label}
                  value={stats[meta.key] ?? 0}
                  color={meta.color}
                  icon={meta.icon}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── 角色简介 ── */}
      {char && (
        <div className={`${P}-card`} style={{ padding: 16, marginBottom: 16 }}>
          <div className={`${P}-stat-group-title`}>📝 简介</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {char.description}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            {char.gender === 'male' ? '♂' : '♀'} {char.age}岁 · {char.personality.split('|')[0].trim()}
          </p>
        </div>
      )}

      {/* ── SVG 关系图 ── */}
      <h4 style={{
        fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
        marginBottom: 8, paddingLeft: 4,
      }}>
        💕 角色关系
      </h4>
      <RelationGraph
        onSelectChar={(id) => {
          selectCharacter(id)
          setDossierChar(id)
        }}
      />

      {/* ── 关系列表（真实头像） ── */}
      <div className={`${P}-relation-graph`}>
        {sorted.map(([id, c]) => {
          const cStats = characterStats[id]
          const firstMeta = c.statMetas[0]
          const val = firstMeta ? (cStats?.[firstMeta.key] ?? 0) : 0

          return (
            <button
              key={id}
              className={`${P}-char-tag ${currentCharacter === id ? `${P}-char-selected` : ''}`}
              onClick={() => {
                selectCharacter(id)
                setDossierChar(id)
              }}
            >
              <img
                className={`${P}-char-avatar`}
                src={c.portrait}
                alt={c.name}
              />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {c.name}
                  {c.isLead && (
                    <span style={{
                      fontSize: 10, color: 'var(--primary)',
                      background: 'var(--primary-light)',
                      padding: '1px 6px', borderRadius: 6, marginLeft: 6,
                    }}>
                      攻略
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {c.title}
                </div>
              </div>
              {firstMeta && (
                <span style={{ fontSize: 13, color: firstMeta.color, fontWeight: 600 }}>
                  {firstMeta.icon}{val}
                </span>
              )}
              <span
                className={`${P}-pchat-trigger`}
                onClick={(e) => {
                  e.stopPropagation()
                  setPchatCharId(id)
                }}
              >
                💬
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ height: 16 }} />

      {/* ── 全屏档案 ── */}
      <AnimatePresence>
        {dossierCharData && dossierStats && (
          <CharacterDossier
            char={dossierCharData}
            stats={dossierStats}
            onClose={() => setDossierChar(null)}
          />
        )}
      </AnimatePresence>

      {/* ── 私聊小窗 ── */}
      <AnimatePresence>
        {pchatCharId && characters[pchatCharId] && (
          <PrivateChatSheet
            key={pchatCharId}
            char={characters[pchatCharId]}
            onClose={() => setPchatCharId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
