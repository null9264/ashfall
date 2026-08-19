// 管理员反馈列表：按时间倒序，可选类别筛选 + 状态筛选 + 标记已读
import type { D1Database } from '@cloudflare/workers-types';
import { json, bad } from '../../lib/util';
import { isAdmin, parseCookieToken } from '../../lib/admin';

const VALID_CAT = new Set(['bug', 'suggestion', 'praise', 'other']);
const VALID_STATUS = new Set(['new', 'read', 'archived']);

export async function onRequestGet(context: { request: Request; env: { DB: D1Database } }) {
  const token = parseCookieToken(context.request);
  if (!(await isAdmin(context.env.DB, token))) return bad('需要管理员登录', 401);

  const url = new URL(context.request.url);
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10), 500);

  const where: string[] = [];
  const args: (string | number)[] = [];
  if (category) {
    if (!VALID_CAT.has(category)) return bad('category 无效', 400);
    where.push('category = ?'); args.push(category);
  }
  if (status) {
    if (!VALID_STATUS.has(status)) return bad('status 无效', 400);
    where.push('status = ?'); args.push(status);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const DB = context.env.DB;
  // 同时返回分类分布与状态分布供后台统计
  const [list, catDist, statDist, totalNew] = await Promise.all([
    DB.prepare(
      `SELECT id, player_id, nickname, category, rating, message, meta, status, created_at, read_at
       FROM feedback ${whereSql} ORDER BY created_at DESC LIMIT ?`
    ).bind(...args, limit).all<Record<string, unknown>>(),
    DB.prepare(`SELECT category, COUNT(*) AS c FROM feedback GROUP BY category ORDER BY c DESC`).all<Record<string, unknown>>(),
    DB.prepare(`SELECT status, COUNT(*) AS c FROM feedback GROUP BY status`).all<Record<string, unknown>>(),
    DB.prepare(`SELECT COUNT(*) AS c FROM feedback WHERE status = 'new'`).first<any>(),
  ]);

  return json({
    feedback: list.results || [],
    catDist: catDist.results || [],
    statDist: statDist.results || [],
    newCount: totalNew?.c || 0,
    total: list.results?.length || 0,
  });
}

// POST: 标记已读/已归档/未读
export async function onRequestPost(context: { request: Request; env: { DB: D1Database } }) {
  const token = parseCookieToken(context.request);
  if (!(await isAdmin(context.env.DB, token))) return bad('需要管理员登录', 401);
  const body: any = await context.request.json().catch(() => ({}));
  const id = parseInt(String(body.id ?? ''), 10);
  const status = String(body.status ?? '');
  if (!id || !VALID_STATUS.has(status)) return bad('参数无效', 400);
  const readAt = status === 'read' || status === 'archived' ? Date.now() : null;
  await context.env.DB.prepare(
    'UPDATE feedback SET status = ?, read_at = ? WHERE id = ?'
  ).bind(status, readAt, id).run();
  return json({ ok: true });
}