// 前端只描述「服务端返回的视图」，不持有任何游戏判定逻辑
export interface AttrChanges {
  attr: Record<string, number>;      // 正/负代表增减
  item: { added: string[]; removed: string[] };
  flags: string[];
}

// v2.0.2: 数值历史面板 — 来自 /api/player/history 的扁平条目
export interface HistoryEntry {
  type: 'move' | 'pickup' | 'talk' | 'quest_accept' | 'quest_complete' | 'hidden' | 'ending' | 'reset' | 'nickname' | 'login' | 'hint' | 'feedback';
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
  quests: {
    id: string; name: string; status: 'open' | 'active' | 'done';
    summary: string;
    category?: 'main' | 'side' | 'secret';
    mainStep?: number;
    milestone?: string;
    methods: { id: string; label: string }[];
  }[];
  npcs: { id: string; name: string; blurb: string; trust?: number; stance?: 'ally' | 'witness' | 'hostile' | 'neutral' }[];
  hiddenFound: string[];
  endings: { available: { id: string; title: string; tone: string; cost?: string; keeps?: string; tone_color?: string }[]; locked: { id: string; title: string; hint: string }[] };
  ending: string | null;
  endingDetail: { id: string; title: string; tone: string; passages: string[] } | null;
  changes?: AttrChanges;
  // v2.0.2: 暗线提示（只在新的一次 /api/state 拉取时附带，前端弹一个小气泡即可）
  hint?: HintItem | null;
  // v2.0.3: 主线进度(0..5)
  mainProgress?: number;
  // v2.0.3: 教程浮层是否首次
  firstTime?: boolean;
  // v2.0.3: 当前天数
  day?: number;
  // v2.0.3: 世界事件(钟声等)— view 一次性返回,前端弹一次后用 ack 标记
  worldEvent?: { id: string; title: string; body: string } | null;
  // v2.0.3 P2: 多周目
  loop?: number;
  endings_seen?: string[];
  // v2.0.3 P2: 解谜面板
  puzzles?: { id: 'p_lockbox' | 'p_sequence' | 'p_wordcode'; title: string; hint: string; done: boolean }[];
  // v2.0.3 P2: 天气
  weather?: { id: string; name: string; icon: string; blurb: string; dangerOffset: number } | null;
}

export interface HintItem {
  id: string;
  kind: 'hidden' | 'quest' | 'npc';
  text: string;
  area: { id: string; name: string };
}
export interface DialogView {
  npc: string;
  node: string;
  speaker?: string;
  text: string;
  options: { label: string; index: number }[];
}

// v2.0.3: 物品定义(只描述公共字段;后端 ITEMS 是这些字段的超集)
export interface ItemDef {
  id: string;
  name: string;
  type: string;
  desc?: string;
  tags?: string[];
  decay?: string;
}
