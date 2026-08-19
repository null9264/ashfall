// v2.0.2: 数值记录 (history) + 线索日志 (clues) 端点测试
// 不依赖真实 D1,构造最小化的 fake DB
import { describe, it, expect } from 'vitest';
import { onRequestGet as historyGet } from '../../functions/api/player/history';
import { onRequestGet as cluesGet } from '../../functions/api/player/clues';

interface FakeRow { [k: string]: any }

// 最小化 fake D1 — 只实现本次测试需要的 .prepare
function makeFakeDB(execResults: Record<string, FakeRow[]>): any {
  // execResults key 是 SQL 关键标签,用于匹配
  function match(sql: string): FakeRow[] {
    for (const [k, rows] of Object.entries(execResults)) {
      if (sql.includes(k)) return rows;
    }
    return [];
  }
  return {
    prepare(sql: string) {
      const state = { sql };
      return {
        bind(_a: any, _b?: any) {
          return this;
        },
        async all<T = any>() {
          const rows = match(state.sql);
          return { results: rows };
        },
        async first<T = any>() {
          const rows = match(state.sql);
          return rows[0] ?? null;
        },
        async run() { return { success: true }; },
      };
    },
  };
}

function makeContext(DB: any, playerId: string) {
  return {
    request: new Request('http://x/api/player/history?limit=10'),
    env: { DB },
    data: { playerId },
  } as any;
}

describe('history 端点', () => {
  it('返回按 created_at desc 排序的条目,limit 默认 60', async () => {
    const DB = makeFakeDB({
      'SELECT id, type, ref, meta, created_at FROM events': [
        { id: 1, type: 'move', ref: 'market', meta: '{"from":"gate"}', created_at: 100 },
        { id: 2, type: 'pickup', ref: 'scrap_metal', meta: '{"qty":1}', created_at: 200 },
      ],
    });
    const ctx: any = { request: new Request('http://x/api/player/history'), env: { DB }, data: { playerId: 'p1' } };
    const res = await historyGet(ctx);
    const body: any = await res.json();
    expect(body.limit).toBe(60); // 默认
    expect(body.entries).toHaveLength(2);
    expect(body.entries[0].type).toBe('move');
    expect(body.entries[0].meta).toEqual({ from: 'gate' });
  });

  it('limit>200 时被截断到 200', async () => {
    const DB = makeFakeDB({ 'SELECT id, type, ref, meta, created_at FROM events': [] });
    const ctx: any = { request: new Request('http://x/api/player/history?limit=500'), env: { DB }, data: { playerId: 'p1' } };
    const res = await historyGet(ctx);
    const body: any = await res.json();
    expect(body.limit).toBe(200);
  });

  it('limit<=0 返回 400', async () => {
    const DB = makeFakeDB({});
    const ctx: any = { request: new Request('http://x/api/player/history?limit=-5'), env: { DB }, data: { playerId: 'p1' } };
    const res = await historyGet(ctx);
    expect(res.status).toBe(400);
  });

  it('meta 解析失败时不应阻断', async () => {
    const DB = makeFakeDB({
      'SELECT id, type, ref, meta, created_at FROM events': [
        { id: 1, type: 'pickup', ref: 'x', meta: '{坏 json', created_at: 100 },
      ],
    });
    const res = await historyGet(makeContext(DB, 'p1'));
    const body: any = await res.json();
    expect(body.entries[0].meta).toEqual({});
  });
});

describe('clues 端点', () => {
  function ctxWith(playerId: string, flags: Record<string, boolean>, inventory: { id: string; qty: number }[]) {
    const stateRow = {
      flags: JSON.stringify(flags),
      inventory: JSON.stringify(inventory),
      updated_at: 1700000000000,
    };
    const DB = makeFakeDB({
      'SELECT flags, inventory, updated_at FROM player_states': [stateRow],
    });
    return makeContext(DB, playerId);
  }

  it('玩家无任何 flag 物品 → 返回空线索列表', async () => {
    const res = await cluesGet(ctxWith('p1', {}, []));
    const body: any = await res.json();
    expect(body.clues).toEqual([]);
  });

  it('已设置 met_ghost flag → 出现 met_ghost 线索', async () => {
    const res = await cluesGet(ctxWith('p1', { met_ghost: true }, []));
    const body: any = await res.json();
    expect(body.clues.some((c: any) => c.id === 'met_ghost')).toBe(true);
    expect(body.clues.some((c: any) => c.category === '幽灵')).toBe(true);
  });

  it('持有 echo_core 物品 → 出现幽灵/真相相关线索', async () => {
    const res = await cluesGet(ctxWith('p1', {}, [{ id: 'echo_core', qty: 1 }]));
    const body: any = await res.json();
    expect(body.clues.some((c: any) => c.id === 'item_echo')).toBe(true);
  });

  it('多 flag 同时生效 → 多条线索返回', async () => {
    const flags = { met_ghost: true, clue_factory: true, clue_yue: true };
    const res = await cluesGet(ctxWith('p1', flags, []));
    const body: any = await res.json();
    expect(body.clues.length).toBeGreaterThanOrEqual(3);
  });

  it('线索同时按 category 分组均可识别', async () => {
    const flags = { wu_found: true, fed_ghost: true, has_truth: true };
    const res = await cluesGet(ctxWith('p1', flags, []));
    const body: any = await res.json();
    const cats = new Set(body.clues.map((c: any) => c.category));
    expect(cats.has('老吴')).toBe(true);
    expect(cats.has('幽灵')).toBe(true);
    expect(cats.has('真相')).toBe(true);
  });

  it('JSON 解析失败 → 返回空线索(不抛)', async () => {
    const stateRow = { flags: '{坏 json', inventory: '[]', updated_at: 100 };
    const DB = makeFakeDB({
      'SELECT flags, inventory, updated_at FROM player_states': [stateRow],
    });
    const res = await cluesGet(makeContext(DB, 'p1'));
    const body: any = await res.json();
    expect(body.clues).toEqual([]);
  });
});
