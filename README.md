# 灰烬都市 · Ashfall

一个**末日废土开放探索 RPG**,前端 React + Vite + TypeScript,后端 **Cloudflare Pages Functions + D1(SQLite)**。游戏状态、防作弊校验、世界内容(区域/NPC/任务/隐藏要素/结局)全部在**服务端**——前端只渲染和发请求,玩家即使用 F12 也无法跳步或提前解锁内容。

## 玩法

- 6 个连通区域(废墟广场/灰塔/灯塔区/市场废墟/地下车站/飞艇残骸),自由移动
- 12+ 可交互 NPC,分支对话树
- 7 个多分支任务(带前置/多解法/奖励分支)
- 6 个隐藏要素(条件组合触发)
- 5 个结局(真结局 / 救赎 / 叛逃 / 沉睡 / 共灭)
- 物资搜寻、物品拾取、NPC 关系、隐藏标记

## 技术栈

- **前端**:Vite + React 18 + TypeScript,`src/` 下
- **后端**:Cloudflare Pages Functions,`functions/` 下,9 个 API 端点 + 中间件
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

详见 [DEPLOY.md](./DEPLOY.md)。推荐 Cloudflare Pages(国内访问比 Vercel 稳得多),需:

1. 注册 Cloudflare(免费、无需信用卡)
2. 生成 API Token
3. 在 Cloudflare 控制台创建 D1 数据库 + 应用迁移
4. 把 token 交给 AI 或自己用 `wrangler pages deploy` 部署

游戏代码本身只依赖 Cloudflare 生态,**无需 GitHub** 即可部署。

## 防作弊说明

完整世界数据(区域配置、NPC 对话树、任务定义、隐藏触发条件、结局判定)只存在于服务端。每一个 `/api/*` 端点都在服务端重新校验:

- `/api/move` —— 拒绝未解锁的目标区域
- `/api/talk` —— 拒绝不满足对话前置的选项
- `/api/quest/accept` —— 拒绝未满足接取前置
- `/api/quest/complete` —— 拒绝未携带必要物品/未完成子条件
- `/api/pickup` —— 拒绝区域未探索/物品已拾取
- `/api/trigger-hidden` —— 拒绝未满足隐藏条件的触发

前端即使通过浏览器调试器改本地状态,也无法跳过这些校验。