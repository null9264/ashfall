import { getState, saveState } from '../../lib/db';
import { canCompleteQuest, completeQuest } from '../../lib/rules';
import { viewState } from '../../lib/view';
import { json, bad } from '../../lib/util';
import { logEvent } from '../../lib/events';
import { getNickname } from '../../lib/nickname';

export async function onRequestPost(context: any) {
  const body = await context.request.json().catch(() => ({}));
  const { questId, methodId } = body;
  if (!questId || !methodId) return bad('缺少任务或解法');
  const s = await getState(context.env.DB, context.data.playerId);
  if (!canCompleteQuest(s, questId, methodId)) {
    return bad('还做不到这一步——也许你缺了某样东西，或还没走到该去的地方。');
  }
  completeQuest(s, questId, methodId);
  await saveState(context.env.DB, s);
  await logEvent(context.env.DB, context.data.playerId, 'quest_complete', String(questId), { methodId });
  const nick = await getNickname(context.env.DB, context.data.playerId);
  return json(viewState(s, nick));
}