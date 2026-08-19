import { getState, saveState } from '../lib/db';
import { evaluateEndings } from '../lib/rules';
import { json, bad } from '../lib/util';
import { logEvent } from '../lib/events';
import { ENDINGS } from '../lib/content';

// GET：列出当前可达成 / 未达成的结局
export async function onRequestGet(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  const { available, locked } = evaluateEndings(s);
  return json({
    available: available.map((e) => ({ id: e.id, title: e.title })),
    locked: locked.map((e) => ({ id: e.id, title: e.title })),
    current: s.ending,
  });
}

// POST：选择并锁定一个已达成的结局
export async function onRequestPost(context: any) {
  const body = await context.request.json().catch(() => ({}));
  const { id } = body;
  const s = await getState(context.env.DB, context.data.playerId);
  const { available } = evaluateEndings(s);
  if (!available.find((e) => e.id === id)) return bad('这个结局你还达不到。');
  s.ending = id;
  s.finished_at = Date.now();
  await saveState(context.env.DB, s);
  await logEvent(context.env.DB, context.data.playerId, 'ending', String(id));
  return json({ ending: ENDINGS[id] });
}