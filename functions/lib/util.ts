// 响应工具
export function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
export function bad(msg: string, status = 400): Response {
  return json({ error: msg }, status);
}
