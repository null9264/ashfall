# 灰烬城 · Ashfall

> 一个**末日废土开放探索 RPG**,前端 React + Vite + TypeScript,后端 **Cloudflare Pages Functions + D1(SQLite)**。游戏状态、防作弊校验、世界内容(区域/NPC/任务/隐藏要素/结局)全部在**服务端**——前端只渲染和发请求,玩家即使用 F12 也无法跳步或提前解锁内容。

**当前版本**:**v2.0.3**(P0 引导 / 玩法 / 剧情 + P1 钟声 / 求助 / 过渡 / 结局 cost-keeps + P2 多周目 / 解谜 / 天气 / 经济 / 邮件 / 错误体验)
📋 完整发布说明见 [CHANGELOG_v2.0.3.md](./CHANGELOG_v2.0.3.md)
🌐 在线部署:https://ashfall-6mr.pages.dev

## 玩法

- 7 个连通区域(旧城西门/黑市街区/地铁废线/居民楼群/废弃工厂/河岸/地下管网),自由移动
- 14+ 可交互 NPC,4 种立场(ally / witness / hostile / neutral),分支对话树
- 12+ 多分支任务(主线 5 段 + 支线 + 隐藏),带前置 / 多解法 / 奖励分支
- 7 个隐藏要素(条件组合触发),含钟声 world event
- 5 个结局(重建 / 救赎 / 共灭 / 镇压 / 回声),每个有 cost / keeps / tone_color
- 物资搜寻、物品拾取、NPC 信任度、隐藏标记、天气影响、解谜玩法、制作系统、剧情邮件、多周目循环

## 技术栈

- **前端**:Vite + React 18 + TypeScript,`src/` 下
- **后端**:Cloudflare Pages Functions,`functions/` 下,14 个 API 端点 + 中间件
- **数据库**:Cloudflare D1(SQLite 兼容),迁移在 `migrations/`
- **本地开发**:`npm run dev`(同时启动 vite + wrangler pages dev)

## 本地开发

```bash
npm install
npx wrangler d1 create ashfall-db   # 首次建库
# 把返回的 database_id 填到 wrangler.toml
npx wrangler d1 migrations apply ashfall-db --local
npm run dev
```

## 部署

详见 [DEPLOY.md](./DEPLOY.md)。**两种方式**：

### 方式 A：Git 集成（推荐，推送即部署）
1. Cloudflare Dashboard → `ashfall` → **Settings** → **Builds** → **Connect to Git** → GitHub → `null9264/ashfall` / `main`
2. 框架 Vite，Build command `npm run build`，Output `dist`
3. 触发首次 Deploy，之后 `git push` 即自动上线

### 方式 B：手动上传 / wrangler deploy
适合不接 Git 的情况。需 API Token。

## 防作弊说明

完整世界数据(区域配置、NPC 对话树、任务定义、隐藏触发条件、结局判定、解谜答案)只存在于服务端。每一个 `/api/*` 端点都在服务端重新校验:

- `/api/move` —— 拒绝未解锁的目标区域 / 拒绝 HP 太低进入危险区
- `/api/talk` —— 拒绝不满足对话前置的选项
- `/api/quest/accept` —— 拒绝未满足接取前置
- `/api/quest/complete` —— 拒绝未携带必要物品/未完成子条件
- `/api/pickup` —— 拒绝物品已拾取(每个物品每区域只能拾一次)
- `/api/trigger-hidden` —— 拒绝未满足隐藏条件的触发
- `/api/puzzle` —— 服务端硬编码答案,前端不能伪造
- `/api/craft` —— 服务端校验材料并扣减
- `/api/ending/choose` —— 拒绝未达成的结局
- `_middleware.ts` —— 全局 5xx 兜底为友好 JSON

前端即使通过浏览器调试器改本地状态,也无法跳过这些校验。