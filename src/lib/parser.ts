/**
 * [INPUT]: 无外部依赖（避免循环引用，颜色硬编码）
 * [OUTPUT]: 对外提供 parseStoryParagraph 函数
 * [POS]: lib 的文本解析模块，被 tab-dialogue.tsx 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ── 角色配色（硬编码，不 import data.ts） ────────────
const CHARACTER_COLORS: Record<string, string> = {
  '顾言澈': '#6366f1',
  '言澈': '#6366f1',
  '沈哲远': '#ef4444',
  '哲远': '#ef4444',
  '周慕深': '#0ea5e9',
  '慕深': '#0ea5e9',
  '林诗雨': '#a855f7',
  '诗雨': '#a855f7',
  '赵小曼': '#f97316',
  '小曼': '#f97316',
  '陈可儿': '#ec4899',
  '可儿': '#ec4899',
  '苏念念': '#10b981',
  '念念': '#10b981',
}

// ── 数值配色 ─────────────────────────────────────────
const STAT_COLORS: Record<string, string> = {
  '好感': '#ef4444', '好感度': '#ef4444',
  '友好': '#ec4899', '友好度': '#ec4899',
  'Vocal': '#e91e8c', 'vocal': '#e91e8c', '唱功': '#e91e8c',
  'Dance': '#f97316', 'dance': '#f97316', '舞蹈': '#f97316',
  '颜值': '#ec4899', '气质': '#ec4899', '颜值气质': '#ec4899',
  '粉丝': '#6366f1', '粉丝影响力': '#6366f1', '人气': '#6366f1',
  '心理': '#10b981', '心理承受力': '#10b981', '精神': '#10b981',
}

const DEFAULT_COLOR = '#ff4d8d'

// ── HTML 转义 ────────────────────────────────────────
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── 内联内容着色 ─────────────────────────────────────
function parseInlineContent(text: string): string {
  let result = escapeHtml(text)
  for (const [name, color] of Object.entries(CHARACTER_COLORS)) {
    result = result.replaceAll(
      name,
      `<span class="char-name" style="color:${color};font-weight:600">${name}</span>`
    )
  }
  return result
}

// ── 数值行着色 ────────────────────────────────────────
function colorizeStats(line: string): string {
  return line.replace(/([^\s【】]+?)([+-]\d+)/g, (_, label: string, delta: string) => {
    const color = STAT_COLORS[label] || DEFAULT_COLOR
    const cls = delta.startsWith('+') ? 'stat-up' : 'stat-down'
    return `<span class="stat-change ${cls}" style="color:${color}">${label}${delta}</span>`
  })
}

// ── 主解析函数 ────────────────────────────────────────
export function parseStoryParagraph(content: string): {
  narrative: string
  statHtml: string
} {
  const lines = content.split('\n').filter(Boolean)
  const narrativeParts: string[] = []
  const statParts: string[] = []

  for (const raw of lines) {
    const line = raw.trim()

    // 纯数值变化行
    if (/^[【\[][^】\]]*[+-]\d+[^】\]]*[】\]]/.test(line) && !line.includes('】"')) {
      statParts.push(colorizeStats(line))
      continue
    }

    // 角色对话
    const charMatch = line.match(/^【([^】]+)】(.*)/)
    if (charMatch) {
      const [, charName, dialogue] = charMatch
      const color = CHARACTER_COLORS[charName] || DEFAULT_COLOR
      narrativeParts.push(
        `<p class="dialogue-line"><span class="char-name" style="color:${color}">【${charName}】</span>${parseInlineContent(dialogue)}</p>`
      )
      continue
    }

    // 动作/旁白
    if (/^[（(]/.test(line) || /^\*[^*]+\*/.test(line)) {
      narrativeParts.push(`<p class="action">${parseInlineContent(line)}</p>`)
      continue
    }

    // 普通叙述
    narrativeParts.push(`<p class="narration">${parseInlineContent(line)}</p>`)
  }

  return {
    narrative: narrativeParts.join(''),
    statHtml: statParts.length > 0
      ? `<div class="stat-changes">${statParts.join('')}</div>`
      : '',
  }
}
