/**
 * [INPUT]: 依赖 store.ts 状态（角色/数值），data.ts 角色类型
 * [OUTPUT]: 对外提供 TabCharacter 组件
 * [POS]: 人物 Tab：立绘(9:16) + 数值条(category分组) + 关系图 + 角色列表
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { motion } from 'framer-motion'
import { useGameStore, GLOBAL_STAT_METAS } from '@/lib/store'
import type { StatMeta, GlobalResources } from '@/lib/store'
import { getAvailableCharacters, getStatLevel } from '@/lib/data'

const P = 'qc'

// ── 数值条组件 ────────────────────────────────────────
function StatBar({ label, value, color, icon }: {
  label: string; value: number; color: string; icon: string
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
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className={`${P}-stat-value`} style={{ color }}>{value}</span>
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

      {/* ── 关系总览 ── */}
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
              onClick={() => selectCharacter(id)}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: `linear-gradient(135deg, ${c.themeColor}22, ${c.themeColor}44)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, border: `2px solid ${c.themeColor}33`,
                flexShrink: 0,
              }}>
                {c.name[0]}
              </div>
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
    </div>
  )
}
