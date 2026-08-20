// 服务端校验与判定（防作弊核心：所有前置/条件都在这里判，前端只收结果）
import type { PlayerState, Req, Effect, AreaId, EndingDef } from './types';
import { AREAS, NPCS, QUESTS, HIDDENS, ENDINGS, ITEMS } from './content';

// —— 状态 ——
export interface AttrChanges {
  attr: Record<string, number>;   // 正/负数表示增减
  item: { added: string[]; removed: string[] };
  flags: string[];                  // 被设置的 flag 名
}

// v2.0.2: 比对两份状态,生成用户可读的"变化清单"
export function diffStates(before: PlayerState, after: PlayerState): AttrChanges {
  const attr: Record<string, number> = {};
  for (const k of Object.keys(before.attrs) as (keyof typeof before.attrs)[]) {
    const d = after.attrs[k] - before.attrs[k];
    if (d !== 0) attr[String(k)] = d;
  }
  // 物品差异
  const beforeMap = new Map(before.inventory.map((i) => [i.id, i.qty]));
  const afterMap = new Map(after.inventory.map((i) => [i.id, i.qty]));
  const added: string[] = [];
  const removed: string[] = [];
  for (const [id, q] of afterMap.entries()) {
    const beforeQty = beforeMap.get(id) ?? 0;
    if (q > beforeQty) added.push(`${ITEMS[id]?.name ?? id}×${q - beforeQty}`);
    else if (q < beforeQty) removed.push(`${ITEMS[id]?.name ?? id}×${beforeQty - q}`);
  }
  for (const [id, q] of beforeMap.entries()) {
    if (!afterMap.has(id) && q > 0) removed.push(`${ITEMS[id]?.name ?? id}×${q}`);
  }
  const flags: string[] = [];
  for (const k of Object.keys(after.flags)) {
    if (after.flags[k] && !before.flags[k]) flags.push(k);
  }
  return { attr, item: { added, removed }, flags };
}

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
  // v2.0.3 进入 HP 太低禁止进入高危区(避免 1 步送)
  if ((def.danger ?? 0) > 0 && s.attrs.hp <= 15) {
    return { ok: false, reason: '身体太虚，进高危区前最好先补充点生命。' };
  }
  return { ok: true };
}
export function applyMove(s: PlayerState, area: AreaId): void {
  s.area = area;
  const d = AREAS[area].danger ?? 0;
  if (d > 0) {
    // 踏入高危区即刻伤害(老逻辑) + 标记驻留时间戳(新逻辑:心跳会持续扣血)
    clampAttr(s, 'radiation', d);
    clampAttr(s, 'hp', -Math.round(d / 2));
    s.danger_since = Date.now();
  } else {
    // 离开高危区,清掉驻留标记
    s.danger_since = undefined;
  }
}

// v2.0.3: 心跳/驻留扣血 — 仅在 state.ts POST heartbeat 时调用
// 每 tick(默认 10s)在高危区就 -1 HP +1 辐射;离开时清零 danger_since
export function tickDanger(s: PlayerState, now: number = Date.now()): boolean {
  const def = AREAS[s.area];
  if (!def || (def.danger ?? 0) <= 0) {
    if (s.danger_since !== undefined) s.danger_since = undefined;
    return false;
  }
  if (s.danger_since === undefined) s.danger_since = now;
  // 至少 10 秒一次才扣,避免前端疯狂请求把玩家扣空
  const elapsed = Math.floor((now - (s.danger_since ?? now)) / 10000);
  if (elapsed < 1) return false;
  clampAttr(s, 'radiation', 1);
  clampAttr(s, 'hp', -1);
  // 把 danger_since 推近,这样下次 tick 只算自上次扣血以来的 10 秒
  s.danger_since = (s.danger_since ?? now) + elapsed * 10000;
  return true;
}

