import { getState, saveState } from '../lib/db';
import { viewState } from '../lib/view';
import { json } from '../lib/util';
import { logEvent } from '../lib/events';
import { getNickname } from '../lib/nickname';
import { START_AREA } from '../lib/content';

// 重置当前玩家进度(仅清自己的存档,重新开始);昵称保留
// v2.0.3 P2: 多周目 — 如果有 ending,loop++; 旧 ending 加入 endings_seen;
//   loop>=2 时,档案管理员会留下一件"老笔记"作为下周的礼物(loop_carried_items)
export async function onRequestPost(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  const prevLoop = typeof s.loop === 'number' ? s.loop : 1;
  const prevEnding = s.ending;
  s.area = START_AREA;
  s.attrs = { hp: 100, stamina: 100, radiation: 0, reputation: 0, scrap: 0 };
  s.inventory = []; s.quests = {}; s.npc = {}; s.flags = {}; s.ending = null; s.finished_at = null;
  s.tutorial_seen = false;
  s.tips_seen = [];
  s.day = 1;
  s.danger_since = undefined;
  s.milestones_shown = [];
  // v2.0.3 P2: 上一周目通关过 → loop+1, 旧 ending 入库
  if (prevEnding) {
    s.loop = prevLoop + 1;
    const list = Array.isArray(s.endings_seen) ? s.endings_seen.slice() : [];
    if (!list.includes(prevEnding)) list.push(prevEnding);
    s.endings_seen = list.slice(-50);
    // loop>=2: 档案管理员的礼物 — 口袋里多一份"旧笔记"
    // 内容表 ITEMS 里加 item 'note_archive' 作为"档案管理员的旧笔记"
    // 解锁某些隐藏对话(比如问小满"上次你说了什么")
    const carryList = ['note_archive'];
    s.loop_carried_items = carryList;
    s.inventory = carryList.map((id) => ({ id, name: '档案管理员的旧笔记', qty: 1 }));
  } else {
    s.loop_carried_items = [];
  }
  await saveState(context.env.DB, s);
  await logEvent(context.env.DB, context.data.playerId, 'reset', '', { newLoop: s.loop });
  const nick = await getNickname(context.env.DB, context.data.playerId);
  return json({ ...viewState(s, nick), resetInfo: { loop: s.loop, endings_seen: s.endings_seen } });
}