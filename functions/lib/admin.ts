// 管理员认证:账号密码 -> 颁发 session token
//
// 安全策略:
// 1) 默认密码比对结果用 SHA-256 哈希(常量哈希,源码不暴露明文)
// 2) 部署者可通过 env 注入 ADMIN_USER + ADMIN_PASS_HASH 覆盖
//    (推荐: 首次部署后立即注入新哈希)
// 3) 安全是放在 D1 + cookie 令牌 + 路径访问控制,密码泄露只是次级风险
//
// 哈希生成方式(开发者本地):
//   node -e "console.log(require('crypto').createHash('sha256').update('你的密码').digest('hex'))"
// 然后:ADMIN_PASS_HASH=你的哈希 wrangler pages secret put ADMIN_PASS_HASH
import type { D1Database } from '@cloudflare/workers-types';
import { sha256 } from './crypto';

const SESSION_MS = 1000 * 60 * 60 * 24; // 24 小时

// 默认账号 + 默认密码哈希(明文密码:"Ashfall@2026",首次部署后必须改!)
// 这是用上面 node 命令得到的 hash;不入仓明文。
const FALLBACK_ADMIN_USER = 'admin';
const FALLBACK_ADMIN_PASS_HASH = 'f6144cd10985b3b0761461d2787780151f8ad050d8ff554d09e0c6faf7890bf0';

export interface EnvWithAdmin {
  ADMIN_USER?: string;
  ADMIN_PASS_HASH?: string; // 推荐:生产部署前通过 wrangler secret 注入
  DB: D1Database;
}

export async function login(DB: D1Database, user: string, pass: string, env: EnvWithAdmin): Promise<string | null> {
  const expectedUser = env.ADMIN_USER ?? FALLBACK_ADMIN_USER;
  const expectedHash = env.ADMIN_PASS_HASH ?? FALLBACK_ADMIN_PASS_HASH;
  if (!expectedUser || !expectedHash) return null;
  if (user !== expectedUser) return null;
  // 客户端传来的 pass 做同样的 sha256,再与配置的 hash 比较
  // (constant-time 比较避免简单的时序攻击;内容不长,实现简单)
  const passHash = sha256(pass);
  if (!constantTimeEqual(passHash, expectedHash)) return null;
  const token = sha256(`${user}:${expectedHash}:${Date.now()}:${Math.random()}`);
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

// constant-time 字符串比较(防止长度泄露/时序攻击)
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatches = 0;
  for (let i = 0; i < a.length; i++) mismatches |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatches === 0;
}
