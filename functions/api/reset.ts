import { getState, saveState } from '../lib/db';
import { viewState } from '../lib/view';
import { json } from '../lib/util';
import { logEvent } from '../lib/events';
import { START_AREA } from '../lib/content';

// 重置当前玩家进度（仅清自己的存档，重新开始）
export async function onRequestPost(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  s.area = START_AREA;
  s.attrs = { hp: 100, stamina: 100, radiation: 0, reputation: 0, scrap: 0 };
  s.inventory = []; s.quests = {}; s.npc = {}; s.flags = {}; s.ending = null; s.finished_at = null;
  await saveState(context.env.DB, s);
  await logEvent(context.env.DB, context.data.playerId, 'reset');
  return json(viewState(s));
}