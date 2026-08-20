// v2.0.3 P2: 制作 / 兑换 endpoint
// POST /api/craft  { recipeId }
import { getState, saveState } from '../lib/db';
import { viewState } from '../lib/view';
import { json, bad } from '../lib/util';
import { logEvent } from '../lib/events';
import { getNickname } from '../lib/nickname';
import { checkRecipe, applyRecipe, RECIPES } from '../lib/craft';
import { diffStates } from '../lib/rules';

export async function onRequestGet(context: any) {
  // GET: 列出可制作配方(描述 + 是否够材料)
  const s = await getState(context.env.DB, context.data.playerId);
  const list = RECIPES.filter((r) => !r.hidden).map((r) => {
    const check = checkRecipe(s, r.id);
    return { ...r, ok: check.ok, reason: check.reason };
  });
  return json({ recipes: list });
}

export async function onRequestPost(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  let body: any = {};
  try { body = await context.request.json(); } catch { body = {}; }
  const recipeId = String(body.recipeId || '');
  const before = JSON.parse(JSON.stringify(s));
  const r = applyRecipe(s, recipeId);
  if (!r.ok) return bad(r.reason || '制作失败');
  await saveState(context.env.DB, s);
  await logEvent(context.env.DB, context.data.playerId, 'craft', recipeId);
  const nick = await getNickname(context.env.DB, context.data.playerId);
  return json({ ok: true, changes: diffStates(before, s), view: viewState(s, nick) });
}