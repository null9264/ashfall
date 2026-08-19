// v2.0.2: 关键线索日志（用于"线索日志"面板）
// 把玩家已设置的 flag + 已有物品映射成可读线索条目,按主题分组
import type { D1Database } from '@cloudflare/workers-types';
import { json } from '../../lib/util';

// 线索定义:每条目要么靠 flag(剧情触发),要么靠 item(背包)
interface ClueDef {
  id: string;
  category: string;
  text: string;
  source: string;
  requireFlag?: string;
  requireItem?: string;
}

const CLUES: ClueDef[] = [
  // —— 小月 —
  { id: 'clue_yue', category: '小月', text: '阿芸提到女儿小月去地铁找药后失踪,左腕有道疤。',
    source: '阿芸', requireFlag: 'clue_yue' },
  { id: 'found_yue', category: '小月', text: '你把小月找回来/或者没能带回她。',
    source: '小月', requireFlag: 'found_yue' },

  // —— 幽灵（Feature 6 重点）——
  { id: 'met_ghost', category: '幽灵', text: '地铁火光旁的人影问你：「你也听得见它们在响吗?地下的钟。」',
    source: '幽灵', requireFlag: 'met_ghost' },
  { id: 'clue_undermap', category: '幽灵', text: '幽灵说:钟下面有张地图,藏在工厂的柜子里,能去"他们不想让你去的地方"。',
    source: '幽灵', requireFlag: 'clue_undermap' },
  { id: 'fed_ghost', category: '幽灵', text: '你给幽灵递了口粮,他压低了声音。',
    source: '幽灵', requireFlag: 'fed_ghost' },
  { id: 'has_echo_core', category: '幽灵', text: '你从地下管网的回声那里取走了"回声核心"——被删除的那部分记忆。',
    source: '回声', requireFlag: 'has_echo_core' },
  { id: 'took_echo', category: '幽灵', text: '你让回声核心被带了出来——城市被删除的记忆正在复活。',
    source: '回声', requireFlag: 'took_echo' },

  // —— 老吴 / 密室 —
  { id: 'clue_key', category: '老吴', text: '林婶说丈夫老吴袖子里藏着把钥匙,可能在河岸那边丢了。',
    source: '林婶', requireFlag: 'clue_key' },
  { id: 'met_wu', category: '老吴', text: '楼洞里的老人说自己是"不该还活着的人",叫你别声张。',
    source: '老吴(?)', requireFlag: 'met_wu' },
  { id: 'wu_found', category: '老吴', text: '你拿着钥匙找到了老吴——他被"优化"后躲进了密室。',
    source: '老吴', requireFlag: 'wu_found' },
  { id: 'knows_bunker', category: '老吴', text: '密室里藏着真相——但要先去拿地图才下得去。',
    source: '老吴', requireFlag: 'knows_bunker' },
  { id: 'found_bunker', category: '老吴', text: '你用钥匙打开了密室,里面是一份完整的真相。',
    source: '居民楼密室', requireFlag: 'found_bunker' },

  // —— 工厂 / 真相 —
  { id: 'clue_factory', category: '工厂', text: '老周说:工厂半年前炸的,死的不是报告上那几个。',
    source: '老周', requireFlag: 'clue_factory' },
  { id: 'met_foreman', category: '工厂', text: '监工看你一眼:"这里清过场了,带着你的东西滚。"',
    source: '监工', requireFlag: 'met_foreman' },
  { id: 'clue_down', category: '工厂', text: '少年说:地下还有一座城,他们不让人们下去——下面的人记得真相。',
    source: '少年', requireFlag: 'clue_down' },
  { id: 'found_record', category: '工厂', text: '你在监工办公室找到了那份工厂记录——里面有事发的真相。',
    source: '工厂记录', requireFlag: 'found_record' },
  { id: 'truth_evidence', category: '工厂', text: '你亲眼看见了真相的证据——他们隐瞒的不只是事故。',
    source: '工厂记录', requireFlag: 'truth_evidence' },
  { id: 'knows_cabinet', category: '工厂', text: '技师告诉你柜子在监工办公室,钥匙在他身上。',
    source: '技师', requireFlag: 'knows_cabinet' },
  { id: 'exposed', category: '工厂', text: '你把工厂的真相公之于众。',
    source: '抉择', requireFlag: 'exposed' },
  { id: 'crushed', category: '工厂', text: '你压下了所有知情的人,独吞了秘密。',
    source: '抉择', requireFlag: 'crushed' },
  { id: 'rewarded_by_doctor', category: '医生', text: '医生收下抗生素后给了你一袋口粮:"孩子们会记住你的,我也会。"',
    source: '医生', requireFlag: 'rewarded_by_doctor' },

  // —— 真相(哑女 + 照片)-
  { id: 'met_mute', category: '真相', text: '你见到了不能说话的哑女——她比划着"上面的人想让所有人都像她一样"。',
    source: '哑女', requireFlag: 'met_mute' },
  { id: 'truth_photo', category: '真相', text: '哑女把一张烧焦的照片塞给你——上面写着「他们不想让你看见这个。」',
    source: '哑女', requireFlag: 'truth_photo' },
  { id: 'has_truth', category: '真相', text: '你手里攥着真相的所有碎片:记录、照片、密码。',
    source: '真相碎片', requireFlag: 'has_truth' },
  { id: 'good_deed', category: '真相', text: '你把小满的小熊带回来,或者做了另一件不亏心的事。',
    source: '小满', requireFlag: 'good_deed' },

  // —— 地下管网/地图
  { id: 'got_map', category: '地下', text: '你从工厂的柜子里拿到了那张地下管网地图碎片。',
    source: '工厂柜子', requireFlag: 'got_map' },
  { id: 'has_undermap', category: '地下', text: '船夫说:"你真找到了。坐稳,我送你去他们最怕你去的地方。"',
    source: '船夫', requireFlag: 'has_undermap' },
  { id: 'camp_found', category: '地下', text: '你找到了地下城里的难民营地——那些人记得真相。',
    source: '地下管网', requireFlag: 'camp_found' },

  // —— 物品线索（独立于 flag,玩家一旦拿到物品即可见）——
  { id: 'item_photo', category: '真相', text: '你手里有一张被烧焦的照片,背面写着「他们不想让你看见这个。」',
    source: '哑女', requireItem: 'photo' },
  { id: 'item_map', category: '地下', text: '你有一张地下管网地图碎片——它指向城市下方的另一座城。',
    source: '工厂柜子', requireItem: 'map_fragment' },
  { id: 'item_key', category: '老吴', text: '你有一把锈蚀的钥匙——老吴说他"万一哪天用得上"。',
    source: '河岸', requireItem: 'key_bunker' },
  { id: 'item_echo', category: '幽灵', text: '你握着一段回声核心——一段拒绝被删除的记忆。',
    source: '回声', requireItem: 'echo_core' },
  { id: 'item_fuel', category: '船夫', text: '你有一桶柴油——船夫的渡河费。',
    source: '河岸', requireItem: 'fuel' },
];

