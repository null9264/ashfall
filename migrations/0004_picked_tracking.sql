-- 灰烬城 Ashfall · v2.0.2 修复
-- 给 player_states 增加 picked 字段:
--   picked: { areaId: [itemId, ...] }   -- 记录每个区域已成功拾过的物品
-- 这样 pickup 操作只能给玩家"第一次拾"的物品,符合"不可重复"的设计意图
ALTER TABLE player_states ADD COLUMN picked TEXT NOT NULL DEFAULT '{}';
