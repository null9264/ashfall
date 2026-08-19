import { getState } from '../lib/db';
import { viewState } from '../lib/view';
import { json } from '../lib/util';
import { logEvent } from '../lib/events';
import { getNickname } from '../lib/nickname';

// GET：返回当前玩家 state（附带昵称）
export async function onRequestGet(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  const nick = await getNickname(context.env.DB, context.data.playerId);
  await logEvent(context.env.DB, context.data.playerId, 'login', null, { area: s.area });
  return json(viewState(s, nick));
}