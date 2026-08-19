// 匿名身份：httpOnly cookie 携带 player_id，前端无法篡改、无法跳过服务端
import type { Request, Response } from '@cloudflare/workers-types';

const COOKIE = 'ash_player';

export function getPlayerId(req: Request): string | null {
  const c = req.headers.get('cookie');
  if (!c) return null;
  for (const part of c.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === COOKIE && v) return decodeURIComponent(v);
  }
  return null;
}

export function newPlayerId(): string {
  return crypto.randomUUID();
}

export function setPlayerCookie(res: Response, id: string): void {
  res.headers.append(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
  );
}
