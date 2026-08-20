// D1 访问层（玩家状态全部在服务端）
import type { D1Database } from '@cloudflare/workers-types';
import type { PlayerState } from './types';
import { START_AREA } from './content';

function now() { return Date.now(); }

export async function ensurePlayer(DB: D1Database, id: string): Promise<PlayerState> {
  const row = await DB.prepare('SELECT * FROM player_states WHERE player_id = ?').bind(id).first<any>();
  if (row) return rowToState(row);
  const init: PlayerState = {
    player_id: id, area: START_AREA,
    attrs: { hp: 100, stamina: 100, radiation: 0, reputation: 0, scrap: 0 },
    inventory: [], quests: {}, npc: {}, flags: {},
    // v2.0.2: 用于追踪每区域已拾物品(防止工厂同一道具无限拾)
    picked: { gate: [], market: [], metro: [], tenements: [], factory: [], river: [], undernet: [] },
    ending: null, finished_at: null, updated_at: now(),
    // v2.0.3: 初始值
    tutorial_seen: false,
    tips_seen: [],
    day: 1,
    danger_since: undefined,
    milestones_shown: [],
  };
  // 尝试 v2.0.3 完整 INSERT,失败回退老 schema
  try {
    await DB.prepare(
      `INSERT INTO player_states (player_id, area, attrs, inventory, quests, npc, flags, picked, ending, finished_at, updated_at, tutorial_seen, tips_seen, day, danger_since, milestones_shown)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      id, init.area, JSON.stringify(init.attrs), JSON.stringify(init.inventory), JSON.stringify(init.quests),
      JSON.stringify(init.npc), JSON.stringify(init.flags), JSON.stringify(init.picked),
      init.ending, init.finished_at, init.updated_at,
      0, '[]', 1, null, '[]',
    ).run();
  } catch (e) {
    console.error('[db] ensurePlayer v2.0.3 fallback', e);
    await DB.prepare(
      `INSERT INTO player_states (player_id, area, attrs, inventory, quests, npc, flags, picked, ending, finished_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, init.area, JSON.stringify(init.attrs), JSON.stringify(init.inventory), JSON.stringify(init.quests),
      JSON.stringify(init.npc), JSON.stringify(init.flags), JSON.stringify(init.picked),
      init.ending, init.finished_at, init.updated_at).run();
  }
  await DB.prepare('INSERT OR IGNORE INTO players (id, created_at) VALUES (?,?)').bind(id, now()).run();
  return init;
}

export async function getState(DB: D1Database, id: string): Promise<PlayerState> {
  const row = await DB.prepare('SELECT * FROM player_states WHERE player_id = ?').bind(id).first<any>();
  if (!row) return ensurePlayer(DB, id);
  // 兼容老数据: 没 picked 字段
  if (row.picked === undefined || row.picked === null) row.picked = '{}';
  return rowToState(row);
}

export async function saveState(DB: D1Database, s: PlayerState): Promise<void> {
  s.updated_at = now();
  // v2.0.3: 新字段也写入(列必须先由 0006 迁移加上;老 schema 下 update 会失败,被 catch 兜底)
  try {
    await DB.prepare(
      `UPDATE player_states SET area=?, attrs=?, inventory=?, quests=?, npc=?, flags=?, picked=?, ending=?, finished_at=?, updated_at=?,
         tutorial_seen=?, tips_seen=?, day=?, danger_since=?, milestones_shown=?
       WHERE player_id=?`
    ).bind(
      s.area, JSON.stringify(s.attrs), JSON.stringify(s.inventory), JSON.stringify(s.quests),
      JSON.stringify(s.npc), JSON.stringify(s.flags), JSON.stringify(s.picked),
      s.ending, s.finished_at, s.updated_at,
      s.tutorial_seen ? 1 : 0,
      JSON.stringify(Array.isArray(s.tips_seen) ? s.tips_seen : []),
      typeof s.day === 'number' ? s.day : 1,
      s.danger_since ?? null,
      JSON.stringify(Array.isArray(s.milestones_shown) ? s.milestones_shown : []),
      s.player_id,
    ).run();
  } catch (e) {
    // 兼容老 schema(没有 v2.0.3 列):回退到基础 UPDATE
    console.error('[db] v2.0.3 columns not available, fallback to basic save', e);
    await DB.prepare(
      `UPDATE player_states SET area=?, attrs=?, inventory=?, quests=?, npc=?, flags=?, picked=?, ending=?, finished_at=?, updated_at=?
       WHERE player_id=?`
    ).bind(s.area, JSON.stringify(s.attrs), JSON.stringify(s.inventory), JSON.stringify(s.quests),
      JSON.stringify(s.npc), JSON.stringify(s.flags), JSON.stringify(s.picked),
      s.ending, s.finished_at, s.updated_at, s.player_id).run();
  }
}

function rowToState(r: any): PlayerState {
  // 防御:任何 JSON 字段为空字符串或解析失败都降级为空值,不要 throw 把 state 端了
  const parse = <T,>(raw: any, fallback: T): T => {
    if (raw === null || raw === undefined || raw === '') return fallback;
    try { return JSON.parse(raw) as T; } catch (e) {
      console.error('[db] JSON parse failed, using fallback', e);
      return fallback;
    }
  };
  return {
    player_id: r.player_id, area: r.area,
    attrs: parse(r.attrs, { hp: 100, stamina: 100, radiation: 0, reputation: 0, scrap: 0 }),
    inventory: parse(r.inventory, []),
    quests: parse(r.quests, {}),
    npc: parse(r.npc, {}),
    flags: parse(r.flags, {}),
    picked: parse(r.picked, {} as Record<string, string[]>),
    ending: r.ending, finished_at: r.finished_at, updated_at: r.updated_at,
    // v2.0.3: 教程/提示/天数/危险/里程碑 — 列未必存在(老 schema 兼容),必须做存在性 guard
    ...(r.tutorial_seen !== undefined ? { tutorial_seen: !!r.tutorial_seen } : {}),
    ...(r.tips_seen !== undefined ? { tips_seen: parse(r.tips_seen, [] as string[]) } : {}),
    ...(r.day !== undefined ? { day: typeof r.day === 'number' ? r.day : 1 } : {}),
    ...(r.danger_since !== undefined && r.danger_since !== null ? { danger_since: r.danger_since } : {}),
    ...(r.milestones_shown !== undefined ? { milestones_shown: parse(r.milestones_shown, [] as string[]) } : {}),
  };
}
