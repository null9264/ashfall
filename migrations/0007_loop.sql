-- 灰烬城 Ashfall · v2.0.3 P2: 多周目
--   loop              — 当前周目(默认 1,reset 不再清零;每通关一次+1)
--   endings_seen      — 历史通关结局 id(JSON 数组),跨周目保留
--   loop_carried_items — 跨周目保留的特殊物品 id(JSON 数组);默认空,
--                        设计上玩家完成某些支线结局后,下个周目会带 1-2 件关键道具
ALTER TABLE player_states ADD COLUMN loop                INTEGER  NOT NULL DEFAULT 1;
ALTER TABLE player_states ADD COLUMN endings_seen        TEXT     NOT NULL DEFAULT '[]';
ALTER TABLE player_states ADD COLUMN loop_carried_items  TEXT     NOT NULL DEFAULT '[]';