/**
 * [INPUT]: 依赖 zustand/immer 状态管理，stream.ts SSE 通信，data.ts 全部类型和常量，script.md 剧本原文
 * [OUTPUT]: 对外提供 useGameStore hook，re-export data.ts 全部导出
 * [POS]: lib 的状态中枢，被所有组件消费。剧本直通管道的终点。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { streamChat, chat } from './stream'
import type { Message } from './stream'
import {
  type Character, type CharacterStats, type GlobalResources,
  PERIODS, MAX_EPISODES, MAX_ACTION_POINTS,
  SCENES, ITEMS, STORY_INFO, GLOBAL_STAT_METAS,
  buildCharacters, getCurrentChapter, getDayEvents,
} from './data'
import {
  trackTimeAdvance, trackChapterEnter, trackEndingReached,
  trackMentalCrisis, trackSceneUnlock,
} from './analytics'
import GAME_SCRIPT from './script.md?raw'

// ── 常量 ─────────────────────────────────────────────
const SAVE_KEY = 'qingchun-save-v1'
let messageCounter = 0
const makeId = () => `msg-${Date.now()}-${++messageCounter}`

// ── 全局资源别名（parser 双轨用） ────────────────────
const GLOBAL_ALIASES: Record<string, keyof GlobalResources> = {
  'Vocal': 'vocal', 'vocal': 'vocal', '唱功': 'vocal',
  'Dance': 'dance', 'dance': 'dance', '舞蹈': 'dance',
  '颜值': 'charm', '气质': 'charm', '颜值气质': 'charm',
  '粉丝': 'fans', '粉丝影响力': 'fans', '人气': 'fans',
  '心理': 'mental', '心理承受力': 'mental', '精神': 'mental',
}

// ── 接口 ─────────────────────────────────────────────
interface GameState {
  gameStarted: boolean
  playerName: string
  characters: Record<string, Character>

  currentDay: number
  currentPeriodIndex: number
  actionPoints: number

  currentScene: string
  currentCharacter: string | null
  characterStats: Record<string, CharacterStats>
  unlockedScenes: string[]

  globalResources: GlobalResources

  currentChapter: number
  triggeredEvents: string[]
  inventory: Record<string, number>

  messages: Array<import('./data').Message>
  historySummary: string
  isTyping: boolean
  streamingContent: string

  endingType: string | null
  activeTab: 'dialogue' | 'scene' | 'character'
}

interface GameActions {
  setPlayerInfo: (name: string) => void
  initGame: () => void
  selectCharacter: (charId: string) => void
  selectScene: (sceneId: string) => void
  setActiveTab: (tab: 'dialogue' | 'scene' | 'character') => void
  sendMessage: (text: string) => Promise<void>
  advanceTime: () => void
  useItem: (itemId: string) => void
  checkEnding: () => void
  addSystemMessage: (content: string) => void
  resetGame: () => void
  saveGame: () => void
  loadGame: () => void
  hasSave: () => boolean
  clearSave: () => void
}

type GameStore = GameState & GameActions

// ── 数值解析（双轨） ─────────────────────────────────
interface StatChangeResult {
  charChanges: Array<{ charId: string; stat: string; delta: number }>
  globalChanges: Array<{ key: keyof GlobalResources; delta: number }>
}

function parseStatChanges(
  content: string,
  characters: Record<string, Character>
): StatChangeResult {
  const charChanges: StatChangeResult['charChanges'] = []
  const globalChanges: StatChangeResult['globalChanges'] = []

  const nameToId: Record<string, string> = {}
  for (const [id, char] of Object.entries(characters)) {
    nameToId[char.name] = id
  }

  const labelToKey: Record<string, Array<{ charId: string; key: string }>> = {}
  for (const [charId, char] of Object.entries(characters)) {
    for (const meta of char.statMetas) {
      const labels = [meta.label, meta.label + '度', meta.label + '值']
      for (const label of labels) {
        if (!labelToKey[label]) labelToKey[label] = []
        labelToKey[label].push({ charId, key: meta.key })
      }
    }
  }

  const regex = /[【\[]([^\]】]+?)\s+(\S+?)([+-])(\d+)[】\]]/g
  let match
  while ((match = regex.exec(content))) {
    const [, context, statLabel, sign, numStr] = match
    const delta = parseInt(numStr) * (sign === '+' ? 1 : -1)

    const charId = nameToId[context]
    if (charId) {
      const entries = labelToKey[statLabel]
      const entry = entries?.find((e) => e.charId === charId) || entries?.[0]
      if (entry) {
        charChanges.push({ charId: entry.charId, stat: entry.key, delta })
      }
    }
  }

  // 全局属性变化：【Vocal+10】【心理-5】
  const globalRegex = /[【\[](\S+?)([+-])(\d+)[】\]]/g
  let gMatch
  while ((gMatch = globalRegex.exec(content))) {
    const [, label, sign, numStr] = gMatch
    const delta = parseInt(numStr) * (sign === '+' ? 1 : -1)
    const globalKey = GLOBAL_ALIASES[label]
    if (globalKey) {
      globalChanges.push({ key: globalKey, delta })
    }
  }

  return { charChanges, globalChanges }
}

// ── 系统提示词（剧本直通管道） ───────────────────────
function buildStatsSnapshot(state: GameState): string {
  const globalLines = GLOBAL_STAT_METAS
    .map((m) => `  ${m.icon} ${m.label}: ${state.globalResources[m.key as keyof GlobalResources]}/100`)
    .join('\n')

  const charLines = Object.entries(state.characterStats)
    .map(([charId, stats]) => {
      const char = state.characters[charId]
      if (!char) return ''
      const lines = char.statMetas
        .map((m) => `  ${m.icon} ${m.label}: ${stats[m.key] ?? 0}/100`)
        .join('\n')
      return `${char.name}:\n${lines}`
    })
    .filter(Boolean)
    .join('\n')

  return `玩家属性:\n${globalLines}\n\n角色关系:\n${charLines}`
}

function buildSystemPrompt(state: GameState): string {
  const chapter = getCurrentChapter(state.currentDay)

  return `你是《${STORY_INFO.title}》的AI叙述者。

## 游戏剧本
${GAME_SCRIPT}

## 当前状态
玩家「${state.playerName}」（女）
第${state.currentDay}期 · ${PERIODS[state.currentPeriodIndex].name}
第${chapter.id}章「${chapter.name}」
当前场景：${SCENES[state.currentScene]?.name ?? '练习室'}
${state.currentCharacter ? `当前互动角色：${state.characters[state.currentCharacter]?.name}` : ''}

## 当前数值
${buildStatsSnapshot(state)}

## 输出格式
- 每段回复 200-400 字
- 角色对话：【角色名】"对话内容"
- 动作描写：（动作或旁白描述）
- 数值变化：【角色名 数值+N】或【数值-N】（全局属性如 Vocal/Dance/颜值/粉丝/心理）`
}

// ── Store ────────────────────────────────────────────
export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    // ── 初始状态 ──
    gameStarted: false,
    playerName: '',
    characters: {},

    currentDay: 1,
    currentPeriodIndex: 0,
    actionPoints: MAX_ACTION_POINTS,

    currentScene: 'practice',
    currentCharacter: null,
    characterStats: {},
    unlockedScenes: ['practice', 'backstage', 'dormitory'],

    globalResources: { vocal: 30, dance: 25, charm: 40, fans: 5, mental: 70 },

    currentChapter: 1,
    triggeredEvents: [],
    inventory: { 'lucky-charm': 1 },

    messages: [],
    historySummary: '',
    isTyping: false,
    streamingContent: '',

    endingType: null,
    activeTab: 'dialogue',

    // ── Actions ──
    setPlayerInfo: (name: string) => {
      set((s) => { s.playerName = name })
    },

    initGame: () => {
      const characters = buildCharacters()
      const characterStats: Record<string, CharacterStats> = {}
      for (const [id, char] of Object.entries(characters)) {
        characterStats[id] = { ...char.initialStats }
      }

      set((s) => {
        s.gameStarted = true
        s.characters = characters
        s.characterStats = characterStats
        s.currentDay = 1
        s.currentPeriodIndex = 0
        s.actionPoints = MAX_ACTION_POINTS
        s.currentScene = 'practice'
        s.currentCharacter = null
        s.unlockedScenes = ['practice', 'backstage', 'dormitory']
        s.globalResources = { vocal: 30, dance: 25, charm: 40, fans: 5, mental: 70 }
        s.currentChapter = 1
        s.triggeredEvents = []
        s.inventory = { 'lucky-charm': 1 }
        s.messages = []
        s.historySummary = ''
        s.endingType = null
        s.activeTab = 'dialogue'
      })

      get().addSystemMessage(
        `⭐ 欢迎来到《${STORY_INFO.title}》！你是一名怀揣明星梦的少女，即将进入天星传媒开始练习生之旅。\n\n📍 当前：第1期 · 练习室\n🎯 目标：在12期内证明自己，争取出道位！`
      )
    },

    selectCharacter: (charId: string) => {
      set((s) => { s.currentCharacter = charId })
    },

    selectScene: (sceneId: string) => {
      const state = get()
      if (!state.unlockedScenes.includes(sceneId)) return
      const prevScene = state.currentScene
      if (prevScene === sceneId) return

      set((s) => {
        s.currentScene = sceneId
        // 富消息：场景转场卡
        s.messages.push({
          id: makeId(), role: 'system', content: '',
          timestamp: Date.now(),
          type: 'scene-transition', sceneId,
        })
        s.activeTab = 'dialogue'
      })

      // 首次解锁追踪
      if (!state.unlockedScenes.includes(sceneId)) {
        trackSceneUnlock(sceneId)
      }
    },

    setActiveTab: (tab) => {
      set((s) => { s.activeTab = tab })
    },

    sendMessage: async (text: string) => {
      set((s) => {
        s.messages.push({
          id: makeId(), role: 'user', content: text, timestamp: Date.now(),
        })
        s.isTyping = true
        s.streamingContent = ''
      })

      try {
        const state = get()
        if (state.messages.length > 15 && !state.historySummary) {
          const summary = await chat([
            { role: 'system', content: '将以下对话压缩为200字以内的摘要，保留关键剧情和数值变化：' },
            ...state.messages.slice(0, -5).map((m) => ({
              role: m.role as Message['role'], content: m.content,
            })),
          ])
          set((s) => { s.historySummary = summary })
        }

        const systemPrompt = buildSystemPrompt(get())
        const apiMessages: Message[] = [
          { role: 'system', content: systemPrompt },
          ...(get().historySummary
            ? [{ role: 'system' as const, content: `历史摘要: ${get().historySummary}` }]
            : []),
          ...get().messages.slice(-10).map((m) => ({
            role: m.role as Message['role'], content: m.content,
          })),
        ]

        let fullContent = ''
        await streamChat(
          apiMessages,
          (chunk) => {
            fullContent += chunk
            set((s) => { s.streamingContent = fullContent })
          },
          () => {},
        )

        if (!fullContent) {
          const char = get().currentCharacter
            ? get().characters[get().currentCharacter!]
            : null
          fullContent = char
            ? `【${char.name}】"嗯...你刚才说什么？"（${char.name}看着你，似乎在等你再说一遍。）`
            : '（练习室里传来节拍器的嗒嗒声，空气中弥漫着汗水的味道。你该做些什么呢？）'
        }

        const { charChanges, globalChanges } = parseStatChanges(fullContent, get().characters)
        set((s) => {
          for (const c of charChanges) {
            const stats = s.characterStats[c.charId]
            if (stats) {
              stats[c.stat] = Math.max(0, Math.min(100, (stats[c.stat] ?? 0) + c.delta))
            }
          }
          for (const g of globalChanges) {
            s.globalResources[g.key] = Math.max(0, Math.min(100, s.globalResources[g.key] + g.delta))
          }
        })

        set((s) => {
          s.messages.push({
            id: makeId(), role: 'assistant', content: fullContent,
            character: s.currentCharacter ?? undefined, timestamp: Date.now(),
          })
          s.isTyping = false
          s.streamingContent = ''
        })

        get().advanceTime()
        get().saveGame()
      } catch {
        set((s) => { s.isTyping = false; s.streamingContent = '' })
        get().addSystemMessage('网络连接异常，请重试。')
      }
    },

    advanceTime: () => {
      let dayChanged = false
      set((s) => {
        s.actionPoints -= 1
        s.currentPeriodIndex += 1

        if (s.currentPeriodIndex >= PERIODS.length) {
          s.currentPeriodIndex = 0
          s.currentDay += 1
          s.actionPoints = MAX_ACTION_POINTS
          dayChanged = true

          // 心理自然消耗
          s.globalResources.mental = Math.max(0, s.globalResources.mental - 3)

          // 章节推进
          const newChapter = getCurrentChapter(s.currentDay)
          if (newChapter.id !== s.currentChapter) {
            s.currentChapter = newChapter.id
            trackChapterEnter(newChapter.id)
          }

          // 场景解锁
          if (s.currentDay >= 4 && !s.unlockedScenes.includes('stage')) {
            s.unlockedScenes.push('stage')
            trackSceneUnlock('stage')
          }
        }
      })

      const state = get()
      trackTimeAdvance(state.currentDay, PERIODS[state.currentPeriodIndex].name)

      // 换期：富消息替代系统消息
      if (dayChanged) {
        const chapter = getCurrentChapter(state.currentDay)
        set((s) => {
          s.messages.push({
            id: makeId(), role: 'system', content: '',
            timestamp: Date.now(),
            type: 'episode-change',
            episodeInfo: { episode: state.currentDay, chapter: chapter.name },
          })
        })
      } else {
        get().addSystemMessage(
          `⏰ 第${state.currentDay}期 · ${PERIODS[state.currentPeriodIndex].name}`
        )
      }

      // 强制事件
      const events = getDayEvents(state.currentDay, state.triggeredEvents)
      for (const event of events) {
        if (event.triggerPeriod === undefined || event.triggerPeriod === state.currentPeriodIndex) {
          set((s) => { s.triggeredEvents.push(event.id) })
          get().addSystemMessage(`🎬 【${event.name}】${event.description}`)
        }
      }

      // BE 检查：心理崩溃
      if (state.globalResources.mental <= 20) {
        trackMentalCrisis(state.globalResources.mental)
        const avgSkill = (state.globalResources.vocal + state.globalResources.dance + state.globalResources.charm) / 3
        if (avgSkill < 40) {
          set((s) => { s.endingType = 'be-quit' })
          return
        }
      }

      // 最终结局
      if (state.currentDay >= MAX_EPISODES && state.currentPeriodIndex === PERIODS.length - 1) {
        get().checkEnding()
      }
    },

    useItem: (itemId: string) => {
      const state = get()
      const count = state.inventory[itemId] ?? 0
      const item = ITEMS.find((i) => i.id === itemId)
      if (!item || count <= 0) return

      if (item.type === 'consumable') {
        set((s) => { s.inventory[itemId] = count - 1 })
      }

      set((s) => {
        switch (itemId) {
          case 'energy-drink':
            s.globalResources.mental = Math.min(100, s.globalResources.mental + 15)
            break
          case 'vocal-notes':
            s.globalResources.vocal = Math.min(100, s.globalResources.vocal + 10)
            break
          case 'dance-video':
            s.globalResources.dance = Math.min(100, s.globalResources.dance + 8)
            break
          case 'skincare-set':
            s.globalResources.charm = Math.min(100, s.globalResources.charm + 8)
            break
          case 'fan-letter':
            s.globalResources.mental = Math.min(100, s.globalResources.mental + 10)
            s.globalResources.fans = Math.min(100, s.globalResources.fans + 3)
            break
        }
      })

      get().addSystemMessage(`🎁 使用了「${item.icon} ${item.name}」！`)
    },

    checkEnding: () => {
      const s = get()
      const { vocal, dance, charm, fans, mental } = s.globalResources
      const avgSkill = (vocal + dance + charm) / 3

      const setEnding = (id: string) => {
        set((st) => { st.endingType = id })
        trackEndingReached(id)
      }

      // BE
      if (mental <= 20) {
        setEnding('be-quit')
        return
      }
      if (avgSkill < 40) {
        setEnding('be-eliminated')
        return
      }

      // TE: 全能ACE
      const maxAffection = Math.max(
        ...Object.entries(s.characterStats)
          .filter(([id]) => s.characters[id]?.isLead)
          .map(([, stats]) => stats.affection ?? 0)
      )
      if (vocal >= 75 && dance >= 75 && charm >= 75 && fans >= 80 && mental >= 60 && maxAffection >= 80) {
        setEnding('te-ace')
        return
      }

      // TE: 不忘初心（简化判定：所有女练习生友好≥70）
      const traineeFriendships = Object.entries(s.characterStats)
        .filter(([id]) => !s.characters[id]?.isLead)
        .map(([, stats]) => stats.friendship ?? 0)
      if (traineeFriendships.length > 0 && traineeFriendships.every((f) => f >= 70) && avgSkill >= 60) {
        setEnding('te-pure')
        return
      }

      // HE: Solo新星
      if ((vocal >= 85 || dance >= 85) && fans < 50) {
        setEnding('he-solo')
        return
      }

      // HE: 梦想成真
      if (fans >= 60 && avgSkill >= 55 && mental >= 50) {
        setEnding('he-debut')
        return
      }

      // NE: 黑红出道
      if (fans >= 70 && mental < 40) {
        setEnding('ne-blackred')
        return
      }

      // NE: 意难平
      setEnding('ne-close')
    },

    addSystemMessage: (content: string) => {
      set((s) => {
        s.messages.push({
          id: makeId(), role: 'system', content, timestamp: Date.now(),
        })
      })
    },

    resetGame: () => {
      set((s) => {
        s.gameStarted = false
        s.playerName = ''
        s.characters = {}
        s.characterStats = {}
        s.messages = []
        s.historySummary = ''
        s.endingType = null
        s.currentDay = 1
        s.currentPeriodIndex = 0
        s.activeTab = 'dialogue'
        s.globalResources = { vocal: 30, dance: 25, charm: 40, fans: 5, mental: 70 }
        s.inventory = { 'lucky-charm': 1 }
        s.triggeredEvents = []
      })
    },

    saveGame: () => {
      const s = get()
      const data = {
        version: 1,
        playerName: s.playerName,
        characters: s.characters,
        currentDay: s.currentDay,
        currentPeriodIndex: s.currentPeriodIndex,
        actionPoints: s.actionPoints,
        currentScene: s.currentScene,
        currentCharacter: s.currentCharacter,
        characterStats: s.characterStats,
        currentChapter: s.currentChapter,
        triggeredEvents: s.triggeredEvents,
        unlockedScenes: s.unlockedScenes,
        globalResources: s.globalResources,
        inventory: s.inventory,
        messages: s.messages.slice(-30),
        historySummary: s.historySummary,
        endingType: s.endingType,
        activeTab: s.activeTab,
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    },

    loadGame: () => {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return
      try {
        const data = JSON.parse(raw)
        if (data.version !== 1) return
        set((s) => {
          s.gameStarted = true
          s.playerName = data.playerName
          s.characters = data.characters
          s.currentDay = data.currentDay
          s.currentPeriodIndex = data.currentPeriodIndex
          s.actionPoints = data.actionPoints
          s.currentScene = data.currentScene
          s.currentCharacter = data.currentCharacter
          s.characterStats = data.characterStats
          s.currentChapter = data.currentChapter
          s.triggeredEvents = data.triggeredEvents
          s.unlockedScenes = data.unlockedScenes
          s.globalResources = data.globalResources
          s.inventory = data.inventory
          s.messages = data.messages
          s.historySummary = data.historySummary
          s.endingType = data.endingType
          s.activeTab = data.activeTab ?? 'dialogue'
        })
      } catch { /* 损坏的存档忽略 */ }
    },

    hasSave: () => {
      return localStorage.getItem(SAVE_KEY) !== null
    },

    clearSave: () => {
      localStorage.removeItem(SAVE_KEY)
    },
  }))
)

// ── Re-export data.ts ────────────────────────────────
export {
  SCENES, ITEMS, PERIODS, CHAPTERS,
  MAX_EPISODES, MAX_ACTION_POINTS,
  STORY_INFO, FORCED_EVENTS, ENDINGS,
  QUICK_ACTIONS, GLOBAL_STAT_METAS,
  buildCharacters, getStatLevel,
  getAvailableCharacters, getCurrentChapter,
} from '@/lib/data'

export type {
  Character, CharacterStats, Scene, GameItem, Chapter,
  ForcedEvent, Ending, TimePeriod, StatMeta, GlobalResources,
  Message,
} from '@/lib/data'
