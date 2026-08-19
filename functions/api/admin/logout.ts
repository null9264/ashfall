// 管理员登出
import { json } from '../../lib/util';
import { clearAdminCookie } from '../../lib/admin';

export async function onRequestPost(context: any) {
  // 简化：清 cookie 即可（不强制清理 db 行，24h 后自动过期）
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': clearAdminCookie(),
    },
  });
}