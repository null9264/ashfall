// 响应工具
export function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
export function bad(msg: string, status = 400): Response {
  // v2.0.3 P2: 错误体加 code + hint 字段,前端能识别并给友好提示
  const code =
    status === 401 ? 'UNAUTHENTICATED' :
    status === 403 ? 'FORBIDDEN' :
    status === 404 ? 'NOT_FOUND' :
    status === 409 ? 'CONFLICT' :
    status === 429 ? 'RATE_LIMIT' :
    status >= 500 ? 'SERVER_ERROR' : 'BAD_REQUEST';
  return json({ error: msg, code, hint: getHint(code) }, status);
}

// 给常见错误给前端友好的提示
function getHint(code: string): string {
  switch (code) {
    case 'UNAUTHENTICATED': return '登录已过期,请重新登记昵称。';
    case 'FORBIDDEN': return '你没有这个操作的权限。';
    case 'NOT_FOUND': return '目标不存在,可能已被拾取或对话已结束。';
    case 'CONFLICT': return '状态冲突,刷新后再试。';
    case 'RATE_LIMIT': return '操作太频繁,稍等几秒再试。';
    case 'SERVER_ERROR': return '服务暂时不可用,请刷新或稍后再试。';
    default: return '';
  }
}

// v2.0.3 P2: 5xx 兜底 — 给 _middleware.ts 用
export function serverError(err: any): Response {
  console.error('[server_error]', err);
  return json({
    error: '服务暂时不可用',
    code: 'SERVER_ERROR',
    hint: '我们正在修复,请稍后重试。如果你看到这条消息,可以反馈给我们。',
  }, 500);
}
