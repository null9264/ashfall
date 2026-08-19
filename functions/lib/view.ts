// 组装前端可见视图（仅暴露玩家应知的进度，不泄露全部 flag/条件）
import type { PlayerState } from './types';
import { AREAS, NPCS, QUESTS, HIDDENS, ENDINGS } from './content';
import { evaluateEndings } from './rules';

export function viewState(s: PlayerState, nickname: string | null) {
  const area = AREAS[s.area];
  const endings = evaluateEndings(s);
  return {
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
        id: q.id, name: q.name, status: s.quests[q.id]?.status ?? 'open', summary: q.summary,
        methods: q.methods.map((m) => ({ id: m.id, label: m.label })),
      })),
    npcs: NPCS.filter((n) => n.area === s.area).map((n) => ({ id: n.id, name: n.name, blurb: n.blurb })),
    hiddenFound: HIDDENS.filter((h) => s.flags[h.id]).map((h) => h.name),
    endings: {
      available: endings.available.map((e) => ({ id: e.id, title: e.title })),
      locked: endings.locked.map((e) => ({ id: e.id, title: e.title })),
    },
    ending: s.ending,
    endingDetail: s.ending ? ENDINGS.find((e) => e.id === s.ending) ?? null : null,
  };
}
