# 青春练习生 — AI 女团养成游戏

React 19 + Zustand 5 + Immer + Vite 7 + Tailwind CSS v4 + Framer Motion + Cloudflare Pages

## 架构

```
15list-qingchun/
├── worker/index.js              - ☆ CF Worker API 代理（备用，未部署）
├── public/
│   ├── audio/bgm.mp3            - 背景音乐
│   ├── characters/              - 7 角色立绘 9:16 竖版 (1152x2048)
│   └── scenes/                  - 4 场景背景 9:16 竖版 (1152x2048)
├── src/
│   ├── main.tsx                 - ☆ React 入口
│   ├── vite-env.d.ts            - Vite 类型声明
│   ├── App.tsx                  - 根组件: 三阶段开场(邀请函→群像闪切→姓名输入) + GameScreen + EndingModal + MenuOverlay
│   ├── lib/
│   │   ├── script.md            - ★ 剧本直通：五模块原文（零转换注入 prompt）
│   │   ├── data.ts              - ★ UI 薄层：类型(含富消息扩展) + 7角色 + 4场景 + 6道具 + 3章节 + 5事件 + 7结局
│   │   ├── store.ts             - ★ 状态中枢：Zustand + 富消息插入(场景/换期) + Analytics 集成 + 双轨解析
│   │   ├── parser.ts            - AI 回复解析（7角色着色 + 数值着色）
│   │   ├── analytics.ts         - Umami 埋点（qc_ 前缀，已集成到 store/App）
│   │   ├── stream.ts            - ☆ SSE 流式通信
│   │   ├── bgm.ts               - ☆ 背景音乐
│   │   └── hooks.ts             - ☆ useMediaQuery / useIsMobile
│   ├── styles/
│   │   ├── globals.css          - 全局基础样式（qc- 前缀）
│   │   ├── opening.css          - 开场样式：邀请函 + 群像闪切 + 姓名输入
│   │   └── rich-cards.css       - 富UI组件：场景卡 + 期变卡 + 档案卡 + 荧光棒 + NPC气泡
│   └── components/game/
│       ├── app-shell.tsx        - 桌面居中壳 + Header + 荧光棒MusicPlayer + Tab 路由 + TabBar
│       ├── tab-dialogue.tsx     - 对话 Tab：富消息路由(SceneCard/EpisodeCard/NPC头像气泡) + 快捷操作 + 背包
│       ├── tab-scene.tsx        - 场景 Tab：9:16大图 + 真实头像人物标签 + 地点列表
│       └── tab-character.tsx    - 人物 Tab：立绘 + 属性 + 真实头像关系列表 + CharacterDossier 全屏档案
├── index.html
├── package.json
├── vite.config.ts               - ☆
├── tsconfig*.json               - ☆
└── wrangler.toml                - ☆
```

★ = 种子文件 ☆ = 零修改模板

## 核心设计

- **偶像养成 + 恋爱线**：3 男主攻略 + 4 女练习生同伴，12 期综艺
- **双轨数值**：5 全局属性（Vocal/Dance/颜值/粉丝/心理）+ NPC 好感/友好度
- **亮色主题**：#ff4d8d 偶像粉，qc- CSS 前缀
- **3 时段制**：每期 3 时段（早晨/中午/晚上），共 36 时间槽
- **剧本直通**：script.md 存五模块原文，?raw import 注入 prompt
- **7 结局**：BE×2 + TE×2 + HE×2 + NE×2，优先级 BE→TE→HE→NE

## 富UI组件系统

| 组件 | 位置 | 触发 | 视觉风格 |
|------|------|------|----------|
| InviteCard | App.tsx | 开场Phase1 | 磨砂玻璃选拔通知卡，弹簧入场 |
| CharacterMontage | App.tsx | 开场Phase2 | 7角色立绘顺序闪现(2s/人)，交替左右滑入 |
| SceneTransitionCard | tab-dialogue | selectScene | 场景背景+Ken Burns(8s)+渐变遮罩+粉色角标 |
| EpisodeCard | tab-dialogue | 换期 | 综艺字幕风弹簧落入(y:-30,rotate:-3)+章节名 |
| CharacterDossier | tab-character | 点击角色 | 全屏右滑入+50vh立绘呼吸动画+好感阶段+触发暗示 |
| MusicPlayer | app-shell header | 始终可用 | 荧光棒脉冲发光+展开面板5根音波柱 |

## 富消息机制

Message 类型扩展 `type` 字段路由渲染：
- `scene-transition` → SceneTransitionCard（selectScene 触发）
- `episode-change` → EpisodeCard（advanceTime 换期时触发）
- NPC 消息带 `character` 字段 → 28px 圆形立绘头像

## Analytics 集成

- `trackGameStart` / `trackPlayerCreate` → App.tsx 开场
- `trackGameContinue` → App.tsx 继续游戏
- `trackTimeAdvance` / `trackChapterEnter` → store.ts advanceTime
- `trackEndingReached` → store.ts checkEnding
- `trackMentalCrisis` → store.ts mental≤20
- `trackSceneUnlock` → store.ts selectScene/advanceTime

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
