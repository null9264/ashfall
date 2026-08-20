# 灰烬城 · v2.0.3 正式版

> Cloudflare Pages + D1 + React/Vite 的末日废土开放探索 RPG

**部署地址**:[https://af765d0b.ashfall-6mr.pages.dev](https://af765d0b.ashfall-6mr.pages.dev)
**Git Tag**:`v2.0.3`
**发布日期**:2026-08-20

---

## 本版本特性

### P0 引导四件套(让新玩家不再迷路)
- `TutorialOverlay` — 首次进入展示游戏循环(搜寻/对话/拾取/移动)
- `MainProgress` — 顶栏 5 段进度条,主线任务走到哪里一目了然
- `ItemTipModal` — 首次拾取物品时弹 tip 介绍用途
- `EndingPreviewModal` — 锁定结局的方向性提示,告诉玩家还差什么

### P0 玩法深化
- **trust 阈值** — NPC 对话树按 trust 1-5 解锁分支;同 NPC 在不同剧情节点态度会变
- **危险区驻留** — 进入 metro/undernet 起 +danger 辐射 + 生命扣血;每 10 秒额外 -1 HP / +1 辐射,直到离开
- **物资稀缺反馈** — 拾取返回 `remaining` + 中文提示"这片被翻遍了"
- **HP 太低禁入危险区** — HP ≤ 15 不让进,避免"一步送"

### P0 剧情深化
- **NPC 立场化** — 4 种 stance:`ally / witness / hostile / neutral`,前端用色牌展示
- **立场推断** — 根据持有物品 + 已解锁 flag + trust 自动判断 NPC 阵营(疤脸/监工/技师/回声等)
- **实物证据系统** — 关键剧情需要看到实物才触发(`DialogOption.trust/attr`):照片、map、echo_core 等

### P1 沉浸感
- **钟声 world event** — 满足 h_bell 全前置 + 在 undernet 时,前端一次性弹出钟声 modal;听过后辐射-20 / 声望+8
- **结局 cost / keeps / tone_color** — 选结局前弹 `EndingChoiceModal` 让玩家看清"失去什么 / 留下什么"
- **区域过渡动画** — 区域切换 700ms 暗场淡入淡出,避免突兀
- **"🆘 我卡住了" 求助按钮** — 玩家主动调 `/api/help` 无视冷却直接拿一条方向提示

### P2 系统扩展
- **多周目基座** — `loop` / `endings_seen` / `loop_carried_items` 字段,通关后 loop+1,旧 ending 入库,下周口袋多一件"档案管理员的旧笔记"
- **解谜面板** — 3 个谜题(密码锁/三色序列/口令),服务端硬编码答案,通过后给物品 / 声望
- **天气系统** — 5 种天气(sunny / cloudy / rain / storm / radiant)按 day hash 决定,影响危险区辐射偏移
- **经济(制作/兑换)** — 3 个配方(抗生素/钥匙/柴油),材料不足时按钮置灰
- **邮件信箱** — 5 封剧情触发邮件,footer 显示未读 badge
- **错误体验** — `bad()` 加 code + hint 字段,`_middleware.ts` 把 5xx 兜底成友好 JSON

---

## 自动化校验

| 维度 | 结果 |
|------|------|
| 单测 | **196 / 196** 通过(vitest) |
| 类型检查 | tsc (main + test) 0 错 |
| Build | 193.93 kB / gzip 61.75 kB |
| 远程 e2e | **50 / 50** 通过(regression.sh) |
| 远程 smoke | 6 / 6 P2 新功能全部生效 |
| 数据迁移 | `0006_v203_state.sql` + `0007_loop.sql` 已应用 |

---

## 项目里程碑

| 版本 | 主题 | 关键产物 |
|------|------|----------|
| v2.0 | 基础闭环 | 7 个区域 + 14 个 NPC + 12 个任务 + 5 个结局 + 防作弊 + D1 持久化 |
| v2.0.1 | nickname 持久化 | 三重保险(服务端/前端/缓存)+ 回归 case |
| v2.0.2 | 数值 + 线索 + 历史 | 历史中文化 + hint 机制 + UI 收紧 |
| v2.0.3 | 引导/玩法/剧情/系统 | 见上方三大块 |
| **v2.0.3 P2** | **多周目 + 解谜 + 天气 + 经济 + 邮件 + 错误** | **本文档** |

---

## 后续可继续做

- **P3**: 多结局解锁树可视化、玩家档案墙分享页、AI NPC 微交互
- **运营**: Cloudflare Analytics 接入、Cloudflare Turnstile 防刷、Cloudflare R2 媒体资源

---

## 开发者备忘

- 测试命令:`npx vitest run`
- 类型检查:`npx tsc --noEmit` + `npx tsc --noEmit -p tsconfig.test.json`
- 远程 e2e:`BASE="https://<deploy>.ashfall-6mr.pages.dev" bash tests/e2e/regression.sh`
- 数据库迁移:`npx wrangler d1 migrations apply ashfall-db --remote`
- 部署:`CLOUDFLARE_API_TOKEN="..." npm run deploy`

**Built by 乱涂机器人工坊** · Cloudflare Pages + D1 + React 18 + Vite 5