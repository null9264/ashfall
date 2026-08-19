import { getState, saveState } from '../lib/db';
import { getDialogNode, applyDialogChoice } from '../lib/rules';
import { json, bad } from '../lib/util';
import { logEvent } from '../lib/events';
import { NPCS } from '../lib/content';

export async function onRequestPost(context: any) {
  const body = await context.request.json().catch(() => ({}));
  const { npc, node, choice } = body;
  if (!npc) return bad('缺少 NPC');
  const def = NPCS.find((n) => n.id === npc);
  if (!def) return bad('未知 NPC');
  const s = await getState(context.env.DB, context.data.playerId);
  if (def.area !== s.area) return bad('这个 NPC 不在这里');

  // 首次进入对话：返回起始节点
  if (choice === undefined || choice === null) {
    const cur = node || def.start;
    const view = getDialogNode(s, npc, cur);
    if (!view) return bad('无对话');
    return json({ npc, node: cur, ...view });
  }

  // 选择选项：执行服务端效果，返回下一节点或关闭
  const { next } = applyDialogChoice(s, npc, node || def.start, Number(choice));
  await saveState(context.env.DB, s);
  await logEvent(context.env.DB, context.data.playerId, 'talk', String(npc), { node: node || def.start, choice: Number(choice) });
  if (next) {
    const view = getDialogNode(s, npc, next);
    return json({ npc, node: next, ...view });
  }
  return json({ npc, closed: true });
}