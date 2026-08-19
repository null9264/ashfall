// v2.0.2: 玩家数值历史（用于"数值记录"面板）
// 返回当前玩家最近 N 条事件日志(扁平结构,前端自行渲染)
import type { D1Database } from '@cloudflare/workers-types';
import { json, bad } from '../../lib/util';

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 200;

export async function onRequestGet(context: { request: Request; env: { DB: D1Database }; data: { playerId: string } }) {
  const url = new URL(context.request.url);
  const limitRaw = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  if (!Number.isFinite(limitRaw) || limitRaw <= 0) return bad('limit 必须为正整数');
  const limit = Math.min(MAX_LIMIT, Math.floor(limitRaw));

  const DB: D1Database = context.env.DB;
  const playerId = context.data.playerId;

  // 按时间倒序拉取
  const { results } = await DB.prepare(
    'SELECT id, type, ref, meta, created_at FROM events WHERE player_id = ? ORDER BY created_at DESC, id DESC LIMIT ?'
  ).bind(playerId, limit).all<Record<string, unknown>>();

  const entries = (results || []).map((r: any) => {
    let meta: Record<string, any> = {};
    try {
      if (r.meta && typeof r.meta === 'string') meta = JSON.parse(r.meta);
      else if (r.meta && typeof r.meta === 'object') meta = r.meta;
    } catch (e) {
      console.error('[history] meta parse failed', e);
    }
    return {
      type: r.type,
      ref: r.ref ?? null,
      meta,
      created_at: r.created_at,
    };
  });

  return json({ entries, limit });
}
