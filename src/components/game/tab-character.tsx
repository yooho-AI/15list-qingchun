/**
 * [INPUT]: 依赖 store.ts 状态（角色/数值），data.ts 角色/工具函数
 * [OUTPUT]: 对外提供 TabCharacter 组件
 * [POS]: 人物 Tab：立绘(9:16) + 数值条(category分组) + 关系列表(真实头像) + CharacterDossier 全屏档案
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, GLOBAL_STAT_METAS } from '@/lib/store'
import type { StatMeta, GlobalResources, Character, CharacterStats } from '@/lib/store'
import { getAvailableCharacters, getStatLevel } from '@/lib/data'

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
                    fontSize: 11, background: 'rgba(255,255,255,0.2)',
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

      {/* ── 关系总览（真实头像） ── */}
      <h4 style={{
        fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
        marginBottom: 8, paddingLeft: 4,
      }}>
        💕 角色关系
      </h4>
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
    </div>
  )
}
