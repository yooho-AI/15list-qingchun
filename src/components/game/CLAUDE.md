# components/game/ — 游戏 UI 组件层

L2 | 父级: /15list-qingchun/CLAUDE.md

## 成员清单

- `app-shell.tsx`: 游戏主框架，Header(时间+属性+荧光棒MusicPlayer+菜单) + AnimatePresence Tab 切换 + 底部 TabBar(3 Tab)
- `tab-dialogue.tsx`: 对话 Tab，富消息路由(SceneTransitionCard/EpisodeCard/NPC头像气泡/系统/玩家) + LetterCard + StreamingMessage + QuickActions(2×2) + InventorySheet + InputArea
- `tab-scene.tsx`: 场景 Tab，SceneHeroCard(9:16大图) + 真实立绘头像人物标签 + 地点列表(解锁/锁定/当前)
- `tab-character.tsx`: 人物 Tab，PortraitHero(9:16立绘) + 玩家属性面板 + NPC数值条(category分组) + 真实头像关系列表 + CharacterDossier 全屏右滑入档案卡(50vh立绘呼吸动画+好感阶段+触发暗示+可展开性格)

## 设计约束

- 移动优先唯一布局，无 isMobile 分叉
- 桌面端 430px 居中容器（qc-shell）
- TabBar padding-bottom: env(safe-area-inset-bottom)
- 所有图片 9:16 竖版，aspect-ratio: 9/16
- CSS 类名统一 qc- 前缀

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
