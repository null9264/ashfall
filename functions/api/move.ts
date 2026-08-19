import { getState, saveState } from '../lib/db';
import { canEnterArea, applyMove } from '../lib/rules';
import { viewState } from '../lib/view';
import { json, bad } from '../lib/util';
import { logEvent } from '../lib/events';
import { getNickname } from '../lib/nickname';
import { AREAS } from '../lib/content';
import type { AreaId } from '../lib/types';

export async function onRequestPost(context: any) {
  const body = await context.request.json().catch(() => ({}));
  const area = body.area as AreaId;
  if (!area) return bad('缺少目标区域');
  const s = await getState(context.env.DB, context.data.playerId);
  const chk = canEnterArea(s, area);
  if (!chk.ok) return bad(chk.reason || '无法前往');
  const from = s.area;
  // 快照用于变化提示
  const before = JSON.parse(JSON.stringify(s));
  applyMove(s, area);
  await saveState(context.env.DB, s);
  await logEvent(context.env.DB, context.data.playerId, 'move', String(area), {
    from,
    from_name: AREAS[from]?.name ?? from,
    to_name: AREAS[area]?.name ?? area,
  });
  const nick = await getNickname(context.env.DB, context.data.playerId);
  return json(viewState(s, nick, before));
}