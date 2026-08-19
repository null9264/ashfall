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
    inventory: [], quests: {}, npc: {}, flags: {}, ending: null, finished_at: null, updated_at: now(),
  };
  await DB.prepare(
    `INSERT INTO player_states (player_id, area, attrs, inventory, quests, npc, flags, ending, finished_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, init.area, JSON.stringify(init.attrs), JSON.stringify(init.inventory), JSON.stringify(init.quests),
    JSON.stringify(init.npc), JSON.stringify(init.flags), init.ending, init.finished_at, init.updated_at).run();
  await DB.prepare('INSERT OR IGNORE INTO players (id, created_at) VALUES (?,?)').bind(id, now()).run();
  return init;
}

export async function getState(DB: D1Database, id: string): Promise<PlayerState> {
  const row = await DB.prepare('SELECT * FROM player_states WHERE player_id = ?').bind(id).first<any>();
  if (!row) return ensurePlayer(DB, id);
  return rowToState(row);
}

export async function saveState(DB: D1Database, s: PlayerState): Promise<void> {
  s.updated_at = now();
  await DB.prepare(
    `UPDATE player_states SET area=?, attrs=?, inventory=?, quests=?, npc=?, flags=?, ending=?, finished_at=?, updated_at=?
     WHERE player_id=?`
  ).bind(s.area, JSON.stringify(s.attrs), JSON.stringify(s.inventory), JSON.stringify(s.quests),
    JSON.stringify(s.npc), JSON.stringify(s.flags), s.ending, s.finished_at, s.updated_at, s.player_id).run();
}

function rowToState(r: any): PlayerState {
  return {
    player_id: r.player_id, area: r.area,
    attrs: JSON.parse(r.attrs), inventory: JSON.parse(r.inventory),
    quests: JSON.parse(r.quests), npc: JSON.parse(r.npc), flags: JSON.parse(r.flags),
    ending: r.ending, finished_at: r.finished_at, updated_at: r.updated_at,
  };
}
