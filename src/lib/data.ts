/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供全部类型定义 + 常量 + 7 NPC + 4 场景 + 6 道具 + 3 章节 + 5 事件 + 7 结局
 * [POS]: lib 的 UI 薄层数据定义，被 store.ts 消费并 re-export，被所有组件间接引用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ── 时段系统（3时段 × 12期 = 36 时间槽） ──────────────────
export interface TimePeriod {
  index: number
  name: string
  icon: string
  hours: string
}

export const PERIODS: TimePeriod[] = [
  { index: 0, name: '早晨', icon: '🌅', hours: '06:00-12:00' },
  { index: 1, name: '中午', icon: '☀️', hours: '12:00-18:00' },
  { index: 2, name: '晚上', icon: '🌙', hours: '18:00-24:00' },
]

export const MAX_EPISODES = 12
export const MAX_ACTION_POINTS = 3

// ── 消息 ──────────────────────────────────────────────
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  character?: string
  timestamp: number
}

// ── 数值元数据 ────────────────────────────────────────
export interface StatMeta {
  key: string
  label: string
  color: string
  icon: string
  category?: 'relation' | 'status' | 'skill'
}

export type CharacterStats = Record<string, number>

// ── 角色 ──────────────────────────────────────────────
export interface Character {
  id: string
  name: string
  portrait: string
  gender: 'female' | 'male'
  age: number
  title: string
  description: string
  personality: string
  speakingStyle: string
  secret: string
  triggerPoints: string[]
  behaviorPatterns: string
  themeColor: string
  joinEpisode: number
  isLead: boolean
  statMetas: StatMeta[]
  initialStats: CharacterStats
}

// ── 场景 ──────────────────────────────────────────────
export interface Scene {
  id: string
  name: string
  icon: string
  description: string
  background: string
  atmosphere: string
  tags: string[]
  unlockCondition?: { episode?: number }
}

// ── 道具 ──────────────────────────────────────────────
export interface GameItem {
  id: string
  name: string
  icon: string
  type: 'consumable' | 'collectible' | 'social'
  description: string
  maxCount?: number
}

// ── 章节 ──────────────────────────────────────────────
export interface Chapter {
  id: number
  name: string
  dayRange: [number, number]
  description: string
  objectives: string[]
  atmosphere: string
}

// ── 强制事件 ──────────────────────────────────────────
export interface ForcedEvent {
  id: string
  name: string
  triggerDay: number
  triggerPeriod?: number
  description: string
}

// ── 结局 ──────────────────────────────────────────────
export interface Ending {
  id: string
  name: string
  type: 'TE' | 'HE' | 'NE' | 'BE'
  description: string
  condition: string
}

// ── 全局资源 ──────────────────────────────────────────
export interface GlobalResources {
  vocal: number
  dance: number
  charm: number
  fans: number
  mental: number
}

// ── 男主攻略对象 StatMeta ────────────────────────────
const LEAD_STAT_META: StatMeta[] = [
  { key: 'affection', label: '好感', color: '#ef4444', icon: '❤️', category: 'relation' },
]

// ── 女练习生 StatMeta ────────────────────────────────
const TRAINEE_STAT_META: StatMeta[] = [
  { key: 'friendship', label: '友好', color: '#ec4899', icon: '🤝', category: 'relation' },
]

// ── 角色定义 ─────────────────────────────────────────

const GU_YANCHE: Character = {
  id: 'guyanche',
  name: '顾言澈',
  portrait: '/characters/guyanche.jpg',
  gender: 'male',
  age: 28,
  title: '顶流男明星',
  description: '天星传媒天王级艺人，高冷清俊的大师兄。十年浮沉让他对真心格外珍视。',
  personality: '高冷克制 | 内心温柔 + 极度怕被利用 + 保护欲强',
  speakingStyle: '简短克制，偶尔说出让人心跳的话时语气反而更淡',
  secret: '对娱乐圈极度疲惫，想退圈但合约未到期',
  triggerPoints: ['看到你独自加练', '你主动请教歌唱技巧', '你在舆论中保持真实'],
  behaviorPatterns: '好感<20冷淡疏离，20-40暗中关注，40-60主动接近，60-80情感萌动，80+深度羁绊',
  themeColor: '#6366f1',
  joinEpisode: 1,
  isLead: true,
  statMetas: LEAD_STAT_META,
  initialStats: { affection: 10 },
}

