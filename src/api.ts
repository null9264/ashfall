import type { ViewState, DialogView, HistoryEntry, ClueEntry, ItemDef } from './types';

const NICK_STORAGE_KEY = 'ashfall_nickname';

export function getSavedNickname(): string | null {
  try {
    const v = localStorage.getItem(NICK_STORAGE_KEY);
    return v && v.length <= 16 ? v : null;
  } catch {
    return null;
  }
}

export function setSavedNickname(nick: string | null): void {
  try {
    if (nick && nick.length > 0 && nick.length <= 16) {
      localStorage.setItem(NICK_STORAGE_KEY, nick);
    } else {
      localStorage.removeItem(NICK_STORAGE_KEY);
    }
  } catch {
    /* localStorage unavailable */
  }
}

async function req(path: string, method = 'GET', body?: any): Promise<any> {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败');
  // 任何包含 nickname 字段的响应，都同步缓存到 localStorage，作为后端响应丢失时的兜底
  if (data && typeof data === 'object' && typeof data.nickname === 'string' && data.nickname.length > 0) {
    setSavedNickname(data.nickname);
  }
  return data;
}

export const api = {
  state: () => req('/api/state') as Promise<ViewState>,
  setNickname: (nickname: string) => req('/api/nickname', 'POST', { nickname }) as Promise<{ ok: true; nickname: string }>,
  move: (area: string) => req('/api/move', 'POST', { area }) as Promise<ViewState>,
  talkStart: (npc: string) => req('/api/talk', 'POST', { npc }) as Promise<DialogView>,
  talkChoice: (npc: string, node: string, choice: number) =>
    req('/api/talk', 'POST', { npc, node, choice }) as Promise<DialogView & { closed?: boolean }>,
  acceptQuest: (id: string) => req('/api/quest/accept', 'POST', { questId: id }) as Promise<ViewState>,
  completeQuest: (id: string, methodId: string) =>
    req('/api/quest/complete', 'POST', { questId: id, methodId }) as Promise<ViewState>,
  pickup: (item: string) => req('/api/pickup', 'POST', { item }) as Promise<ViewState & { picked?: string }>,
  searchHidden: () => req('/api/trigger-hidden', 'POST', {}) as Promise<ViewState & { found?: string }>,
  poke: (what: string) => req('/api/poke', 'POST', { what }) as Promise<ViewState & { text?: string }>,
  endingList: () => req('/api/ending'),
  endingChoose: (id: string) => req('/api/ending', 'POST', { id }),
  reset: () => req('/api/reset', 'POST') as Promise<ViewState>,
  submitFeedback: (data: { category: string; message: string; rating?: number; meta?: any }) =>
    req('/api/feedback', 'POST', data) as Promise<{ ok: true }>,
  // v2.0.2: 数值历史 & 线索日志
  history: (limit = 100) => req('/api/player/history?limit=' + limit) as Promise<{ entries: HistoryEntry[] }>,
  clues: () => req('/api/player/clues') as Promise<{ clues: ClueEntry[] }>,
  // v2.0.3: 物品定义(用于首拾 tip 模态渲染) + 教程已读 ack
  items: () => req('/api/items') as Promise<{ items: ItemDef[] }>,
  dismissTutorial: () => req('/api/state', 'POST', { action: 'dismiss_tutorial' }) as Promise<ViewState>,
  // v2.0.3: 玩家手动标记录制某条 tip 已读(可选;服务端默认基于 items 集合自动 dedupe)
  markItemTipSeen: (itemId: string) =>
    req('/api/state', 'POST', { action: 'item_tip_seen', itemId }) as Promise<ViewState>,
  // v2.0.3: 高危区驻留心跳 — 仅在后端危险区有效,其他地方是空 ack
  heartbeat: () => req('/api/state', 'POST', { action: 'heartbeat' }) as Promise<ViewState>,
  // v2.0.3 P1: 玩家听过钟声 — ack 后服务端把 heard_bell 设上,避免重复推
  ackWorldEvent: (id: string) =>
    req('/api/state', 'POST', { action: 'world_event_seen', eventId: id }) as Promise<ViewState>,
  // v2.0.3 P1: 玩家主动点击"我卡住了",无视冷却直接给一条提示
  help: () => req('/api/help', 'POST', {}) as Promise<{ help: { id: string; kind: 'hidden' | 'quest' | 'npc'; text: string; area: { id: string; name: string } } | null }>,
  // v2.0.3 P2: 解谜接口
  solvePuzzle: (puzzleId: string, answer: any) =>
    req('/api/puzzle', 'POST', { puzzleId, answer }) as Promise<
      { ok: boolean; reason?: string; code?: string; hint?: string; changes?: any; view?: ViewState }
    >,
  // v2.0.3 P2: 邮件 / 制作
  listMails: () => req('/api/mail', 'GET') as Promise<{ mails: Array<{ id: string; from: string; subject: string; body: string; read: boolean }>; unread: number }>,
  readMail: (id: string) => req('/api/mail', 'POST', { id }) as Promise<{ ok: boolean }>,
  listRecipes: () => req('/api/craft', 'GET') as Promise<{ recipes: Array<{ id: string; name: string; desc: string; consumes: Record<string, number>; produces: any; ok: boolean; reason?: string }> }>,
  doCraft: (recipeId: string) => req('/api/craft', 'POST', { recipeId }) as Promise<{ ok: boolean; reason?: string; code?: string; hint?: string; changes?: any; view?: ViewState }>,
};

// ===== Admin =====
export const admin = {
  overview: () => req('/api/admin/overview'),
  events: (q: { type?: string; nickname?: string; since?: number; until?: number; limit?: number }) => {
    const p = new URLSearchParams();
    if (q.type) p.set('type', q.type);
    if (q.nickname) p.set('nickname', q.nickname);
    if (q.since) p.set('since', String(q.since));
    if (q.until) p.set('until', String(q.until));
    if (q.limit) p.set('limit', String(q.limit));
    return req('/api/admin/events?' + p.toString());
  },
  players: (playerId?: string) => req('/api/admin/players' + (playerId ? '?player_id=' + encodeURIComponent(playerId) : '')),
  feedback: (q: { category?: string; status?: string; limit?: number } = {}) => {
    const p = new URLSearchParams();
    if (q.category) p.set('category', q.category);
    if (q.status) p.set('status', q.status);
    if (q.limit) p.set('limit', String(q.limit));
    const qs = p.toString();
    return req('/api/admin/feedback' + (qs ? '?' + qs : ''));
  },
  feedbackUpdate: (id: number, status: 'new' | 'read' | 'archived') =>
    req('/api/admin/feedback', 'POST', { id, status }) as Promise<{ ok: true }>,
};