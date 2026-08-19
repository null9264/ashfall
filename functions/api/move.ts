import { getState, saveState } from '../lib/db';
import { canEnterArea, applyMove } from '../lib/rules';
import { viewState } from '../lib/view';
import { json, bad } from '../lib/util';
import type { AreaId } from '../lib/types';

export async function onRequestPost(context: any) {
  const body = await context.request.json().catch(() => ({}));
  const area = body.area as AreaId;
  if (!area) return bad('缺少目标区域');
  const s = await getState(context.env.DB, context.data.playerId);
  const chk = canEnterArea(s, area);
  if (!chk.ok) return bad(chk.reason || '无法前往');
  applyMove(s, area);
  await saveState(context.env.DB, s);
  return json(viewState(s));
}
