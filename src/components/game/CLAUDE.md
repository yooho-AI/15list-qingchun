# components/game/ — 游戏 UI 组件层

L2 | 父级: /15list-qingchun/CLAUDE.md

## 成员清单

- `app-shell.tsx`: 游戏主框架，Header(📓+时间+属性+🎵+☰+📜) + 三向手势Tab切换 + 底部TabBar + DashboardDrawer(左抽屉) + RecordSheet(右抽屉) + Toast通知
- `dashboard-drawer.tsx`: 练习生手帐，左侧滑入抽屉，毛玻璃卡片+淡粉紫渐变。FrontPage(紧凑横排圆形徽章+星形行动力)/RelationshipMini(3男主圆头像+主题色好感)/CharacterGallery(2:3竖版立绘+5颗心好感)/SceneMap(横向滚动真实背景缩略图)/TrainingGoals(checkbox风格)/StatusBoard(彩色pill属性+道具贴纸)+底部MiniPlayer。Reorder拖拽排序+localStorage `qc-dash-order-v2` 持久化
- `tab-dialogue.tsx`: 对话 Tab，富消息路由(SceneTransitionCard/EpisodeCard逐字打字机/NPC头像气泡/系统/玩家) + LetterCard + StreamingMessage + QuickActions(2×2) + InventorySheet + InputArea
- `tab-scene.tsx`: 场景 Tab，SceneHeroCard(9:16大图) + 真实立绘头像人物标签 + 地点列表(解锁/锁定/当前)
- `tab-character.tsx`: 人物 Tab，PortraitHero(9:16立绘) + 玩家属性面板 + NPC数值条(category分组) + SVG RelationGraph(环形节点图+连线+关系标签) + 真实头像关系列表 + CharacterDossier全屏右滑入档案卡

## 交互架构

- **三向手势导航**：右滑→左侧手帐 | 左滑→右侧记录 | Header按钮同等触发
- **手帐拖拽排序**：Reorder.Group + dragControls + 三横线SVG手柄，排序持久化localStorage
- **人物轮播**：触摸滑动换人 + AnimatePresence方向动画 + 分页圆点
- **SVG关系图**：中心"我"节点 + 7 NPC环形分布 + 立绘clipPath + 连线 + 关系标签，点击→selectCharacter+弹档案+跳对话Tab
- **Toast通知**：saveGame 后弹出"✅ 已保存"，2s自动消失

## 设计约束

- 移动优先唯一布局，无 isMobile 分叉
- 桌面端 430px 居中容器（qc-shell）
- TabBar padding-bottom: env(safe-area-inset-bottom)
- 所有图片 9:16 竖版，aspect-ratio: 9/16
- CSS 类名统一 qc- 前缀

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
