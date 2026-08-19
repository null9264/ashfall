import { getState, saveState } from '../lib/db';
import { viewState } from '../lib/view';
import { json, bad } from '../lib/util';
import { logEvent } from '../lib/events';
import { getNickname, setNickname } from '../lib/nickname';

// GET：返回当前玩家 state（附带昵称）
export async function onRequestGet(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  const nick = await getNickname(context.env.DB, context.data.playerId);
  return json(viewState(s, nick));
}