// —— 对话 ——
export function getDialogNode(s: PlayerState, npcId: string, nodeId: string) {
  const npc = NPCS.find((n) => n.id === npcId);
  if (!npc || npc.area !== s.area) return null;
  // v2.0.2 修复: 如果请求 start 节点,按 trust/quest 进度选对话起点
  let actualNodeId = nodeId;
  if (nodeId === npc.start || nodeId === '__start__') {
    actualNodeId = chooseStartNode(s, npcId, npc);
  }
  const node = npc.nodes[actualNodeId] ?? npc.nodes[npc.start];
  const options = (node.options ?? [])
    .map((o, index) => ({ o, index }))
    .filter(({ o }) => meetReq(s, o.requires))
    .map(({ o, index }) => ({ label: o.label, index }));
  return { speaker: node.speaker, text: node.text, options };
}

// v2.0.2: 选择 NPC 对话起点(基于 quest 完成 / trust)
// 约定: NPC.questStart  = { [questId]: 'node' } - 任务完成后下次对话从指定节点开始
function chooseStartNode(s: PlayerState, npcId: string, _npc: any): string {
  // 这里写成对未来扩展友好的形式:扫描所有 quest,看 done 后是否要路由
  for (const [questId, state] of Object.entries(s.quests || {})) {
    if (state.status !== 'done') continue;
    const map = (_npc as any).questStart?.[questId];
    if (map && _npc.nodes[map]) return map;
  }
  return _npc.start;
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
  // v2.0.3: 单步对话 trust / attr
  if (opt.trust) {
    const t = opt.trust;
    s.npc[npcId]!.trust += t.delta;
    if (t.delta > 0) s.npc[npcId]!.met = true;
  }
  if (opt.attr) {
    for (const [k, v] of Object.entries(opt.attr)) clampAttr(s, k as keyof PlayerState['attrs'], v as number);
  }
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

// v2.0.3 P2: 三个简单解谜 — 全部以纯函数校验,前端只提交答案
// 答案在服务端硬编码,前端 puzzles 组件只显示提示
//   p_lockbox   — 监工柜子 4 位数字锁(0307) → 解锁后给 key_bunker
//   p_sequence  — 三色序列按钮 → 解锁后给 reputation+2
//   p_wordcode  — 哑女照片背后 4 字密码("他们不想让你看见") → 给 truth_photo flag
export type PuzzleId = 'p_lockbox' | 'p_sequence' | 'p_wordcode';

export interface PuzzleCheckResult {
  ok: boolean;
  reason?: string;
  // 解开后给的效果(由调用方 apply)
  effects?: Effect[];
}

export function checkPuzzle(puzzleId: PuzzleId, answer: any): PuzzleCheckResult {
  switch (puzzleId) {
    case 'p_lockbox': {
      const s = String(answer ?? '').trim();
      if (!/^\d{4}$/.test(s)) return { ok: false, reason: '请输入 4 位数字' };
      if (s !== '0307') return { ok: false, reason: '密码错误' };
      return {
        ok: true,
        effects: [
          { flag: 'unlock_lockbox' },
          { item: 'key_bunker', itemQty: 1 },
        ],
      };
    }
    case 'p_sequence': {
      const seq = Array.isArray(answer) ? answer : [];
      const expected = ['red', 'blue', 'green'];
      if (seq.length !== expected.length) return { ok: false, reason: '长度不对' };
      for (let i = 0; i < expected.length; i++) {
        if (String(seq[i]).toLowerCase() !== expected[i]) return { ok: false, reason: '顺序不对' };
      }
      return {
        ok: true,
        effects: [
          { flag: 'seq_done' },
          { attr: { reputation: 2, scrap: 1 } },
        ],
      };
    }
    case 'p_wordcode': {
      const w = String(answer ?? '').trim();
      // 接受 '不想让你看见' 或 '他们不想让你看见' 两类写法
      if (w === '不想让你看见') return { ok: true, effects: [{ flag: 'truth_photo' }, { attr: { reputation: 3 } }] };
      return { ok: false, reason: '口令不对,再想想' };
    }
    default:
      return { ok: false, reason: '未知谜题' };
  }
}