const SHEN_ZHEYUAN: Character = {
  id: 'shenzheyuan',
  name: '沈哲远',
  portrait: '/characters/shenzheyuan.jpg',
  gender: 'male',
  age: 26,
  title: '舞蹈导师',
  description: '《青春练习生》主舞蹈导师，前国家级舞蹈队员。严格专业，把未完成的梦想倾注在学员身上。',
  personality: '严厉专业 | 外冷内热 + 完美主义 + 因伤退役的遗憾',
  speakingStyle: '教学时精准命令式，私下话少且温柔',
  secret: '右膝旧伤未完全痊愈，深夜偷偷做复健',
  triggerPoints: ['你在舞蹈上展现进步', '你受伤仍坚持', '你理解他严格背后的用心'],
  behaviorPatterns: '好感<20公事公办，20-40额外关注，40-60私下温柔，60-80情感挣扎，80+突破师生界限',
  themeColor: '#ef4444',
  joinEpisode: 4,
  isLead: true,
  statMetas: LEAD_STAT_META,
  initialStats: { affection: 15 },
}

const ZHOU_MUSHEN: Character = {
  id: 'zhoumushen',
  name: '周慕深',
  portrait: '/characters/zhoumushen.jpg',
  gender: 'male',
  age: 32,
  title: '王牌经纪人',
  description: '天星传媒金牌经纪人，眼光毒辣手段过人。白手起家，捧红无数艺人。',
  personality: '精明算计 | 利益至上 + 珍惜真正有潜力的人 + 疲惫的孤独',
  speakingStyle: '游刃有余，喜欢用商业术语包装真心话',
  secret: '左手银戒是送给已去世初恋的，从未摘下',
  triggerPoints: ['你展现超越年龄的成熟', '你在逆境中不放弃', '你拒绝走捷径'],
  behaviorPatterns: '好感<20无视，20-40商业评估，40-60资源倾斜，60-80保护欲，80+为你打破规则',
  themeColor: '#0ea5e9',
  joinEpisode: 1,
  isLead: true,
  statMetas: LEAD_STAT_META,
  initialStats: { affection: 20 },
}

const LIN_SHIYU: Character = {
  id: 'linshiyu',
  name: '林诗雨',
  portrait: '/characters/linshiyu.jpg',
  gender: 'female',
  age: 19,
  title: '天赋型·室友',
  description: '音乐世家出身的天才少女，嗓音天生动听。单纯有天赋但从未经历真正挫折。',
  personality: '单纯开朗 | 有天赋 + 容易骄傲 + 本质善良',
  speakingStyle: '活泼爱用语气词，"哎呀""真的假的！"',
  secret: '最怕别人说她靠家庭背景',
  triggerPoints: ['你真诚赞美她的歌声', '你在她被质疑时帮她说话'],
  behaviorPatterns: '友好>50毫不犹豫帮你，<30疏远敏感',
  themeColor: '#a855f7',
  joinEpisode: 1,
  isLead: false,
  statMetas: TRAINEE_STAT_META,
  initialStats: { friendship: 50 },
}

const ZHAO_XIAOMAN: Character = {
  id: 'zhaoxiaoman',
  name: '赵小曼',
  portrait: '/characters/zhaoxiaoman.jpg',
  gender: 'female',
  age: 20,
  title: '努力型·草根',
  description: '农村考出来的孩子，靠奖学金和打工存够练习生面试车费。舞蹈自学，坚韧不屈。',
  personality: '坚韧自尊 | 不服输 + 害怕被同情 + 内心柔软',
  speakingStyle: '简短有力，"我可以的""没事，再来""不需要同情"',
  secret: '手机里存着妈妈只发过一条的微信语音',
  triggerPoints: ['你用行动而非怜悯支持她', '你承认她的实力'],
  behaviorPatterns: '友好>50沉默但坚定站在你身边，<30把你当竞争对手',
  themeColor: '#f97316',
  joinEpisode: 1,
  isLead: false,
  statMetas: TRAINEE_STAT_META,
  initialStats: { friendship: 40 },
}

