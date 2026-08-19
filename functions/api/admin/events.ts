// 事件查询：按 时间 / 类型 / 昵称 筛选
import { json, bad } from '../../lib/util';
import { isAdmin, parseCookieToken } from '../../lib/admin';

export async function onRequestGet(context: any) {
  const token = parseCookieToken(context.request);
  if (!(await isAdmin(context.env.DB, token))) return bad('需要管理员登录', 401);

  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const nickname = url.searchParams.get('nickname');
  const sinceStr = url.searchParams.get('since');
  const untilStr = url.searchParams.get('until');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);

  const where: string[] = [];
  const args: any[] = [];
  if (type) { where.push('e.type = ?'); args.push(type); }
  if (nickname) {
    where.push('n.nickname = ?');
    args.push(nickname);
  }
  if (sinceStr) { where.push('e.created_at >= ?'); args.push(parseInt(sinceStr, 10)); }
  if (untilStr) { where.push('e.created_at <= ?'); args.push(parseInt(untilStr, 10)); }

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