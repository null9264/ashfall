-- 灰烬城 Ashfall · D1 迁移 0005: 暗线提示冷却查询索引
-- 在原有的 events(player_id, created_at DESC) 基础上加 (player_id, type, created_at DESC)
-- 用于 pickHint() 中"近 24h 该 player 该 ref 是否已经推过"的快速判定。
CREATE INDEX IF NOT EXISTS idx_evt_player_type_time
  ON events(player_id, type, created_at DESC);
