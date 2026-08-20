// 组装前端可见视图（仅暴露玩家应知的进度，不泄露全部 flag/条件）
import type { PlayerState } from './types';
import { AREAS, NPCS, QUESTS, HIDDENS, ENDINGS } from './content';
import { evaluateEndings, diffStates } from './rules';

export function viewState(s: PlayerState, nickname: string | null, before?: PlayerState) {
  const area = AREAS[s.area];
  const endings = evaluateEndings(s);
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
    })),
    hiddenFound: HIDDENS.filter((h) => s.flags[h.id]).map((h) => h.name),
    endings: {
      available: endings.available.map((e) => ({ id: e.id, title: e.title })),
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
  };
  // v2.0.2: 如果传入了 before,附上变化清单给前端
  if (before) {
    return { ...base, changes: diffStates(before, s) };
  }
  return base;
}