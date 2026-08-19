// 事件查询：按 时间 / 类型 / 昵称 筛选
import type { D1Database } from '@cloudflare/workers-types';
import { json, bad } from '../../lib/util';
import { isAdmin, parseCookieToken } from '../../lib/admin';

const VALID_TYPES = new Set([
  'move', 'talk', 'pickup', 'quest_accept', 'quest_complete',
  'hidden', 'ending', 'reset', 'nickname', 'login',
]);

export async function onRequestGet(context: { request: Request; env: { DB: D1Database } }) {
  const token = parseCookieToken(context.request);
  if (!(await isAdmin(context.env.DB, token))) return bad('需要管理员登录', 401);

  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const nickname = url.searchParams.get('nickname');
  const sinceStr = url.searchParams.get('since');
  const untilStr = url.searchParams.get('until');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);

  // 类型白名单校验（防拼错/防注入异常值）
  if (type && !VALID_TYPES.has(type)) return bad(`无效事件类型: ${type}`, 400);
  // 时间参数必须可解析为数字
  const since = sinceStr ? parseInt(sinceStr, 10) : null;
  const until = untilStr ? parseInt(untilStr, 10) : null;
  if (sinceStr && (isNaN(since as any) || (since as any) < 0)) return bad('since 必须是正整数时间戳', 400);
  if (untilStr && (isNaN(until as any) || (until as any) < 0)) return bad('until 必须是正整数时间戳', 400);

  const where: string[] = [];
  const args: any[] = [];
  if (type) { where.push('e.type = ?'); args.push(type); }
  if (nickname) {
    where.push('n.nickname = ?');
    args.push(nickname);
  }
  if (since !== null) { where.push('e.created_at >= ?'); args.push(since); }
  if (until !== null) { where.push('e.created_at <= ?'); args.push(until); }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const sql = `
    SELECT e.id, e.player_id, e.type, e.ref, e.meta, e.created_at,
           (SELECT nickname FROM nicknames WHERE player_id = e.player_id ORDER BY created_at DESC LIMIT 1) AS nickname
    FROM events e
    LEFT JOIN nicknames n ON n.player_id = e.player_id
    ${whereSql}
    GROUP BY e.id
    ORDER BY e.created_at DESC
    LIMIT ?
  `;
  const rows = await context.env.DB.prepare(sql).bind(...args, limit).all<any>();
  return json({ events: rows.results || [], total: rows.results?.length || 0 });
}