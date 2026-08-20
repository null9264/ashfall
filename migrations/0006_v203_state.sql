-- 灰烬城 Ashfall · v2.0.3 引导四件套
-- 给 player_states 增加教程/提示/天数字段:
--   tutorial_seen    — 是否显示过新手浮层
--   tips_seen        — 物品首次拾取 tip 已登记 id 数组(JSON 字符串)
--   day              — 当前天数(从 1 开始,推进剧情时递增)
--   danger_since     — 最近进入高危区的时间戳(用于驻留扣血)
--   milestones_shown — 已解锁的主线里程碑 id 数组(JSON 字符串)
ALTER TABLE player_states ADD COLUMN tutorial_seen    INTEGER  NOT NULL DEFAULT 0;
ALTER TABLE player_states ADD COLUMN tips_seen        TEXT     NOT NULL DEFAULT '[]';
ALTER TABLE player_states ADD COLUMN day              INTEGER  NOT NULL DEFAULT 1;
ALTER TABLE player_states ADD COLUMN danger_since     INTEGER;
ALTER TABLE player_states ADD COLUMN milestones_shown TEXT     NOT NULL DEFAULT '[]';
