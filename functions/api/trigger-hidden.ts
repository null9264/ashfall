import { getState, saveState } from '../lib/db';
import { triggerHidden, checkHidden } from '../lib/rules';
import { viewState } from '../lib/view';
import { json, bad } from '../lib/util';
import { logEvent } from '../lib/events';
import { HIDDENS } from '../lib/content';

export async function onRequestPost(context: any) {
  const body = await context.request.json().catch(() => ({}));
  const s = await getState(context.env.DB, context.data.playerId);

  // 若未指定具体隐藏要素，则在当前区域自动检测「条件已满足、尚未触发」的隐藏
  let hiddenId = body.hiddenId as string | undefined;
  if (!hiddenId) {
    const cand = HIDDENS.find((h) => h.area === s.area && !s.flags[h.id] && checkHidden(s, h.id));
    if (!cand) return bad('你仔细搜寻了一遍，暂时没什么新发现。');
    hiddenId = cand.id;
  }

  const h = HIDDENS.find((x) => x.id === hiddenId);
  if (!h) return bad('没有这样的隐藏要素');
  if (s.flags[hiddenId]) return bad('已经找到了');
  if (!checkHidden(s, hiddenId)) return bad(h.hint + '（条件还不够）');
  triggerHidden(s, hiddenId);
  await saveState(context.env.DB, s);
  await logEvent(context.env.DB, context.data.playerId, 'hidden', String(hiddenId));
  return json({ ...viewState(s), found: h.name });
}