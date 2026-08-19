// GET /api/state：返回当前玩家 state（附带昵称 + 暗线提示）
import { getState } from '../lib/db';
import { viewState } from '../lib/view';
import { json } from '../lib/util';
import { logEvent } from '../lib/events';
import { getNickname } from '../lib/nickname';
import { pickHint } from '../lib/hints';

export async function onRequestGet(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  const nick = await getNickname(context.env.DB, context.data.playerId);
  // 静默判断是否有可推暗线提示
  const hint = await pickHint(context.env.DB, context.data.playerId, s, s.area).catch(() => null);
  if (hint) {
    // 把这次推送记录进事件表，作为 24h 冷却的依据；同时用于历史展示
    logEvent(context.env.DB, context.data.playerId, 'hint', hint.refs.ref, {
      id: hint.id,
      kind: hint.refs.kind,
      ref: hint.refs.ref,
      text: hint.text,
      area_id: hint.area.id,
      area_name: hint.area.name,
    });
  }
  return json({ ...viewState(s, nick), hint: hint ?? null });
}