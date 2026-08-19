// 前端只描述「服务端返回的视图」，不持有任何游戏判定逻辑
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
}
export interface DialogView {
  npc: string;
  node: string;
  speaker?: string;
  text: string;
  options: { label: string; index: number }[];
}
