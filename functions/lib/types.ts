// 灰烬城 · 服务端类型定义（这些只存在于后端，前端不打包）
export type AreaId =
  | 'gate' | 'market' | 'metro' | 'tenements' | 'factory' | 'river' | 'undernet';

export interface ItemDef { id: string; name: string; desc: string; }
export interface AreaDef {
  id: AreaId;
  name: string;
  desc: string;
  // 可从哪些区域移动过来（开放地图连通）
  neighbors: AreaId[];
  danger?: number;          // 进入受到的辐射/危险，需属性支撑
  hiddenPickups?: string[]; // 该区域可拾取的隐藏物品 id
  locked?: boolean;         // 是否默认锁定，需 flag 解锁
  unlockFlag?: string;
}
export interface DialogOption {
  label: string;
  goto?: string;            // 下一对话节点
  acceptQuest?: string;     // 接取任务
  setFlag?: string;         // 设置剧情/隐藏标记
  giveItem?: string;        // 给予物品
  requires?: Req;
}
export interface DialogNode {
  speaker?: string;
  text: string;
  options?: DialogOption[];
}
export interface NpcDef {
  id: string;
  area: AreaId;
  name: string;
  blurb: string;            // 列表里的一句话描述
  nodes: Record<string, DialogNode>;
  start: string;
}
export interface QuestDef {
  id: string;
  name: string;
  area: AreaId;             // 发布区域
  giver?: string;           // 发布 NPC
  summary: string;
  // 可接受的多种解法（多分支）
  methods: QuestMethod[];
  // 接取前置
  requires?: Req;
}
export interface QuestMethod {
  id: string;
  label: string;            // 玩家选择的解法
  // 完成条件（服务端校验）
  completeRequires: Req;
  // 完成后的影响
  effects: Effect[];
  // 是否导向更"硬"的路线（影响结局）
  path?: 'kind' | 'hard' | 'truth' | 'neutral';
}
export interface HiddenDef {
  id: string;
  name: string;
  area: AreaId;
  hint: string;
  // 触发条件组合（全部满足才解锁）
  requires: Req[];
  effects: Effect[];
}
export interface Req {
  flag?: string;
  questDone?: string;
  item?: string;
  itemQty?: number;
  trust?: { npc: string; min: number };
  area?: AreaId;
  attrs?: Partial<Record<'hp' | 'stamina' | 'radiation' | 'reputation' | 'scrap', number>>;
}
export interface Effect {
  flag?: string;
  item?: string;
  itemQty?: number;
  attr?: Partial<Record<'hp' | 'stamina' | 'radiation' | 'reputation' | 'scrap', number>>;
  trust?: { npc: string; delta: number };
  unlockArea?: AreaId;
}
export interface EndingDef {
  id: string;
  title: string;
  tone: string;
  passages: string[];
  // 达成条件（服务端判定）
  requires: Req[];
}

// 玩家状态（全部存 D1）
export interface PlayerState {
  player_id: string;
  area: AreaId;
  attrs: { hp: number; stamina: number; radiation: number; reputation: number; scrap: number };
  inventory: { id: string; name: string; qty: number }[];
  quests: Record<string, { status: 'active' | 'done'; method?: string }>;
  npc: Record<string, { met: boolean; trust: number; stage: number }>;
  flags: Record<string, boolean>;
  ending: string | null;
  finished_at: number | null;
  updated_at: number;
}
