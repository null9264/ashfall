-- 灰烬城 Ashfall · D1 迁移 0003: 玩家反馈
CREATE TABLE IF NOT EXISTS feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id  TEXT NOT NULL,
  nickname   TEXT,
  category   TEXT NOT NULL,    -- bug / suggestion / praise / other
  rating     INTEGER,          -- 1-5 (可空)
  message    TEXT NOT NULL,
  meta       TEXT,             -- JSON: area/ending/quests 等上下文
  status     TEXT NOT NULL DEFAULT 'new', -- new / read / archived
  created_at INTEGER NOT NULL,
  read_at    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_fb_time ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fb_status ON feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fb_category ON feedback(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fb_player ON feedback(player_id, created_at DESC);