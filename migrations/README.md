# 灰烬城 Ashfall · D1 迁移索引

按版本顺序执行 `wrangler d1 migrations apply ashfall-db`：

| 文件 | 版本 | 作用 |
|---|---|---|
| `0001_init.sql` | v1.0 | `players` + `player_states` 主表 |
| `0002_admin.sql` | v1.0 | `nicknames` / `events` / `admin_sessions`（唯一昵称/事件埋点/会话） |
| `0003_feedback.sql` | v2.0 | `feedback`（玩家反馈 + 类别/评分/状态） |
| `0004_picked_tracking.sql` | v2.0.2 | `player_states.picked`（每区域已拾物品标记，修复工厂道具无限拾） |
