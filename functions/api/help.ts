// v2.0.3 P1: 玩家主动点击"我卡住了"时调用
// 无视冷却与卡住阈值,直接返回当前最相关的一条提示
import { getState } from '../lib/db';
import { json } from '../lib/util';
import { pickHelp } from '../lib/hints';

export async function onRequestPost(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  const help = pickHelp(s, s.area);
  return json({ help });
}