const CHEN_KEER: Character = {
  id: 'chenkeer',
  name: '陈可儿',
  portrait: '/characters/chenkeer.jpg',
  gender: 'female',
  age: 18,
  title: '心机型·颜值担当',
  description: '精致到每个角度都完美，善于社交和镜头。不是坏人，只是太清楚行业规则。',
  personality: '聪明现实 | 善于社交 + 活在人设里 + 渴望真心朋友',
  speakingStyle: '甜美讨巧，"姐妹你太好了~""我觉得这样对大家都好"',
  secret: '深夜卸妆后不敢照镜子，怕忘了真正的自己',
  triggerPoints: ['你不带目的地对她好', '你在她崩溃时没有嘲笑'],
  behaviorPatterns: '友好>60真诚帮你，<20暗示你的弱点争夺资源',
  themeColor: '#ec4899',
  joinEpisode: 1,
  isLead: false,
  statMetas: TRAINEE_STAT_META,
  initialStats: { friendship: 35 },
}

const SU_NIANNIAN: Character = {
  id: 'suniannian',
  name: '苏念念',
  portrait: '/characters/suniannian.jpg',
  gender: 'female',
  age: 21,
  title: '佛系型·隐藏实力',
  description: '大学音乐系在读，被星探发掘。来当练习生只是"试试看"，看似佛系实则通透。',
  personality: '通透有主见 | 看似佛系 + 关键时刻清醒 + 被认真的人触动',
  speakingStyle: '慵懒随意，"随缘吧""都行啊""无所谓"',
  secret: '怕认真后承受不了失去',
  triggerPoints: ['你认真问她为什么不更努力', '你在关键时刻展现真心'],
  behaviorPatterns: '友好>60深夜给你带宵夜帮你冷静，<30懒得理你',
  themeColor: '#10b981',
  joinEpisode: 1,
  isLead: false,
  statMetas: TRAINEE_STAT_META,
  initialStats: { friendship: 45 },
}

// ── 角色工厂 ─────────────────────────────────────────
export function buildCharacters(): Record<string, Character> {
  return {
    guyanche: GU_YANCHE,
    shenzheyuan: SHEN_ZHEYUAN,
    zhoumushen: ZHOU_MUSHEN,
    linshiyu: LIN_SHIYU,
    zhaoxiaoman: ZHAO_XIAOMAN,
    chenkeer: CHEN_KEER,
    suniannian: SU_NIANNIAN,
  }
}

// ── 场景 ─────────────────────────────────────────────
export const SCENES: Record<string, Scene> = {
  practice: {
    id: 'practice',
    name: '练习室',
    icon: '🎵',
    description: '三面镜墙，冷白灯光，节拍器无情闪烁。梦想锻造的熔炉。',
    background: '/scenes/practice.jpg',
    atmosphere: '汗水与地板蜡的混合气味',
    tags: ['训练', '日常', '加练'],
  },
  stage: {
    id: 'stage',
    name: '公演舞台',
    icon: '🎤',
    description: '圆形舞台，环绕LED，数百盏灯光。三分钟内被审判的法庭。',
    background: '/scenes/stage.jpg',
    atmosphere: '干冰白雾与荧光棒海洋',
    tags: ['公演', '比赛', '聚光灯'],
    unlockCondition: { episode: 4 },
  },
  backstage: {
    id: 'backstage',
    name: '后台化妆间',
    icon: '💄',
    description: '带灯泡的化妆镜、演出服、散落的假睫毛。变身的魔法空间。',
    background: '/scenes/backstage.jpg',
    atmosphere: '定妆喷雾与期待交织',
    tags: ['化妆', '准备', '偶遇'],
  },
  dormitory: {
    id: 'dormitory',
    name: '宿舍',
    icon: '🏠',
    description: '四人间上下铺，窗外城市灯火。深夜谈心与偷偷哭泣的地方。',
    background: '/scenes/dormitory.jpg',
    atmosphere: '洗衣液清香与深夜私语',
    tags: ['休息', '谈心', '社交'],
  },
}

