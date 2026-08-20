// v2.0.3: 物品首次拾取 tip
import type { ItemDef } from '../../functions/lib/types';

// 服务端 content.ts 已对每个物品写 desc,前端再补一句"为什么重要"的提示
// 注意:这个文件内容跟服务端 ITEMS.id 对齐(id 是约定)
export const ITEM_TIPS: Record<string, { where: string; hint: string }> = {
  scrap_metal: { where: '在黑市街区 / 地铁废线能换东西', hint: '它是城里的货币：给老周、疤脸或医生都收。' },
  ration: { where: '在地铁 / 工厂搜物资时偶尔能拿到', hint: '给 NPC 加信任度 / 救命 / 喂幽灵。' },
  meds: { where: '废弃工厂搜物资会掉落', hint: '医生收 2 盒可换治疗 + 信任；自己留 1 盒也行。' },
  map_fragment: { where: '工厂柜子(完成墙上的密码)或技师处', hint: '拿给船夫就能下到地下管网。' },
  key_bunker: { where: '河岸棚户搜物资偶尔能捡到', hint: '用它打开居民楼密室，找到老吴。' },
  photo: { where: '河岸棚户的哑女会直接送你', hint: '真相碎片的"物证"之一。' },
  echo_core: { where: '在地下管网深处与回声对话后取走', hint: '把回声核心带出来,城市才能记得真相。' },
  fuel: { where: '河岸棚户搜物资偶尔能捡到', hint: '柴油可付给船夫渡河(替代地图碎片)。' },
};

// 用户首次拾某 item 后才会看到 tip;复用即可
export function getItemTip(itemId: string, def: ItemDef | undefined) {
  const extra = ITEM_TIPS[itemId];
  if (!def) return null;
  return {
    name: def.name,
    desc: def.desc,
    where: extra?.where ?? '',
    hint: extra?.hint ?? '',
  };
}