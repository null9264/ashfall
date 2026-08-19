// 服务端校验与判定（防作弊核心：所有前置/条件都在这里判，前端只收结果）
import type { PlayerState, Req, Effect, AreaId, EndingDef } from './types';
import { AREAS, NPCS, QUESTS, HIDDENS, ENDINGS, ITEMS } from './content';

// —— 物品 ——
export function hasItem(s: PlayerState, id: string, qty = 1): boolean {
  const it = s.inventory.find((i) => i.id === id);
  return !!it && it.qty >= qty;
}
export function addItem(s: PlayerState, id: string, qty = 1): void {
  const def = ITEMS[id]; if (!def) return;
  const it = s.inventory.find((i) => i.id === id);
  if (it) it.qty += qty; else s.inventory.push({ id, name: def.name, qty });
}
export function removeItem(s: PlayerState, id: string, qty = 1): void {
  const it = s.inventory.find((i) => i.id === id);
  if (!it) return;
  it.qty -= qty;
  if (it.qty <= 0) s.inventory = s.inventory.filter((i) => i.id !== id);
}

// —— 需求判定（负数 attr 阈值表示 <=）——
export function meetReq(s: PlayerState, req?: Req): boolean {
  if (!req) return true;
  if (req.flag && !s.flags[req.flag]) return false;
  if (req.questDone && s.quests[req.questDone]?.status !== 'done') return false;
  if (req.item && !hasItem(s, req.item, req.itemQty ?? 1)) return false;
  if (req.trust && (s.npc[req.trust.npc]?.trust ?? 0) < req.trust.min) return false;
  if (req.area && s.area !== req.area) return false;
  if (req.attrs) {
    for (const [k, v] of Object.entries(req.attrs)) {
      const cur = s.attrs[k as keyof typeof s.attrs];
      if (v >= 0 && cur < v) return false;
      if (v < 0 && cur > -v) return false;
    }
  }
  return true;
}

function clampAttr(s: PlayerState, k: keyof PlayerState['attrs'], v: number): void {
  let n = s.attrs[k] + v;
  if (k === 'hp' || k === 'stamina') n = Math.max(0, Math.min(100, n));
  if (k === 'radiation') n = Math.max(0, n);
  s.attrs[k] = n;
}

export function applyEffect(s: PlayerState, e?: Effect): void {
  if (!e) return;
  if (e.flag) s.flags[e.flag] = true;
  if (e.item) { const q = e.itemQty ?? 1; if (q >= 0) addItem(s, e.item, q); else removeItem(s, e.item, -q); }
  if (e.attr) for (const [k, v] of Object.entries(e.attr)) clampAttr(s, k as keyof PlayerState['attrs'], v as number);
  if (e.trust) {
    const n = e.trust.npc; s.npc[n] = s.npc[n] ?? { met: true, trust: 0, stage: 0 };
    s.npc[n].trust += e.trust.delta; s.npc[n].met = true;
  }
  if (e.unlockArea) s.flags[`area_${e.unlockArea}_unlocked`] = true;
}

// —— 区域移动 ——
export function canEnterArea(s: PlayerState, area: AreaId): { ok: boolean; reason?: string } {
  const def = AREAS[area];
  if (!def) return { ok: false, reason: '未知区域' };
  if (def.locked && !s.flags[def.unlockFlag!]) return { ok: false, reason: '那里锁着，你还没找到进去的办法。' };
  if (!AREAS[s.area].neighbors.includes(area)) return { ok: false, reason: '你没法直接走到那里，得绕路。' };
  return { ok: true };
}
export function applyMove(s: PlayerState, area: AreaId): void {
  s.area = area;
  const d = AREAS[area].danger ?? 0;
  if (d > 0) { clampAttr(s, 'radiation', d); clampAttr(s, 'hp', -Math.round(d / 2)); }
}

// —— 对话 ——
export function getDialogNode(s: PlayerState, npcId: string, nodeId: string) {
  const npc = NPCS.find((n) => n.id === npcId);
  if (!npc || npc.area !== s.area) return null;
  const node = npc.nodes[nodeId] ?? npc.nodes[npc.start];
  const options = (node.options ?? [])
    .map((o, index) => ({ o, index }))
    .filter(({ o }) => meetReq(s, o.requires))
    .map(({ o, index }) => ({ label: o.label, index }));
  return { speaker: node.speaker, text: node.text, options };
}
export function applyDialogChoice(s: PlayerState, npcId: string, nodeId: string, choiceIndex: number) {
  const npc = NPCS.find((n) => n.id === npcId);
  if (!npc) return { next: null as string | null };
  const node = npc.nodes[nodeId] ?? npc.nodes[npc.start];
  const opt = (node.options ?? []).find((_, i) => i === choiceIndex);
  if (!opt || !meetReq(s, opt.requires)) return { next: null as string | null };
  // 标记 NPC 已见
  s.npc[npcId] = s.npc[npcId] ?? { met: true, trust: 0, stage: 0 };
  s.npc[npcId].met = true;
  if (opt.setFlag) s.flags[opt.setFlag] = true;
  if (opt.giveItem) addItem(s, opt.giveItem, 1);
  if (opt.acceptQuest && !s.quests[opt.acceptQuest]) s.quests[opt.acceptQuest] = { status: 'active' };
  return { next: opt.goto ?? null };
}

// —— 任务 ——
export function canAcceptQuest(s: PlayerState, questId: string): boolean {
  const q = QUESTS.find((x) => x.id === questId);
  if (!q) return false;
  if (s.quests[questId]?.status === 'done') return false;
  if (q.requires && !meetReq(s, q.requires)) return false;
  return true;
}
export function canCompleteQuest(s: PlayerState, questId: string, methodId: string): boolean {
  const q = QUESTS.find((x) => x.id === questId);
  if (!q || s.quests[questId]?.status === 'done') return false;
  const m = q.methods.find((x) => x.id === methodId);
  if (!m) return false;
  return meetReq(s, m.completeRequires);
}
export function completeQuest(s: PlayerState, questId: string, methodId: string): void {
  const q = QUESTS.find((x) => x.id === questId)!;
  const m = q.methods.find((x) => x.id === methodId)!;
  for (const e of m.effects) applyEffect(s, e);
  s.quests[questId] = { status: 'done', method: methodId };
}

// —— 隐藏要素 ——
export function checkHidden(s: PlayerState, hiddenId: string): boolean {
  const h = HIDDENS.find((x) => x.id === hiddenId);
  if (!h) return false;
  if (s.flags[hiddenId]) return false; // 已触发
  return h.requires.every((r) => meetReq(s, r));
}
export function triggerHidden(s: PlayerState, hiddenId: string): boolean {
  if (!checkHidden(s, hiddenId)) return false;
  const h = HIDDENS.find((x) => x.id === hiddenId)!;
  for (const e of h.effects) applyEffect(s, e);
  s.flags[hiddenId] = true;
  return true;
}

// —— 结局判定 ——
export function evaluateEndings(s: PlayerState): { available: EndingDef[]; locked: { id: string; title: string }[] } {
  const available: EndingDef[] = [];
  const locked: { id: string; title: string }[] = [];
  for (const e of ENDINGS) {
    if (e.requires.every((r) => meetReq(s, r))) available.push(e);
    else locked.push({ id: e.id, title: e.title });
  }
  return { available, locked };
}