// ── 道具 ─────────────────────────────────────────────
export const ITEMS: GameItem[] = [
  {
    id: 'energy-drink',
    name: '能量饮料',
    icon: '🥤',
    type: 'consumable',
    description: '冰凉液体冲走疲惫。心理+15',
    maxCount: 3,
  },
  {
    id: 'vocal-notes',
    name: '声乐秘籍',
    icon: '📝',
    type: 'consumable',
    description: '泛黄笔记本上的气息控制心得。Vocal+10',
    maxCount: 2,
  },
  {
    id: 'dance-video',
    name: '舞蹈教程',
    icon: '📱',
    type: 'consumable',
    description: '独家慢动作分解视频。Dance+8',
    maxCount: 2,
  },
  {
    id: 'skincare-set',
    name: '护肤套装',
    icon: '💄',
    type: 'consumable',
    description: '品牌赞助补水三件套。颜值+8',
    maxCount: 2,
  },
  {
    id: 'fan-letter',
    name: '粉丝来信',
    icon: '💌',
    type: 'social',
    description: '手写信，贴着星星贴纸。心理+10 粉丝+3',
    maxCount: 99,
  },
  {
    id: 'lucky-charm',
    name: '幸运手链',
    icon: '🍀',
    type: 'collectible',
    description: '苏念念送的四叶草编织手链。关键时刻判定+3',
    maxCount: 1,
  },
]

// ── 章节 ─────────────────────────────────────────────
export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    name: '练习生时代',
    dayRange: [1, 3],
    description: '公司培训选拔，争取综艺名额',
    objectives: ['熟悉训练环境', '结交同伴', '提升基础实力', '内部排名前50%'],
    atmosphere: '紧张中带期待，陌生环境的适应与磨合',
  },
  {
    id: 2,
    name: '综艺征途',
    dayRange: [4, 8],
    description: '节目中生存，完成公演，争取晋级',
    objectives: ['在每期节目中存活', '完成公演舞台', '积累粉丝影响力', '处理人际关系'],
    atmosphere: '高压竞争，聚光灯与暗箭齐飞',
  },
  {
    id: 3,
    name: '巅峰对决',
    dayRange: [9, 12],
    description: '冲刺出道，最终排名争夺',
    objectives: ['冲击出道位', '粉丝影响力最大化', '处理感情线', '总决赛一战定生死'],
    atmosphere: '白热化竞争，情感与梦想的抉择',
  },
]

// ── 强制事件 ─────────────────────────────────────────
export const FORCED_EVENTS: ForcedEvent[] = [
  {
    id: 'orientation',
    name: '入社仪式',
    triggerDay: 1,
    triggerPeriod: 0,
    description: '初入天星传媒，分配宿舍，遇见室友。第一次站在练习室镜子前。',
  },
  {
    id: 'internal-rank',
    name: '内部排位赛',
    triggerDay: 3,
    triggerPeriod: 2,
    description: '前3期总评！公布进入《青春练习生》综艺的选手名单。',
  },
  {
    id: 'edit-storm',
    name: '剪辑风波',
    triggerDay: 6,
    triggerPeriod: 1,
    description: '节目组恶意剪辑制造矛盾，你被牵涉其中。舆论一边倒。',
  },
  {
    id: 'scandal-crisis',
    name: '舆论危机',
    triggerDay: 9,
    triggerPeriod: 0,
    description: '"黑历史"被扒，社交媒体炸锅。需要综合公关手段应对。',
  },
  {
    id: 'finale',
    name: '总决赛之夜',
    triggerDay: 12,
    triggerPeriod: 2,
    description: '聚光灯下，主持人宣布最终出道名单。你的命运即将揭晓。',
  },
]

