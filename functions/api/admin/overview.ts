// 管理员总览：总玩家数 / 今日活跃 / 7 天趋势 / 事件分布
import type { D1Database } from '@cloudflare/workers-types';
import { json, bad } from '../../lib/util';
import { isAdmin, parseCookieToken } from '../../lib/admin';

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function startOfDayAgo(daysAgo: number): number {
  return startOfToday() - daysAgo * 86400_000;
}
// 构造完整 7 天数组（无数据补 0），保证前端图表不缺柱
function emptyTrend7(): { day: string; c: number }[] {
  const arr: { day: string; c: number }[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400_000);
    arr.push({ day: d.toISOString().slice(0, 10), c: 0 });
  }
  return arr;
}

export async function onRequestGet(context: { request: Request; env: { DB: D1Database } }) {
  const token = parseCookieToken(context.request);
  if (!(await isAdmin(context.env.DB, token))) return bad('需要管理员登录', 401);

  const DB = context.env.DB;
  const totalPlayers = (await DB.prepare('SELECT COUNT(*) AS c FROM players').first<any>()).c as number;
  const totalNicknames = (await DB.prepare('SELECT COUNT(*) AS c FROM nicknames').first<any>()).c as number;
  const totalEvents = (await DB.prepare('SELECT COUNT(*) AS c FROM events').first<any>()).c as number;
  const totalEndings = (await DB.prepare('SELECT COUNT(*) AS c FROM player_states WHERE ending IS NOT NULL').first<any>()).c as number;

  // 今日活跃
  const dau = (await DB.prepare('SELECT COUNT(DISTINCT player_id) AS c FROM events WHERE created_at >= ?').bind(startOfToday()).first<any>()).c as number;

  // 7 天活跃趋势（按天聚合 + 无数据补 0）
  const trendRows = await DB.prepare(`
    SELECT strftime('%Y-%m-%d', created_at/1000, 'unixepoch') AS day, COUNT(DISTINCT player_id) AS c
    FROM events WHERE created_at >= ?
    GROUP BY day
  `).bind(startOfDayAgo(7)).all<any>();
  const trendMap = new Map((trendRows.results || []).map((r: any) => [r.day, r.c]));
  const trend7 = emptyTrend7().map((d) => ({ day: d.day, c: trendMap.get(d.day) || 0 }));

  // 事件类型分布
  const typeRows = await DB.prepare(`
    SELECT type, COUNT(*) AS c FROM events GROUP BY type ORDER BY c DESC
  `).all<any>();

  // 结局分布
  const endingRows = await DB.prepare(`
    SELECT ending, COUNT(*) AS c FROM player_states WHERE ending IS NOT NULL GROUP BY ending ORDER BY c DESC
  `).all<any>();

  return json({
    totalPlayers, totalNicknames, totalEvents, totalEndings, dau,
    trend7,
    typeDist: typeRows.results || [],
    endingDist: endingRows.results || [],
  });
}