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
│   ├── App.tsx                  - 根组件: StartScreen/GameScreen 二态 + EndingModal + MenuOverlay
│   ├── lib/
│   │   ├── script.md            - ★ 剧本直通：五模块原文（零转换注入 prompt）
│   │   ├── data.ts              - ★ UI 薄层：类型 + 7角色 + 4场景 + 6道具 + 3章节 + 5事件 + 7结局
│   │   ├── store.ts             - ★ 状态中枢：Zustand + 5全局属性 + 双轨解析 + 期制时间
│   │   ├── parser.ts            - AI 回复解析（7角色着色 + 数值着色）
│   │   ├── analytics.ts         - Umami 埋点（qc_ 前缀）
│   │   ├── stream.ts            - ☆ SSE 流式通信
│   │   ├── bgm.ts               - ☆ 背景音乐
│   │   └── hooks.ts             - ☆ useMediaQuery / useIsMobile
│   ├── styles/globals.css       - 亮色偶像主题（qc- 前缀）
│   └── components/game/
│       ├── app-shell.tsx        - 桌面居中壳 + Header + Tab 路由 + TabBar
│       ├── tab-dialogue.tsx     - 对话 Tab：气泡 + 快捷操作 + 背包 + 输入
│       ├── tab-scene.tsx        - 场景 Tab：9:16大图 + 相关人物 + 地点
│       └── tab-character.tsx    - 人物 Tab：立绘 + 玩家属性 + NPC数值 + 关系图
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

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
