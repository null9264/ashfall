import { getState, saveState } from '../lib/db';
import { viewState } from '../lib/view';
import { json, bad } from '../lib/util';
import { getNickname } from '../lib/nickname';
import { AREAS } from '../lib/content';

// 环境互动（彩蛋等），与 NPC 对话区分
export async function onRequestPost(context: any) {
  const body = await context.request.json().catch(() => ({}));
  const { what } = body;
  const s = await getState(context.env.DB, context.data.playerId);
  if (what === 'radio') {
    if (s.area !== 'gate') return bad('这里没有收音机');
    s.flags['easter_click'] = true;
    await saveState(context.env.DB, s);
    const nick = await getNickname(context.env.DB, context.data.playerId);
    return json({ ...viewState(s, nick), text: '旧收音机沙沙响，指示灯一闪一闪，像在等什么发生。' });
  }
  return bad('没有可互动的东西');
}
