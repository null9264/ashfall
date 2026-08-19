// 拾物 API：每个区域的每个 hiddenPickup 只能拾取一次（v2.0.2 修复）
// 设计依据：工厂/地铁区域每项道具只能获取一次，防止 spam click 刷物品
import { getState, saveState } from '../lib/db';
import { addItem } from '../lib/rules';
import { viewState } from '../lib/view';
import { json, bad } from '../lib/util';
import { logEvent } from '../lib/events';
import { getNickname } from '../lib/nickname';
import { AREAS, ITEMS } from '../lib/content';
import type { AreaId } from '../lib/types';

function isAlreadyPicked(s: any, areaId: AreaId, itemId: string): boolean {
  const pickedArea = s.picked?.[areaId] ?? [];
  return pickedArea.includes(itemId);
}

function markPicked(s: any, areaId: AreaId, itemId: string): void {
  if (!s.picked) s.picked = {};
  if (!s.picked[areaId]) s.picked[areaId] = [];
  if (!s.picked[areaId].includes(itemId)) s.picked[areaId].push(itemId);
}

export async function onRequestPost(context: any) {
  const body = await context.request.json().catch(() => ({}));
  const s = await getState(context.env.DB, context.data.playerId);
  const area = s.area as AreaId;
  const pickups = AREAS[area].hiddenPickups ?? [];
  if (pickups.length === 0) return bad('这里没什么可捡的');
  const nick = await getNickname(context.env.DB, context.data.playerId);

  // 计算本区域尚未被拾走（第一次来）的物品
  const fresh = pickups.filter((it) => !isAlreadyPicked(s, area, it));

  // 指定物品
  if (body.item) {
    if (!ITEMS[body.item]) return bad('没有这样的东西可捡');
    if (!pickups.includes(body.item)) return bad('这里捡不到这个');
    if (isAlreadyPicked(s, area, body.item)) {
      return bad(`${ITEMS[body.item].name} 这里已经捡过了,再翻也翻不出新的`);
    }
    const before = JSON.parse(JSON.stringify(s));
    addItem(s, body.item, 1);
    markPicked(s, area, body.item);
    await saveState(context.env.DB, s);
    await logEvent(context.env.DB, context.data.playerId, 'pickup', String(body.item));
    return json({ ...viewState(s, nick, before), picked: ITEMS[body.item].name });
  }

  // 未指定：捡本区域所有尚未被拾的物品
  if (fresh.length === 0) {
    return bad('这里翻遍了,什么都没有新的');
  }
  const before = JSON.parse(JSON.stringify(s));
  for (const it of fresh) {
    addItem(s, it, 1);
    markPicked(s, area, it);
  }
  await saveState(context.env.DB, s);
  await logEvent(context.env.DB, context.data.playerId, 'pickup', null, { items: fresh });
  return json({ ...viewState(s, nick, before), picked: fresh.map((i) => ITEMS[i].name).join('、') });
}
