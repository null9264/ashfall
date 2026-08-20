// v2.0.3 P2: 解谜接口
// POST /api/puzzle  { puzzleId, answer }
// 服务端做校验,通过后写 effect 到 state
import { getState, saveState } from '../lib/db';
import { viewState } from '../lib/view';
import { json, bad } from '../lib/util';
import { logEvent } from '../lib/events';
import { getNickname } from '../lib/nickname';
import { checkPuzzle, diffStates, applyEffect } from '../lib/rules';
import type { PuzzleId } from '../lib/rules';

export async function onRequestPost(context: any) {
  const s = await getState(context.env.DB, context.data.playerId);
  let body: any = {};
  try { body = await context.request.json(); } catch { body = {}; }
  const puzzleId = String(body.puzzleId || '') as PuzzleId;
  const answer = body.answer;
  // 已通(puzzleId 全局独立,用过即用完;具体看 puzzle 字段 lock)
  if (s.flags[`puzzle_${puzzleId}`]) return bad('这个谜题你已经解过了。');
  const before = JSON.parse(JSON.stringify(s));
  const result = checkPuzzle(puzzleId, answer);
  if (!result.ok) {
    return json({ ok: false, reason: result.reason || '答案不对', code: 'BAD_ANSWER', hint: result.reason || '答案不对' }, 400);
  }
  // 应用效果
  for (const e of result.effects || []) applyEffect(s, e);
  // 标记该谜题已解
  s.flags[`puzzle_${puzzleId}`] = true;
  await saveState(context.env.DB, s);
  await logEvent(context.env.DB, context.data.playerId, 'puzzle', String(puzzleId), { answer });
  const nick = await getNickname(context.env.DB, context.data.playerId);
  const changes = diffStates(before, s);
  return json({ ok: true, changes, view: viewState(s, nick) });
}