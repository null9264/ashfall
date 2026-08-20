// v2.0.3 P2: 经济系统(兑换 / 制作)
//   配方定义在 RECIPES 表;checkRecipe 校验玩家是否持有材料;applyRecipe 扣材料+产出
//   设计:把 NPC 摆摊做成 quest method(走原 quest 完成流),把 craft 做成独立 endpoint 用于"非 NPC 摆摊"场景
import type { PlayerState, ItemDef } from './types';
import { ITEMS } from './content';

export interface Recipe {
  id: string;
  name: string;
  desc: string;
  // 需要的材料(id → 数量)
  consumes: Record<string, number>;
  // 产出(物品 + 数量,可选 attr)
  produces: { item?: string; itemQty?: number; attr?: Record<string, number>; flag?: string };
  // 不显示在 UI(例如 NPC 摆摊已经走 quest 方法)— 当前默认 false
  hidden?: boolean;
}

export const RECIPES: Recipe[] = [
  {
    id: 'craft_medicine',
    name: '熬制抗生素',
    desc: '消耗 2 份废金属 + 1 份压缩口粮 → 1 份抗生素',
    consumes: { scrap_metal: 2, ration: 1 },
    produces: { item: 'meds', itemQty: 1 },
  },
  {
    id: 'craft_bunker_key',
    name: '熔锻钥匙',
    desc: '消耗 3 份废金属 → 1 把锈蚀钥匙',
    consumes: { scrap_metal: 3 },
    produces: { item: 'key_bunker', itemQty: 1 },
  },
  {
    id: 'trade_fuel',
    name: '黑市兑柴油',
    desc: '消耗 5 份废金属 → 1 桶柴油',
    consumes: { scrap_metal: 5 },
    produces: { item: 'fuel', itemQty: 1 },
  },
];

export function findRecipe(id: string): Recipe | null {
  return RECIPES.find((r) => r.id === id) || null;
}

export function checkRecipe(s: PlayerState, recipeId: string): { ok: boolean; reason?: string } {
  const r = findRecipe(recipeId);
  if (!r) return { ok: false, reason: '未知配方' };
  for (const [id, qty] of Object.entries(r.consumes)) {
    const have = s.inventory.find((i) => i.id === id)?.qty ?? 0;
    if (have < qty) return { ok: false, reason: `材料不足:缺 ${ITEMS[id]?.name ?? id} ×${qty - have}` };
  }
  return { ok: true };
}

export function applyRecipe(s: PlayerState, recipeId: string): { ok: boolean; reason?: string } {
  const check = checkRecipe(s, recipeId);
  if (!check.ok) return check;
  const r = findRecipe(recipeId)!;
  for (const [id, qty] of Object.entries(r.consumes)) {
    const idx = s.inventory.findIndex((i) => i.id === id);
    if (idx >= 0) {
      s.inventory[idx].qty -= qty;
      if (s.inventory[idx].qty <= 0) s.inventory.splice(idx, 1);
    }
  }
  // 产出
  if (r.produces.item) {
    const idx = s.inventory.findIndex((i) => i.id === r.produces.item);
    if (idx >= 0) s.inventory[idx].qty += r.produces.itemQty ?? 1;
    else s.inventory.push({ id: r.produces.item, name: ITEMS[r.produces.item]?.name ?? r.produces.item, qty: r.produces.itemQty ?? 1 });
  }
  if (r.produces.attr) {
    for (const [k, v] of Object.entries(r.produces.attr)) {
      const cur = (s.attrs as any)[k] ?? 0;
      (s.attrs as any)[k] = Math.max(0, Math.min(k === 'reputation' ? 50 : k === 'scrap' ? 20 : 100, cur + (v as number)));
    }
  }
  if (r.produces.flag) s.flags[r.produces.flag] = true;
  return { ok: true };
}