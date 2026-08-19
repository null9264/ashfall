// 全局身份中间件 + 安全响应头
// - 给所有请求绑定匿名 player_id(httpOnly cookie)
// - 给 Function 响应附加安全相关响应头
import { getPlayerId, newPlayerId, setPlayerCookie } from './lib/identity';

const SECURITY_HEADERS: Record<string, string> = {
  // API 返回 JSON,所以另设 CSP:不允许任何方式加载
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};

export async function onRequest(context: any) {
  let pid = getPlayerId(context.request);
  let created = false;
  if (!pid) { pid = newPlayerId(); created = true; }
  context.data.playerId = pid;
  const res: Response = await context.next();
  if (created) setPlayerCookie(res, pid);
  // Function 响应附加安全头(不覆盖已存在)
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!res.headers.has(k)) res.headers.set(k, v);
  }
  return res;
}
