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
  // v2.0.3: 单步对话效果 — 让 NPC 在关键节点吐露立场时直接给 trust
  trust?: { npc?: string; delta: number };
  // v2.0.3: 单步对话也能扣/加 attr(比如医生 offer 治疗时直接补 hp)
  attr?: Partial<Record<'hp' | 'stamina' | 'radiation' | 'reputation' | 'scrap', number>>;
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
  // v2.0.2: 任务完成后下次对话从哪个节点开始
  //   { questId: 'nodeId' } — 该 quest 完成后,玩家再次找 NPC,对话从这里开始
  questStart?: Record<string, string>;
}
export interface QuestDef {
  id: string;
  name: string;
  area: AreaId;             // 发布区域
  giver?: string;           // 发布 NPC
  summary: string;
  // v2.0.3: 主线 / 支线 / 隐藏 — 用于新手引导与面板分级
  category?: 'main' | 'side' | 'secret';
  // v2.0.3: 主线里程碑步骤(1..5)，用于主进度条
  mainStep?: number;
  // v2.0.3: 完成时显示的纪念碑文本(主线才有)
  milestone?: string;
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
  // v2.0.3: 给玩家的进度提示(不暴露具体 flag 名)
  hint?: string;
  // v2.0.3: 选这个结局会失去什么 / 留下什么 — 让玩家看清代价
  cost?: string;
  keeps?: string;
  // v2.0.3: 结局色调(用于 modal 配色)
  tone_color?: string;
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
  // v2.0.2: 玩家在每个区域已"成功拾过"的物品 id 列表(同区域同物品只能拾一次)
  picked: Record<AreaId, string[]>;
  ending: string | null;
  finished_at: number | null;
  updated_at: number;
  // v2.0.3: 已消耗的提示（用于'不再显示教程浮层'）
  tutorial_seen?: boolean;
  // v2.0.3: 拾过的物品集合(记录"已介绍") — id 数组
  tips_seen?: string[];
  // v2.0.3: 当前天数
  day?: number;
  // v2.0.3: 最近一次进入高危区的时间戳(用于驻留扣血)
  danger_since?: number;
  // v2.0.3: 已解锁的支线里程碑
  milestones_shown?: string[];
  // v2.0.3 P2: 多周目
  loop?: number;                 // 当前周目(从 1 开始)
  endings_seen?: string[];       // 历史通关的结局 id(决定下周的解锁/奖励)
  loop_carried_items?: string[]; // 跨周目保留的物品(默认空)
}
