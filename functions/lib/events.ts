// 事件埋点：D1 events 表写入
import type { D1Database } from '@cloudflare/workers-types';

export type EventType =
  | 'move' | 'talk' | 'pickup' | 'quest_accept' | 'quest_complete'
  | 'hidden' | 'ending' | 'reset' | 'nickname' | 'login' | 'feedback'
  | 'hint' | 'tutorial_dismiss';

export async function logEvent(
  DB: D1Database,
  player_id: string,
  type: EventType,
  ref: string | null = null,
  meta: Record<string, any> = {}
): Promise<void> {
  try {
    await DB.prepare(
      'INSERT INTO events (player_id, type, ref, meta, created_at) VALUES (?,?,?,?,?)'
    ).bind(player_id, type, ref, JSON.stringify(meta), Date.now()).run();
  } catch (e) {
    // 埋点失败不应阻断主流程
    console.error('logEvent failed', e);
  }
}