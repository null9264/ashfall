import type { ViewState, DialogView } from './types';

async function req(path: string, method = 'GET', body?: any): Promise<any> {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

export const api = {
  state: () => req('/api/state') as Promise<ViewState>,
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
};
