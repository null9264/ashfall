-- 灰烬城 Ashfall · D1 迁移 0002: 管理员视图 + 昵称 + 事件追踪
-- 玩家昵称（必须唯一）
CREATE TABLE IF NOT EXISTS nicknames (
  nickname   TEXT PRIMARY KEY,
  player_id  TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_nickname_idx ON nicknames(nickname);
CREATE INDEX IF NOT EXISTS idx_nick_player ON nicknames(player_id);

-- 玩家事件日志（行为埋点）
CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id  TEXT NOT NULL,
  type       TEXT NOT NULL,   -- move/talk/quest/accept/quest/complete/pickup/hidden/ending/reset/login
  ref        TEXT,            -- 关联 id（区域/npc/任务/隐藏/结局）
  meta       TEXT,            -- JSON 字符串补充数据
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evt_player ON events(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evt_type ON events(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evt_time ON events(created_at DESC);

-- 管理员会话 token
CREATE TABLE IF NOT EXISTS admin_sessions (
  token       TEXT PRIMARY KEY,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_exp ON admin_sessions(expires_at);