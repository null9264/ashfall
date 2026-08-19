// 设置昵称（强制唯一）
import { json, bad } from '../lib/util';
import { logEvent } from '../lib/events';
import { setNickname } from '../lib/nickname';

export async function onRequestPost(context: any) {
  const body = await context.request.json().catch(() => ({}));
  const nickname = String(body.nickname ?? '').trim();
  const result = await setNickname(context.env.DB, context.data.playerId, nickname);
  if (!result.ok) return bad(result.reason);
  await logEvent(context.env.DB, context.data.playerId, 'nickname', nickname);
  return json({ ok: true, nickname });
}