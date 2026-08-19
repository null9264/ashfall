// 管理员认证：账号密码 -> 颁发 session token
import type { D1Database } from '@cloudflare/workers-types';
import { sha256 } from './crypto';

const SESSION_MS = 1000 * 60 * 60 * 24; // 24 小时

// Pages Direct Upload 模式下无法通过 dashboard 注入环境变量，使用硬编码 fallback。
// 这些值仅作为兜底。建议未来通过 connect-to-git 接入后改为 env 注入。
const FALLBACK_ADMIN_USER = 'admin';
const FALLBACK_ADMIN_PASS = 'Ashfall@2026';

export interface EnvWithAdmin {
  ADMIN_USER?: string;
  ADMIN_PASS?: string;
  DB: D1Database;
}

export async function login(DB: D1Database, user: string, pass: string, env: EnvWithAdmin): Promise<string | null> {
  // 优先用 env（部署后通过 dashboard/CLI 注入），未配则用硬编码 fallback（部署到 Pages Direct Upload 时方便）
  const U = env.ADMIN_USER ?? FALLBACK_ADMIN_USER;
  const P = env.ADMIN_PASS ?? FALLBACK_ADMIN_PASS;
  if (!U || !P) return null;
  if (user !== U || pass !== P) return null;
  const token = sha256(`${user}:${pass}:${Date.now()}:${Math.random()}`);
  const now = Date.now();
  const exp = now + SESSION_MS;
  await DB.prepare('INSERT INTO admin_sessions (token, created_at, expires_at) VALUES (?,?,?)').bind(token, now, exp).run();
  return token;
}

export async function isAdmin(DB: D1Database, token: string | null): Promise<boolean> {
  if (!token) return false;
  const r = await DB.prepare('SELECT expires_at FROM admin_sessions WHERE token = ?').bind(token).first<any>();
  if (!r) return false;
  if (r.expires_at < Date.now()) {
    await DB.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(token).run();
    return false;
  }
  return true;
}

export function parseCookieToken(req: Request, name = 'aadm'): string | null {
  const h = req.headers.get('Cookie') || '';
  for (const part of h.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v || '');
  }
  return null;
}

export function adminCookie(token: string): string {
  return `aadm=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
}

export function clearAdminCookie(): string {
  return 'aadm=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}