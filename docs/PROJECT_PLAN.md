# 项目实施计划 (Project Plan) - PaperWords Web

## 1. 里程碑概览

| 阶段 | 周期 | 核心目标 | 交付物 |
|---|---|---|---|
| **Phase 1: 架构与设计系统** | Day 1~2 | 完成技术骨架搭建、字体与 Light Academia + Bento 设计系统落地 | 基础工程、全局主题与排版规范 |
| **Phase 2: 存储与 JSON 导入** | Day 3~4 | 实现 Dexie.js 本地库与高容错 JSON 词库解析引擎 | 词库导入模态框、本地数据库 CRUD |
| **Phase 3: A4 纸感排版与键盘交互** | Day 5~7 | 实现 A4 纸张多列排版、行光标过渡与全键盘极速盲操 | A4 主视图、Vim 风格快捷键流 |
| **Phase 4: 艾宾浩斯调度与遮罩动效** | Day 8~10 | 落地双层遗忘曲线算法与红宝书刮开/遮罩动效 | 复习调度引擎、遮罩交互组件 |
| **Phase 5: 便当盒控制台与发音打磨** | Day 11~13 | 落地 Bento Box 进度仪表盘、TTS 发音集成与离线 PWA 支持 | 数据看板、发音播放器、完整体验包 |

---

## 2. 详细执行路线

### Phase 1: 架构与设计系统 (Design System & Boilerplate)
- 初始化 Vite + React 19 + TypeScript + Tailwind CSS v4 模板
- 配置排版字体：衬线体（英文字体 *Newsreader* / *Playfair Display*）+ 无衬线无干扰字体（*Geist* / *Inter*）
- 注入纸质色系变量：纸白底色 `#FAFAF7`、深墨文字 `#1C1917`、琥珀强调色 `#D97706`、遮罩红 `#E11D48`
- 封装通用 Bento 卡片容器与 A4 纸张外壳

### Phase 2: 存储与 JSON 导入 (Persistence & Import Engine)
- 初始化 Dexie.js 数据库模型（`decks`、`words`、`review_logs`）
- 编写健壮的 JSON 校验解析器：
  - 支持单层数组、词典对象、分级标签导入
  - 自动将导入长文本自动切分为标准 30 词/List 的 A4 纸单元
- 提供预置示例词库（如考研/GRE高频核心 100 词）供快速自测

### Phase 3: A4 纸感核心界面与盲操体验 (A4 Sheet & Fast Flow)
- 构建双列/三列高密度 A4 排版视图，单屏呈现完整单元
- 集成 `useHotkeys`：支持 `J/K` 上下扫读、`Space` 翻转释义、`1/2/3` 熟练度打标
- 基于 Framer Motion 实现平滑行焦点框（`active-row-indicator`），消除视觉跳跃卡顿
- 支持“红宝书遮罩模式”与“全览模式”一键热键无缝切换

### Phase 4: 艾宾浩斯复习调度 (Scheduling & Memory Engine)
- 实现基于 5m/30m/12h/1d/2d/4d/7d/15d 的 List 与单词双层调度
- 动态生成“今日需复习 A4 纸单”与“今日新词纸单”
- 模糊词自动归集至纸底“生词重现温习区”

### Phase 5: 便当盒仪表盘与全流程调优 (Dashboard & Polish)
- 顶部/侧边便当盒布局：已学词数、复习倒计时、记忆留存率折线图
- 集成 Web Speech API 极速本地发音与发音缓存
- 性能压测与离线构建优化，确保即使加载 50,000+ 词依然秒开
