import { getState, saveState } from '../lib/db';
import { addItem } from '../lib/rules';
import { viewState } from '../lib/view';
import { json, bad } from '../lib/util';
import { logEvent } from '../lib/events';
import { getNickname } from '../lib/nickname';
import { AREAS, ITEMS } from '../lib/content';

export async function onRequestPost(context: any) {
  const body = await context.request.json().catch(() => ({}));
  const s = await getState(context.env.DB, context.data.playerId);
  const pickups = AREAS[s.area].hiddenPickups ?? [];
  if (pickups.length === 0) return bad('这里没什么可捡的');
  const nick = await getNickname(context.env.DB, context.data.playerId);

  // 指定物品
  if (body.item) {
    if (!ITEMS[body.item]) return bad('没有这样的东西可捡');
    if (!pickups.includes(body.item)) return bad('这里捡不到这个');
    addItem(s, body.item, 1);
    await saveState(context.env.DB, s);
    await logEvent(context.env.DB, context.data.playerId, 'pickup', String(body.item));
    return json({ ...viewState(s, nick), picked: ITEMS[body.item].name });
  }

  // 未指定：捡当前区域所有可捡物各一个
  for (const it of pickups) addItem(s, it, 1);
  await saveState(context.env.DB, s);
  await logEvent(context.env.DB, context.data.playerId, 'pickup', null, { items: pickups });
  return json({ ...viewState(s, nick), picked: pickups.map((i) => ITEMS[i].name).join('、') });
}