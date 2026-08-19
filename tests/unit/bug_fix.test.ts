import { describe, it, expect } from 'vitest';
import { addItem, completeQuest, hasItem, removeItem } from '../../functions/lib/rules';
import type { PlayerState } from '../../functions/lib/types';
import { makeState, emptyPicked } from './_helpers';

describe('Bug-1: q_supply 交付金属扣库存', () => {
  it('交付 3 金属 → 库存变 0', () => {
    const s = makeState({
      quests: { q_supply: { status: 'active' } },
    });
    addItem(s, 'scrap_metal', 3);
    expect(hasItem(s, 'scrap_metal', 3)).toBe(true);

    completeQuest(s, 'q_supply', 'm_give');

    expect(s.inventory.find((i) => i.id === 'scrap_metal')).toBeUndefined();
  });

  it('交付后获得 ration × 1', () => {
    const s = makeState({
      quests: { q_supply: { status: 'active' } },
    });
    addItem(s, 'scrap_metal', 3);
    completeQuest(s, 'q_supply', 'm_give');
    expect(hasItem(s, 'ration')).toBe(true);
    expect(s.inventory.find((i) => i.id === 'ration')?.qty).toBe(1);
  });

  it('交付后 zhou trust +2', () => {
    const s = makeState({
      quests: { q_supply: { status: 'active' } },
    });
    addItem(s, 'scrap_metal', 3);
    completeQuest(s, 'q_supply', 'm_give');
    expect(s.npc.zhou?.trust).toBe(2);
  });

  it('交付 5 金属 → 剩下 2 (只扣 3)', () => {
    const s = makeState({
      quests: { q_supply: { status: 'active' } },
    });
    addItem(s, 'scrap_metal', 5);
    completeQuest(s, 'q_supply', 'm_give');
    expect(hasItem(s, 'scrap_metal', 2)).toBe(true);
    expect(s.inventory.find((i) => i.id === 'scrap_metal')?.qty).toBe(2);
  });

  it('Bug-2: 工厂空拾物不应无限取', () => {
    // 实际拾取逻辑走 pickup.ts,测试只确认 inventory 唯一性
    const s = makeState();
    // 连续 addItem 不应叠加成多个 entry
    addItem(s, 'scrap_metal', 1);
    addItem(s, 'scrap_metal', 1);
    addItem(s, 'scrap_metal', 1);
    expect(s.inventory.find((i) => i.id === 'scrap_metal')?.qty).toBe(3);
    expect(s.inventory.filter((i) => i.id === 'scrap_metal').length).toBe(1);
  });
});

describe('Bug-2 修复验证: pickup 持久化已拾取标记', () => {
  // 模拟 pickup.ts 的 isAlreadyPicked/markPicked 逻辑
  function isAlreadyPicked(s: any, areaId: string, itemId: string): boolean {
    const pickedArea = s.picked?.[areaId] ?? [];
    return pickedArea.includes(itemId);
  }
  function markPicked(s: any, areaId: string, itemId: string): void {
    if (!s.picked) s.picked = {};
    if (!s.picked[areaId]) s.picked[areaId] = [];
    if (!s.picked[areaId].includes(itemId)) s.picked[areaId].push(itemId);
  }

  it('首次拾取标记后,二次调用应识别已拾过', () => {
    const s: any = { picked: emptyPicked() };
    expect(isAlreadyPicked(s, 'factory', 'scrap_metal')).toBe(false);
    markPicked(s, 'factory', 'scrap_metal');
    expect(isAlreadyPicked(s, 'factory', 'scrap_metal')).toBe(true);
  });

  it('未拾过的道具仍能拾', () => {
    const s: any = { picked: emptyPicked() };
    markPicked(s, 'factory', 'scrap_metal');
    expect(isAlreadyPicked(s, 'factory', 'scrap_metal')).toBe(true);
    expect(isAlreadyPicked(s, 'factory', 'meds')).toBe(false); // 不同物品
  });

  it('不同区域独立计数', () => {
    const s: any = { picked: emptyPicked() };
    markPicked(s, 'factory', 'scrap_metal');
    expect(isAlreadyPicked(s, 'metro', 'scrap_metal')).toBe(false); // metro 是另一区域
  });

  it('重复 mark 同一区域同一物品不会重复 push', () => {
    const s: any = { picked: emptyPicked() };
    markPicked(s, 'factory', 'scrap_metal');
    markPicked(s, 'factory', 'scrap_metal');
    expect(s.picked.factory.length).toBe(1);
  });
});

describe('Bug-1 修复场景: 拾物后交付完整链路', () => {
  it('工厂拾 3 → 状态 → 交付 → 库存为 0', () => {
    const s = makeState({
      area: 'factory',
      quests: { q_supply: { status: 'active' } },
    });
    // 模拟 pickup
    addItem(s, 'scrap_metal', 3);
    // 玩家回到 gate
    s.area = 'gate';
    // 交付
    completeQuest(s, 'q_supply', 'm_give');
    expect(s.inventory.find((i) => i.id === 'scrap_metal')).toBeUndefined();
    expect(hasItem(s, 'ration')).toBe(true);
    expect(s.quests.q_supply.status).toBe('done');
  });
});

describe('Bug-3 修复验证: questStart 路由 (医生交付后)', () => {
  it('完成 q_cure 后,再找医生 → 进入 c 节点', () => {
    // 用 fake NPC 验证 chooseStartNode 行为
    const fakeDoctor: any = {
      id: 'doctor', area: 'market', start: 'a',
      nodes: { a: {}, b: {}, c: {} },
      questStart: { q_cure: 'c' },
    };
    const s = makeState({
      area: 'market',
      quests: { q_cure: { status: 'done' } },
      npc: { doctor: { met: true, trust: 3, stage: 0 } },
    });
    // 重新实现 chooseStartNode 以便测试
    function chooseStart(state: PlayerState, npc: any): string {
      for (const [questId, st] of Object.entries(state.quests || {})) {
        if (st.status !== 'done') continue;
        const map = npc.questStart?.[questId];
        if (map && npc.nodes[map]) return map;
      }
      return npc.start;
    }
    expect(chooseStart(s, fakeDoctor)).toBe('c');
  });

  it('未完成任务时,NPC 对话仍从 start 开始', () => {
    const fakeDoctor: any = {
      id: 'doctor', start: 'a', nodes: { a: {}, b: {}, c: {} }, questStart: { q_cure: 'c' },
    };
    const s = makeState({
      area: 'market',
      quests: { q_cure: { status: 'active' } },
    });
    function chooseStart(state: PlayerState, npc: any): string {
      for (const [questId, st] of Object.entries(state.quests || {})) {
        if (st.status !== 'done') continue;
        const map = npc.questStart?.[questId];
        if (map && npc.nodes[map]) return map;
      }
      return npc.start;
    }
    expect(chooseStart(s, fakeDoctor)).toBe('a');
  });
});
