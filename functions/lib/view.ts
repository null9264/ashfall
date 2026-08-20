// 组装前端可见视图（仅暴露玩家应知的进度，不泄露全部 flag/条件）
import type { PlayerState, AreaDef, Req } from './types';
import { AREAS, NPCS, QUESTS, HIDDENS, ENDINGS } from './content';
import { evaluateEndings, diffStates } from './rules';

// v2.0.3: NPC 立场推断 — 根据玩家当前持有的物品/已解锁 flag 推断 NPC 的潜在阵营
// 目的:不再让 NPC 神秘化,玩家可以根据线索推测"这个人可能帮得上忙"
function inferStance(npcId: string, s: PlayerState): 'ally' | 'witness' | 'hostile' | 'neutral' {
  const has = (id: string) => !!s.inventory.find((i) => i.id === id);
  const flag = (k: string) => !!s.flags[k];
  const npcTrust = s.npc[npcId]?.trust ?? 0;
  switch (npcId) {
    case 'yun':       return npcTrust >= 3 ? 'ally' : 'witness';
    case 'zhou':      return npcTrust >= 2 ? 'ally' : 'neutral';
    case 'scar':      return (has('photo') && flag('truth_photo')) ? 'ally' : 'hostile';
    case 'manman':    return npcTrust >= 4 ? 'ally' : 'witness';
    case 'doctor':    return flag('rewarded_by_doctor') ? 'ally' : 'neutral';
    case 'singer':    return flag('met_singer') ? 'ally' : 'neutral';
    case 'ghost':     return flag('fed_ghost') ? 'ally' : 'witness';
    case 'linshen':   return flag('saved_wu') ? 'ally' : 'witness';
    case 'teen':      return flag('knows_bunker') ? 'ally' : 'neutral';
    case 'wu':        return flag('saved_wu') ? 'ally' : 'witness';
    case 'foreman':   return flag('foreman_refused') ? 'hostile'
                            : flag('truth_evidence') ? 'witness'
                            : 'hostile';
    case 'tech':      return flag('freed_tech') ? 'ally' : 'hostile';
    case 'boatman':   return (flag('paid_boat') || flag('has_undermap')) ? 'ally' : 'neutral';
    case 'mute':      return flag('truth_photo') ? 'ally' : 'witness';
    case 'echo':      return has('echo_core') ? 'ally' : 'witness';
    default:          return 'neutral';
  }
}

// v2.0.3 钟声 world event — 满足 h_bell 全部前置且未听过时,在 undernet 推一个事件给前端弹窗
function meetReqShim(s: PlayerState, r: Req): boolean {
  if (r.flag) return !!s.flags[r.flag];
  return true;
}

function checkWorldEvents(s: PlayerState, area: AreaDef): { id: string; title: string; body: string } | null {
  if (s.flags['heard_bell']) return null;
  if (area.id !== 'undernet') return null;
  const need: Req[] = [
    { flag: 'has_echo_core' },
    { flag: 'has_truth' },
    { flag: 'got_map' },
    { flag: 'found_bunker' },
  ];
  for (const r of need) if (!meetReqShim(s, r)) return null;
  return {
    id: 'w_bell',
    title: '钟声响起',
    body: '你听见了来自城市深处的钟声。它先是一声,然后两声,然后连成一片。\n\n回声核心在你胸口振着,像在回应。\n\n那些被删除的名字,现在每个都在钟声里。',
  };
}

export function viewState(s: PlayerState, nickname: string | null, before?: PlayerState) {
  const area = AREAS[s.area];
  const endings = evaluateEndings(s);
  // v2.0.3: 钟声事件
  const worldEvent = checkWorldEvents(s, area);
  const base = {
    nickname,
    area: {
      id: area.id, name: area.name, desc: area.desc, danger: area.danger ?? 0,
      neighbors: area.neighbors.map((id) => ({ id, name: AREAS[id].name })),
    },
    unlockedAreas: Object.values(AREAS).filter((a) => !a.locked || s.flags[a.unlockFlag!]).map((a) => a.name),
    attrs: s.attrs,
    inventory: s.inventory,
    quests: QUESTS
      .filter((q) => s.quests[q.id] || q.area === s.area)
      .map((q) => ({
        id: q.id, name: q.name,
        status: s.quests[q.id]?.status ?? 'open', summary: q.summary,
        category: q.category ?? 'side',
        mainStep: q.mainStep,
        milestone: q.milestone,
        methods: q.methods.map((m) => ({ id: m.id, label: m.label })),
      })),
    npcs: NPCS.filter((n) => n.area === s.area).map((n) => ({
      id: n.id, name: n.name, blurb: n.blurb,
      // v2.0.3: trust 公开(0..5)，让玩家看得见亲善进展
      trust: Math.min(5, Math.max(0, s.npc[n.id]?.trust ?? 0)),
      // v2.0.3: 立场 — 让玩家根据持有物品和剧情推测 NPC 是潜在帮忙者/受害者/旁观者
      stance: inferStance(n.id, s),
    })),
    hiddenFound: HIDDENS.filter((h) => s.flags[h.id]).map((h) => h.name),
    endings: {
      available: endings.available.map((e) => ({
        id: e.id,
        title: e.title,
        tone: e.tone,
        // v2.0.3: 把 cost/keeps 一并暴露给前端 modal
        cost: e.cost,
        keeps: e.keeps,
        tone_color: e.tone_color,
      })),
      locked: endings.locked.map((e) => ({
        id: e.id,
        title: e.title,
        hint: (ENDINGS.find((en) => en.id === e.id)?.hint) ?? '条件未达成',
      })),
    },
    ending: s.ending,
    endingDetail: s.ending ? ENDINGS.find((e) => e.id === s.ending) ?? null : null,
    // v2.0.3: 主线进度(0..5)，前端可渲染进度条
    mainProgress: [1, 2, 3, 4, 5].filter((step) =>
      QUESTS.some((q) => q.mainStep === step && s.quests[q.id]?.status === 'done'),
    ).length,
    // v2.0.3: 教程浮层是否首次(给前端判断)
    firstTime: !s.tutorial_seen,
    // v2.0.3: 当前天数
    day: s.day ?? 1,
    // v2.0.3: 钟声 world event(玩家满足条件时返回 modal 内容;前端展示一次)
    worldEvent: worldEvent,
  };
  // v2.0.2: 如果传入了 before,附上变化清单给前端
  if (before) {
    return { ...base, changes: diffStates(before, s) };
  }
  return base;
}