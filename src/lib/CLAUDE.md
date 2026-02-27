# lib/ — 核心逻辑层

L2 | 父级: /15list-qingchun/CLAUDE.md

## 成员清单

- `script.md`: ★ 五模块剧本原文，Vite ?raw import 直通注入 AI prompt
- `data.ts`: ★ UI 薄层，全部类型定义(含 Message 富消息扩展 type/sceneId/episodeInfo) + 7角色 + 4场景 + 6道具 + 3章节 + 5事件 + 7结局
- `store.ts`: ★ Zustand+Immer 状态中枢，富消息插入(场景转场/换期) + Analytics 集成 + 双轨 parseStatChanges + 剧本直通 + re-export data.ts
- `parser.ts`: AI 回复文本解析，7角色硬编码着色 + 数值着色，禁止 import data.ts
- `analytics.ts`: Umami 埋点，qc_ 前缀，9 个关键事件（已集成到 store.ts 和 App.tsx）
- `stream.ts`: ☆ SSE 流式通信 + 非流式请求
- `bgm.ts`: ☆ 背景音乐全局单例
- `hooks.ts`: ☆ useMediaQuery / useIsMobile

## 关键架构

- **剧本直通管道**: script.md → `import ?raw` → `buildSystemPrompt()` → AI
- **双轨数值**: `parseStatChanges()` 返回 `{ charChanges, globalChanges }`
- **全局资源**: `GlobalResources { vocal, dance, charm, fans, mental }`
- **时间制**: 12 期 × 3 时段 = 36 槽，每期跨越时心理自然-3
- **富消息数据流**:
  - `selectScene()` → type:'scene-transition' + sceneId
  - `advanceTime()` → 换期时 type:'episode-change' + episodeInfo
  - `sendMessage()` → assistant 消息带 character 字段
- **存档**: `qingchun-save-v1`，最近 30 条消息

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
