# styles/ — 样式层

L2 | 父级: /15list-qingchun/CLAUDE.md

## 成员清单

- `globals.css`: 全局基础样式——CSS变量(亮色偶像主题) + Shell/Header/TabBar + 对话气泡 + 输入区 + 弹窗 + 滚动条 + 动画关键帧
- `opening.css`: 开场三阶段样式——邀请函卡片(磨砂玻璃) + 群像闪切(全屏立绘+进度点+跳过) + 姓名输入(预览网格+按钮)
- `rich-cards.css`: 富UI组件样式——场景转场卡(Ken Burns动画) + 期变卡片(弹簧落入) + NPC头像气泡行 + 角色档案卡(呼吸动画) + 荧光棒音乐播放器(脉冲发光+音波柱)

## 设计约束

- CSS 类名统一 `qc-` 前缀
- 主题色 `--primary: #ff4d8d`（偶像粉）
- 动画关键帧统一 `qc` 前缀（qcBounce/qcBlink/qcPulse/qcKenBurns/qcBreathe/qcGlowPulse/qcWave）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
