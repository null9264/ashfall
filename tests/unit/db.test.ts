// v2.0.2: db.ts 容错测试 — JSON 字段空串/坏数据时降级,不让 state 端
import { describe, it, expect } from 'vitest';
import { getState } from '../../functions/lib/db';
import { makeState, emptyPicked } from './_helpers';

// 构造一个最小化 D1 fake:只实现 ensurePlayer (直接 INSERT ignore) + getState 路径
function fakeDb(existing: any | null): any {
  const row = existing;
  return {
    prepare(sql: string) {
      return {
        bind() { return this; },
        async first<T = any>() { return (row ?? null) as T | null; },
        async run() { return { success: true }; },
        async all() { return { results: [] }; },
        _sql: sql,
      };
    },
  };
}

describe('rowToState 容错 (db.ts)', () => {
  it('attrs JSON 坏串 → 不抛 + 用默认 attrs', async () => {
    const row = {
      player_id: 'p', area: 'gate',
      attrs: '{坏', inventory: '[]', quests: '{}', npc: '{}', flags: '{}',
      picked: '{}', ending: null, finished_at: null, updated_at: 100,
    };
    const s = await getState(fakeDb(row) as any, 'p');
    expect(s.attrs.hp).toBe(100);
  });

  it('flags 是空字符串 → flags 视为空对象', async () => {
    const row = {
      player_id: 'p', area: 'gate',
      attrs: '{}', inventory: '[]', quests: '{}', npc: '{}', flags: '',
      picked: '{}', ending: null, finished_at: null, updated_at: 100,
    };
    const s = await getState(fakeDb(row) as any, 'p');
    expect(s.flags).toEqual({});
  });

  it('inventory 是空字符串 → inventory 视为空数组', async () => {
    const row = {
      player_id: 'p', area: 'gate',
      attrs: '{}', inventory: '', quests: '{}', npc: '{}', flags: '{}',
      picked: '{}', ending: null, finished_at: null, updated_at: 100,
    };
    const s = await getState(fakeDb(row) as any, 'p');
    expect(s.inventory).toEqual([]);
  });

  it('picked 是空字符串 → picked 视为空对象', async () => {
    const row = {
      player_id: 'p', area: 'gate',
      attrs: '{}', inventory: '[]', quests: '{}', npc: '{}', flags: '{}',
      picked: '', ending: null, finished_at: null, updated_at: 100,
    };
    const s = await getState(fakeDb(row) as any, 'p');
    expect(s.picked).toEqual({});
  });

  it('正常 JSON 仍可正确解析', async () => {
    const row = {
      player_id: 'p', area: 'factory',
      attrs: JSON.stringify({ hp: 80, stamina: 90, radiation: 5, reputation: 10, scrap: 2 }),
      inventory: JSON.stringify([{ id: 'ration', name: '压缩口粮', qty: 1 }]),
      quests: JSON.stringify({ q_supply: { status: 'active' } }),
      npc: JSON.stringify({ zhou: { met: true, trust: 1, stage: 0 } }),
      flags: JSON.stringify({ paid_scar: true }),
      picked: JSON.stringify({ factory: ['scrap_metal'] }),
      ending: null, finished_at: null, updated_at: 200,
    };
    const s = await getState(fakeDb(row) as any, 'p');
    expect(s.attrs.hp).toBe(80);
    expect(s.inventory[0].id).toBe('ration');
    expect(s.flags.paid_scar).toBe(true);
    expect(s.picked.factory).toEqual(['scrap_metal']);
  });
});
