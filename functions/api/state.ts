// GET /api/state：返回当前玩家 state（附带昵称 + 暗线提示）
// POST /api/state: 一些无副作用的客户端 ack（教程已读 / 物资 tip 已读 / 高危区心跳）
import { getState, saveState } from '../lib/db';
import { viewState } from '../lib/view';
import { json } from '../lib/util';
import { logEvent } from '../lib/events';
import { getNickname } from '../lib/nickname';
import { pickHint } from '../lib/hints';
import { tickDanger } from '../lib/rules';
import { applyWeather, weatherToView } from '../lib/weather';

export async function onRequestGet(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  const nick = await getNickname(context.env.DB, context.data.playerId);
  // v2.0.3 P2: 每天第一次 state 时,把当日天气算出来 + 缓存到 flags
  const weather = applyWeather(s);
  await saveState(context.env.DB, s);
  // 静默判断是否有可推暗线提示
  const hint = await pickHint(context.env.DB, context.data.playerId, s, s.area).catch(() => null);
  if (hint) {
    // 把这次推送记录进事件表，作为 24h 冷却的依据；同时用于历史展示
    logEvent(context.env.DB, context.data.playerId, 'hint', hint.refs.ref, {
      id: hint.id,
      kind: hint.refs.kind,
      ref: hint.refs.ref,
      text: hint.text,
      area_id: hint.area.id,
      area_name: hint.area.name,
    });
  }
  // v2.0.3 P2: 当前区域如果属于 danger 区,把天气偏移加到危险显示上(实际伤害走 rules,不重复)
  const baseArea = (s.area === 'metro' || s.area === 'undernet') ? s.area : null;
  const weatherView = weatherToView(weather, baseArea as any);
  return json({ ...viewState(s, nick), hint: hint ?? null, weather: weatherView });
}

export async function onRequestPost(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  const nick = await getNickname(context.env.DB, context.data.playerId);
  let body: any = {};
  try { body = await context.request.json(); } catch { body = {}; }
  const action = body.action;
  let changed = false;

  if (action === 'dismiss_tutorial') {
    if (!s.tutorial_seen) {
      s.tutorial_seen = true;
      changed = true;
      logEvent(context.env.DB, context.data.playerId, 'tutorial_dismiss', '', { when: Date.now() });
    }
  } else if (action === 'item_tip_seen') {
    const itemId = String(body.itemId || '').trim();
    if (itemId) {
      const list = Array.isArray(s.tips_seen) ? s.tips_seen.slice() : [];
      if (!list.includes(itemId)) {
        list.push(itemId);
        // 最多保留 200 条,避免无限增长
        s.tips_seen = list.slice(-200);
        changed = true;
      }
    }
  } else if (action === 'heartbeat') {
    // v2.0.3: 高危区驻留扣血;若发生扣血则返回 affects 字段
    const before = JSON.parse(JSON.stringify(s.attrs));
    const ticked = tickDanger(s);
    if (ticked) {
      changed = true;
      console.log('[heartbeat] danger tick', { area: s.area, hp: s.attrs.hp, radiation: s.attrs.radiation });
    }
    // 不论是否扣血,heartbeat 都把 last_heartbeat 推进以防滥用(此处简单忽略)
  } else if (action === 'world_event_seen') {
    // v2.0.3: 玩家看了钟声,标记 heard_bell —— 同时把 h_bell 的效果也落库
    const eventId = String(body.eventId || '');
    if (eventId === 'w_bell' && !s.flags['heard_bell']) {
      s.flags['heard_bell'] = true;
      // 应用 effects: 减 20 辐射 + 8 声望
      const cRadiation = Math.max(0, (s.attrs.radiation ?? 0) - 20);
      s.attrs.radiation = cRadiation;
      const cRep = Math.max(0, (s.attrs.reputation ?? 0) + 8);
      s.attrs.reputation = cRep;
      // v2.0.3: 写入 milestones_shown 也写一份用于以后 admin 追溯
      if (!Array.isArray(s.milestones_shown)) s.milestones_shown = [];
      if (!s.milestones_shown.includes('w_bell')) s.milestones_shown.push('w_bell');
      changed = true;
    }
  }
  if (changed) await saveState(context.env.DB, s);
  // 不论是否真的改了，都返回最新 view 给前端当 ack
  return json(viewState(s, nick));
}
