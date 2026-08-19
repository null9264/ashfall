// 前端只描述「服务端返回的视图」，不持有任何游戏判定逻辑
export interface AttrChanges {
  attr: Record<string, number>;      // 正/负代表增减
  item: { added: string[]; removed: string[] };
  flags: string[];
}

// v2.0.2: 数值历史面板 — 来自 /api/player/history 的扁平条目
export interface HistoryEntry {
  type: 'move' | 'pickup' | 'quest_accept' | 'quest_complete' | 'hidden' | 'ending' | 'reset' | 'nickname' | 'login';
  ref: string | null;
  meta: Record<string, any>;
  created_at: number;
}

// v2.0.2: 关键线索面板 — 来自 /api/player/clues 的平坦记录
export interface ClueEntry {
  id: string;
  category: string;   // "幽灵"/"小月"/"真相"/...
  text: string;       // 线索文本
  source: string;     // 来源:哪个 NPC / 隐藏要素
  acquired_at: number;
}
export interface ViewState {
  nickname?: string | null;
  area: { id: string; name: string; desc: string; danger: number; neighbors: { id: string; name: string }[] };
  unlockedAreas: string[];
  attrs: { hp: number; stamina: number; radiation: number; reputation: number; scrap: number };
  inventory: { id: string; name: string; qty: number }[];
  quests: { id: string; name: string; status: 'open' | 'active' | 'done'; summary: string; methods: { id: string; label: string }[] }[];
  npcs: { id: string; name: string; blurb: string }[];
  hiddenFound: string[];
  endings: { available: { id: string; title: string }[]; locked: { id: string; title: string }[] };
  ending: string | null;
  endingDetail: { id: string; title: string; tone: string; passages: string[] } | null;
  changes?: AttrChanges;
}
export interface DialogView {
  npc: string;
  node: string;
  speaker?: string;
  text: string;
  options: { label: string; index: number }[];
}
