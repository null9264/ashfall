// v2.0.3 P2: 邮箱 endpoint
// GET /api/mail        — 列出可用信件(已触发)
// POST /api/mail { id } — 标记录件已读
import { getState, saveState } from '../lib/db';
import { json, bad } from '../lib/util';
import { logEvent } from '../lib/events';
import { listAvailableMails, isRead, markRead } from '../lib/mail';

export async function onRequestGet(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  const mails = listAvailableMails(s).map((m) => ({
    id: m.id, from: m.from, subject: m.subject, body: m.body, read: isRead(s, m),
  }));
  return json({ mails, unread: mails.filter((m) => !m.read).length });
}

export async function onRequestPost(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  let body: any = {};
  try { body = await context.request.json(); } catch { body = {}; }
  const id = String(body.id || '');
  const available = listAvailableMails(s);
  const m = available.find((x) => x.id === id);
  if (!m) return bad('没有这封信或你还没触发它。');
  if (markRead(s, m)) {
    await saveState(context.env.DB, s);
    await logEvent(context.env.DB, context.data.playerId, 'mail', id, { read: true });
  }
  return json({ ok: true });
}