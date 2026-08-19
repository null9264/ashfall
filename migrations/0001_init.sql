-- 灰烬城 Ashfall · D1 初始化
-- 玩家身份表
CREATE TABLE IF NOT EXISTS players (
  id         TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

-- 玩家游戏状态（全部存服务端，前端不持有判定逻辑）
CREATE TABLE IF NOT EXISTS player_states (
  player_id   TEXT PRIMARY KEY,
  area        TEXT    NOT NULL DEFAULT 'gate',     -- 当前所在区域
  attrs       TEXT    NOT NULL DEFAULT '{"hp":100,"stamina":100,"radiation":0,"reputation":0,"scrap":0}',
  inventory   TEXT    NOT NULL DEFAULT '[]',        -- [{id,name,qty}]
  quests      TEXT    NOT NULL DEFAULT '{}',        -- {questId:{status,method,progress}}
  npc         TEXT    NOT NULL DEFAULT '{}',        -- {npcId:{met,trust,stage}}
  flags       TEXT    NOT NULL DEFAULT '{}',        -- {flagId:true} 隐藏/剧情标记
  ending      TEXT,                                 -- 已抵达的结局 id
  finished_at INTEGER,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_states_player ON player_states(player_id);