interface PlayerInventory { id: string; qty: number }
interface ClueEntry {
  id: string;
  category: string;
  text: string;
  source: string;
  acquired_at: number;
}

export async function onRequestGet(context: { request: Request; env: { DB: D1Database }; data: { playerId: string } }) {
  const DB: D1Database = context.env.DB;
  const playerId = context.data.playerId;

  // 拉取玩家当前 flags + inventory
  const row = await DB.prepare(
    'SELECT flags, inventory, updated_at FROM player_states WHERE player_id = ?'
  ).bind(playerId).first<{ flags: string | null; inventory: string | null; updated_at: number | null }>();

  if (!row) return json({ clues: [] as ClueEntry[] });

  let flags: Record<string, boolean> = {};
  let inventory: PlayerInventory[] = [];
  try {
    if (row.flags) flags = JSON.parse(row.flags);
    if (row.inventory) inventory = JSON.parse(row.inventory);
  } catch (e) {
    console.error('[clues] JSON parse failed', e);
    return json({ clues: [] as ClueEntry[] });
  }

  const invMap = new Map(inventory.map((i) => [i.id, i.qty]));
  const stamp = row.updated_at ?? Date.now();

  // 过滤已获得到的线索
  const clues: ClueEntry[] = [];
  for (const c of CLUES) {
    const haveByFlag = !!(c.requireFlag && flags[c.requireFlag]);
    const haveByItem = !!(c.requireItem && (invMap.get(c.requireItem) || 0) > 0);
    if (haveByFlag || haveByItem) {
      clues.push({
        id: c.id,
        category: c.category,
        text: c.text,
        source: c.source,
        acquired_at: stamp,
      });
    }
  }

  return json({ clues });
}
