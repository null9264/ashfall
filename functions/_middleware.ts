// 全局身份中间件：确保每次请求都绑定一个匿名 player_id（httpOnly cookie）
import { getPlayerId, newPlayerId, setPlayerCookie } from './lib/identity';

export async function onRequest(context: any) {
  let pid = getPlayerId(context.request);
  let created = false;
  if (!pid) { pid = newPlayerId(); created = true; }
  context.data.playerId = pid;
  const res: Response = await context.next();
  if (created) setPlayerCookie(res, pid);
  return res;
}
