// 管理员登录
import type { D1Database } from '@cloudflare/workers-types';
import { json, bad } from '../../lib/util';
import { login, adminCookie } from '../../lib/admin';

export async function onRequestPost(context: { request: Request; env: { DB: D1Database; [k: string]: unknown } }) {
  const body: any = await context.request.json().catch(() => ({}));
  const user = String(body.user ?? '');
  const pass = String(body.pass ?? '');
  const token = await login(context.env.DB, user, pass, context.env as any);
  if (!token) return bad('账号或密码错误', 401);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': adminCookie(token),
    },
  });
}