# styles/ — 样式层

L2 | 父级: /15list-qingchun/CLAUDE.md

## 成员清单

- `globals.css`: 全局基础样式——CSS变量(亮色偶像主题,含--bg-dash) + Shell/Header/TabBar + 对话气泡 + 输入区 + 弹窗 + 滚动条 + 动画关键帧
- `opening.css`: 开场三阶段样式——全屏Splash(深紫渐变+星光粒子+角色立绘+shimmer Logo+脉冲CTA) + 群像闪切(全屏立绘+进度点+跳过) + 姓名输入(预览网格+按钮)
- `rich-cards.css`: 富UI组件样式——场景转场卡(Ken Burns) + 期变卡片(弹簧+逐字打字机) + NPC头像气泡行 + 角色档案卡(呼吸动画) + 荧光棒播放器 + DashboardDrawer(扉页/轮播/场景网格/目标/道具/排名/音乐/拖拽) + RecordSheet(时间线) + SVG关系图容器 + Toast通知

## 设计约束

- CSS 类名统一 `qc-` 前缀
- 主题色 `--primary: #ff4d8d`（偶像粉）
- 动画关键帧统一 `qc` 前缀（qcBounce/qcBlink/qcPulse/qcKenBurns/qcBreathe/qcGlowPulse/qcWave/qcSpin/qcGradientShift/qcSparkle/qcShimmer/qcCtaPulse）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
