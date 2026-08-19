// 灰烬城 · 暗线提示机制（隐蔽的情节推进线索）
// 当玩家在某段剧情长时间卡住时，以低频静默方式给出方向性线索。
// 设计原则：
//   1. 仅当玩家已满足前置（read to trigger）但仍未触发时才推送
//   2. 同玩家同一提示有 24h 冷却，避免刷屏
//   3. 距离当前区域越近的提示越优先（相邻 > 两跳 > 全图）
//   4. 隐藏要素优先级 > 任务（隐藏通常更难发现）
//   5. 文本风格：带有世界观氛围的中文短句
import type { D1Database } from '@cloudflare/workers-types';
import type { PlayerState, AreaId } from './types';
import { AREAS, NPCS, QUESTS, HIDDENS, ITEMS } from './content';
import { meetReq, canCompleteQuest } from './rules';

export interface HintItem {
  id: string;            // 唯一 id（hidden/quest/npc 前缀）
  kind: 'hidden' | 'quest' | 'npc';
  text: string;          // 显示给玩家的中文提示
  area: { id: AreaId; name: string };  // 提示指向的区域
  refs: { kind: 'hidden' | 'quest' | 'npc'; ref: string };  // 落事件表时使用
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 小时
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 分钟没进展算"卡住"

// 计算两点之间的最短距离（BFS on neighbors）。同区 = 0，相邻 = 1。
function hopDistance(from: AreaId, to: AreaId): number {
  if (from === to) return 0;
  const visited = new Set<AreaId>([from]);
  let frontier: AreaId[] = [from];
  let step = 0;
  while (frontier.length) {
    step += 1;
    const next: AreaId[] = [];
    for (const f of frontier) {
      for (const nb of AREAS[f].neighbors) {
        if (visited.has(nb)) continue;
        if (nb === to) return step;
        visited.add(nb);
        next.push(nb);
      }
    }
    frontier = next;
  }
  return 99; // 不可达
}

// 收集候选：所有"已满足前置但未触发"的 hint 源
function collectCandidates(s: PlayerState, currentArea: AreaId): HintItem[] {
  const out: HintItem[] = [];

  // 1) 隐藏要素：requires 全部满足 + 未触发
  for (const h of HIDDENS) {
    if (s.flags[h.id]) continue;
    if (!h.requires.every((r) => meetReq(s, r))) continue;
    out.push({
      id: `hidden:${h.id}`,
      kind: 'hidden',
      text: `【线索】${h.hint}`,
      area: { id: h.area, name: AREAS[h.area].name },
      refs: { kind: 'hidden', ref: h.id },
    });
  }

  // 2) 任务：active 状态 + 至少有一个 method 可完成（即玩家已具备条件但还没动手）
  for (const q of QUESTS) {
    const st = s.quests[q.id];
    if (!st || st.status === 'done') continue;
    const completable = q.methods.some((m) => canCompleteQuest(s, q.id, m.id));
    if (!completable) continue;
    out.push({
      id: `quest:${q.id}`,
      kind: 'quest',
      text: `【未尽事宜】${q.summary}`,
      area: { id: q.area, name: AREAS[q.area].name },
      refs: { kind: 'quest', ref: q.id },
    });
  }

  // 3) 关键 NPC：见过面但还没触发任何 quest 或关键 flag（帮助玩家想起还有线索）
  const npcsAreaCount = new Set(NPCS.filter((n) => n.area === currentArea).map((n) => n.id));
  for (const n of NPCS) {
    if (!s.npc[n.id]?.met) continue;
    // 只关心剧情 NPC：拥有 acceptQuest 或 setFlag 触发关键 flag 的节点
    const hasPivotal = Object.values(n.nodes).some((nd) =>
      (nd.options ?? []).some((o) => !!o.acceptQuest || (!!o.setFlag && /clue_|met_/.test(o.setFlag))),
    );
    if (!hasPivotal) continue;
    // 简单启发：如果 NPC 在玩家附近区域（0-1 跳），并且玩家也去过那里，就推
    const dist = hopDistance(currentArea, n.area);
    if (dist > 1) continue;
    out.push({
      id: `npc:${n.id}`,
      kind: 'npc',
      text: `【风声】${n.blurb}……似乎在等你。`,
      area: { id: n.area, name: AREAS[n.area].name },
      refs: { kind: 'npc', ref: n.id },
    });
    // 抑制：同区域多个 NPC 同时出现时只保留一个
    if (npcsAreaCount.has(n.id)) { /* keep */ }
  }

  return out;
}

// 拉取 24h 内已经给过该玩家的 ref 列表
async function recentHintRefs(DB: D1Database, playerId: string, kind: string, ref: string): Promise<boolean> {
  const since = Date.now() - COOLDOWN_MS;
  const row = await DB.prepare(
    `SELECT id FROM events WHERE player_id = ? AND type = 'hint' AND meta LIKE ? AND created_at > ? LIMIT 1`
  ).bind(playerId, `%"${kind}":"${ref}"%`, since).first<any>();
  return !!row;
}

// 拉取 last_progress_at：玩家上次产生任何剧情事件的时间戳（用于判定"卡住"）
async function lastProgressAt(DB: D1Database, playerId: string): Promise<number> {
  // 取任意非 hint 事件的最新一条
  const row = await DB.prepare(
    `SELECT created_at FROM events WHERE player_id = ? AND type != 'hint' AND type != 'login'
     ORDER BY created_at DESC LIMIT 1`
  ).bind(playerId).first<any>();
  return row?.created_at ?? 0;
}

// 对外暴露：客户端每次 /api/state 拉取时，由后端调用此函数决定要不要附带 hint
export async function pickHint(
  DB: D1Database,
  playerId: string,
  playerState: PlayerState,
  currentArea: AreaId,
): Promise<HintItem | null> {
  // 1. 是否卡住？游戏刚开始(< 5 分钟) 不打扰
  const lastProgress = await lastProgressAt(DB, playerId);
  const now = Date.now();
  if (now - lastProgress < STALE_THRESHOLD_MS) return null;
  if (lastProgress === 0) return null;  // 全新玩家

  // 2. 收集候选人
  const candidates = collectCandidates(playerState, currentArea);
  if (candidates.length === 0) return null;

  // 3. 按距离排序: 相邻(0/1)优先，相同距离按 hidden > quest > npc
  const kindRank: Record<string, number> = { hidden: 0, quest: 1, npc: 2 };
  const ranked = candidates
    .map((c) => ({ c, d: hopDistance(currentArea, c.area.id), rank: kindRank[c.kind] }))
    .sort((a, b) => (a.d - b.d) || (a.rank - b.rank));

  // 4. 逐个检查冷却，挑第一个
  for (const r of ranked) {
    const cooling = await recentHintRefs(DB, playerId, r.c.refs.kind, r.c.refs.ref);
    if (cooling) continue;
    return r.c;
  }
  return null;
}

// 工具：把 HintItem 打包成 meta 落 events 表
export function hintMeta(h: HintItem): Record<string, any> {
  return {
    kind: h.refs.kind,
    ref: h.refs.ref,
    id: h.id,
    text: h.text,
    area_id: h.area.id,
    area_name: h.area.name,
  };
}
