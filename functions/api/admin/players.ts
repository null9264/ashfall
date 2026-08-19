// 玩家列表 + 单玩家详情
import type { D1Database } from '@cloudflare/workers-types';
import { json, bad } from '../../lib/util';
import { isAdmin, parseCookieToken } from '../../lib/admin';

export async function onRequestGet(context: { request: Request; env: { DB: D1Database } }) {
  const token = parseCookieToken(context.request);
  if (!(await isAdmin(context.env.DB, token))) return bad('需要管理员登录', 401);

  const url = new URL(context.request.url);
  const playerId = url.searchParams.get('player_id');

  const DB = context.env.DB;

  if (playerId) {
    // 单玩家详情
    const state = await DB.prepare('SELECT * FROM player_states WHERE player_id = ?').bind(playerId).first<any>();
    const nickRow = await DB.prepare('SELECT nickname FROM nicknames WHERE player_id = ? ORDER BY created_at DESC LIMIT 1').bind(playerId).first<any>();
    const eventCount = (await DB.prepare('SELECT COUNT(*) AS c FROM events WHERE player_id = ?').bind(playerId).first<any>()).c as number;
    const lastEvent = await DB.prepare('SELECT created_at FROM events WHERE player_id = ? ORDER BY created_at DESC LIMIT 1').bind(playerId).first<any>();
    const recentEvents = await DB.prepare('SELECT type, ref, created_at FROM events WHERE player_id = ? ORDER BY created_at DESC LIMIT 50').bind(playerId).all<any>();
    return json({
      player: {
        id: playerId,
        nickname: nickRow?.nickname ?? null,
        created: state ? state.updated_at : null,
        ending: state?.ending ?? null,
        finished_at: state?.finished_at ?? null,
        area: state?.area ?? null,
        eventCount,
        lastActive: lastEvent?.created_at ?? null,
        recentEvents: recentEvents.results || [],
      },
    });
  }

  // 玩家列表（按昵称 + 状态聚合）
  const rows = await DB.prepare(`
    SELECT
      p.id AS id,
      p.created_at AS created,
      (SELECT nickname FROM nicknames WHERE player_id = p.id ORDER BY created_at DESC LIMIT 1) AS nickname,
      ps.area AS area,
      ps.ending AS ending,
      ps.finished_at AS finished_at,
      ps.updated_at AS updated,
      (SELECT COUNT(*) FROM events WHERE player_id = p.id) AS events
    FROM players p
    LEFT JOIN player_states ps ON ps.player_id = p.id
    GROUP BY p.id
    ORDER BY (SELECT MAX(created_at) FROM events WHERE player_id = p.id) DESC
  `).all<any>();

  return json({ players: rows.results || [], total: rows.results?.length || 0 });
}