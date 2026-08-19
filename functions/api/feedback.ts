// 玩家反馈 API：POST 提交，GET 当前玩家反馈历史
import type { D1Database } from '@cloudflare/workers-types';
import { json, bad } from '../lib/util';
import { logEvent } from '../lib/events';
import { getNickname } from '../lib/nickname';

const VALID_CAT = new Set(['bug', 'suggestion', 'praise', 'other']);
const MIN_LEN = 4;
const MAX_LEN = 1000;

export async function onRequestPost(context: { request: Request; env: { DB: D1Database }; data: { playerId: string } }) {
  const body: any = await context.request.json().catch(() => ({}));
  const category = String(body.category ?? 'other');
  const message = String(body.message ?? '').trim();
  const rating = body.rating === undefined || body.rating === null ? null
    : Math.max(1, Math.min(5, parseInt(String(body.rating), 10) || 0)) || null;
  if (!VALID_CAT.has(category)) return bad('反馈类型无效');
  if (message.length < MIN_LEN) return bad(`反馈内容至少 ${MIN_LEN} 个字符`);
  if (message.length > MAX_LEN) return bad(`反馈内容不能超过 ${MAX_LEN} 个字符`);
  const meta = typeof body.meta === 'object' && body.meta !== null ? JSON.stringify(body.meta) : null;

  const playerId = context.data.playerId;
  const nick = await getNickname(context.env.DB, playerId);
  const now = Date.now();
  await context.env.DB.prepare(
    `INSERT INTO feedback (player_id, nickname, category, rating, message, meta, status, created_at)
     VALUES (?,?,?,?,?,?, 'new', ?)`
  ).bind(playerId, nick, category, rating, message, meta, now).run();
  await logEvent(context.env.DB, playerId, 'feedback', category, { rating });
  return json({ ok: true });
}

export async function onRequestGet(context: { request: Request; env: { DB: D1Database }; data: { playerId: string } }) {
  const rows = await context.env.DB.prepare(
    'SELECT id, category, message, status, created_at, rating FROM feedback WHERE player_id = ? ORDER BY created_at DESC LIMIT 50'
  ).bind(context.data.playerId).all<Record<string, unknown>>();
  return json({ feedback: rows.results || [] });
}