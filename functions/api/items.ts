// 公共物品元数据(只读),用于前端 item tip
import { json } from '../lib/util';
import { ITEMS } from '../lib/content';

export async function onRequestGet() {
  // 注意:这些是公开物品定义,前端拿到不影响防作弊
  return json({ items: Object.values(ITEMS) });
}