// ── 结局 ─────────────────────────────────────────────
export const ENDINGS: Ending[] = [
  {
    id: 'be-quit',
    name: '退圈',
    type: 'BE',
    description: '聚光灯太刺眼，梦想太沉重。你选择了离开，但学到的一切不会消失。',
    condition: '心理≤20 且连续两期排名末位',
  },
  {
    id: 'be-eliminated',
    name: '淘汰出局',
    type: 'BE',
    description: '实力不足以支撑梦想的重量。你带着遗憾离开了舞台。',
    condition: 'Vocal/Dance/颜值均值<40',
  },
  {
    id: 'te-ace',
    name: '全能ACE·C位出道',
    type: 'TE',
    description: '你站在C位，聚光灯为你而亮。实力、人气、颜值——三年汗水证明了一切。',
    condition: 'Vocal≥75 Dance≥75 颜值≥75 粉丝≥80 心理≥60 且至少一位男主好感≥80',
  },
  {
    id: 'te-pure',
    name: '不忘初心',
    type: 'TE',
    description: '你没有走捷径，没有背叛同伴。你是偶像工业最稀有的存在。',
    condition: '全程未在道德选择中妥协 且至少两位女练习生友好≥70',
  },
  {
    id: 'he-debut',
    name: '梦想成真',
    type: 'HE',
    description: '虽然不是C位，但你成功出道了。站在舞台上，你笑着流泪。',
    condition: '粉丝≥60 均值≥55 心理≥50',
  },
  {
    id: 'he-solo',
    name: 'Solo新星',
    type: 'HE',
    description: '团体出道与你擦肩，但公司决定为你开辟Solo道路。',
    condition: 'Vocal≥85 或 Dance≥85，粉丝<50',
  },
  {
    id: 'ne-close',
    name: '意难平选手',
    type: 'NE',
    description: '差一个名额。全网为你喊冤，你成了最让人心疼的选手。',
    condition: '均值≥60 但排名在出道线外',
  },
  {
    id: 'ne-blackred',
    name: '黑红出道',
    type: 'NE',
    description: '争议巨大但流量极高。这条路不会平坦，但你已经站上去了。',
    condition: '粉丝≥70 心理<40 且舆论危机未妥善处理',
  },
]

// ── 游戏信息 ─────────────────────────────────────────
export const STORY_INFO = {
  title: '青春练习生',
  subtitle: 'AI 女团养成游戏',
  description: '在偶像工业的残酷选拔中，用汗水与梦想证明自己。12期综艺，3位攻略对象，你的选择决定出道命运。',
  genre: '偶像养成',
  emoji: '⭐',
}

// ── 快捷操作 ─────────────────────────────────────────
export const QUICK_ACTIONS: string[] = [
  '加紧练习',
  '与队友交流',
  '请教前辈',
  '休息调整',
]

// ── 全局资源标签 ─────────────────────────────────────
export const GLOBAL_STAT_METAS: StatMeta[] = [
  { key: 'vocal', label: 'Vocal', color: '#e91e8c', icon: '🎤', category: 'skill' },
  { key: 'dance', label: 'Dance', color: '#f97316', icon: '💃', category: 'skill' },
  { key: 'charm', label: '颜值', color: '#ec4899', icon: '✨', category: 'skill' },
  { key: 'fans', label: '粉丝', color: '#6366f1', icon: '📱', category: 'status' },
  { key: 'mental', label: '心理', color: '#10b981', icon: '💚', category: 'status' },
]

// ── 工具函数 ─────────────────────────────────────────
export function getStatLevel(value: number) {
  if (value >= 80) return { level: 4, name: '顶级', color: '#fbbf24' }
  if (value >= 60) return { level: 3, name: '优秀', color: '#10b981' }
  if (value >= 30) return { level: 2, name: '成长中', color: '#3b82f6' }
  return { level: 1, name: '初学者', color: '#94a3b8' }
}

export function getAvailableCharacters(
  episode: number,
  characters: Record<string, Character>
): Record<string, Character> {
  return Object.fromEntries(
    Object.entries(characters).filter(([, char]) => char.joinEpisode <= episode)
  )
}

export function getCurrentChapter(episode: number): Chapter {
  return CHAPTERS.find((ch) => episode >= ch.dayRange[0] && episode <= ch.dayRange[1])
    ?? CHAPTERS[0]
}

export function getDayEvents(
  episode: number,
  triggeredEvents: string[]
): ForcedEvent[] {
  return FORCED_EVENTS.filter(
    (e) => e.triggerDay === episode && !triggeredEvents.includes(e.id)
  )
}
