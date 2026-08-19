import { getState, saveState } from '../../lib/db';
import { canAcceptQuest } from '../../lib/rules';
import { viewState } from '../../lib/view';
import { json, bad } from '../../lib/util';
import { logEvent } from '../../lib/events';
import { getNickname } from '../../lib/nickname';
import { QUESTS } from '../../lib/content';

export async function onRequestPost(context: any) {
  const body = await context.request.json().catch(() => ({}));
  const { questId } = body;
  if (!questId) return bad('缺少任务');
  const s = await getState(context.env.DB, context.data.playerId);
  if (!canAcceptQuest(s, questId)) return bad('现在还不能接这个任务');
  const before = JSON.parse(JSON.stringify(s));
  s.quests[questId] = { status: 'active' };
  await saveState(context.env.DB, s);
  const questName = QUESTS.find((q) => q.id === questId)?.name ?? questId;
  await logEvent(context.env.DB, context.data.playerId, 'quest_accept', String(questId), { name: questName });
  const nick = await getNickname(context.env.DB, context.data.playerId);
  return json(viewState(s, nick, before));
}