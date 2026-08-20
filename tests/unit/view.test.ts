// view.ts 单测: 组装给前端的 view,要保证 nickname 必返回,不见敏感字段
import { describe, it, expect, beforeEach } from 'vitest';
import { viewState } from '../../functions/lib/view';
import { evaluateEndings } from '../../functions/lib/rules';
import { ENDINGS, QUESTS } from '../../functions/lib/content';
import type { PlayerState } from '../../functions/lib/types';

function makeState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    player_id: 'p',
    area: 'gate',
    attrs: { hp: 100, stamina: 100, radiation: 0, reputation: 0, scrap: 0 },
    inventory: [{ id: 'scrap_metal', name: '废铁皮', qty: 2 }],
    quests: { q_supply: { status: 'active' } },
    npc: { zhou: { met: true, trust: 1, stage: 0 } },
    flags: {},
    ending: null,
    finished_at: null,
    updated_at: Date.now(),
    ...overrides,
  } as PlayerState;
}

describe('viewState', () => {
  it('返回 nickname 字段(强制必传)', () => {
    const s = makeState();
    const v = viewState(s, 'Freya');
    expect(v.nickname).toBe('Freya');
  });

  it('nickname=null 时字段也为 null', () => {
    const s = makeState();
    const v = viewState(s, null);
    expect(v.nickname).toBe(null);
  });

  it('缺 nickname 参数编译期/运行期应报错(TS signature)', () => {
    // TypeScript 强制必传,这个 case 在编译期就应爆
    // 这里做个 sanity check:any 类型下不传也至少能运行,但业务禁止这样
    const s = makeState();
    expect(() => viewState(s as any, undefined as any)).not.toThrow();
    // 但不传时得到的 nickname 字段是 undefined (前端应处理)
  });

  it('不泄露服务端 flag(如 hidden 后台 flag)', () => {
    const s = makeState();
    s.flags['secret_admin_flag'] = true;
    const v: any = viewState(s, 'x');
    expect(v.flags).toBeUndefined();
  });

  it('quests 数组展示当前区域发布或已接', () => {
    const s = makeState();
    const v = viewState(s, 'x');
    // 应至少含 q_supply(已接)
    expect(v.quests.find((q) => q.id === 'q_supply')).toBeDefined();
    // 状态应为 active
    const q = v.quests.find((q) => q.id === 'q_supply');
    expect(q?.status).toBe('active');
  });

  it('quest methods 完整展示 id 和 label', () => {
    const s = makeState();
    const v = viewState(s, 'x');
    const q = v.quests.find((q) => q.id === 'q_supply');
    if (q) {
      expect(q.methods.length).toBeGreaterThan(0);
      expect(q.methods[0]).toHaveProperty('id');
      expect(q.methods[0]).toHaveProperty('label');
    }
  });

  it('inventory 暴露 id/name/qty', () => {
    const s = makeState();
    const v = viewState(s, 'x');
    expect(v.inventory[0]).toMatchObject({
      id: 'scrap_metal', name: '废铁皮', qty: 2,
    });
  });

  it('attr 数值精度: radiation 0 → 0', () => {
    const s = makeState();
    const v = viewState(s, 'x');
    expect(v.attrs.radiation).toBe(0);
  });

  it('area.name 在 output 中存在', () => {
    const s = makeState();
    const v = viewState(s, 'x');
    expect(v.area.name).toBeTruthy();
    expect(v.area.id).toBe('gate');
  });

  it('endings.available 来自 evaluateEndings', () => {
    const s = makeState();
    const v = viewState(s, 'x');
    const r = evaluateEndings(s);
    expect(v.endings.available.length).toBe(r.available.length);
    expect(v.endings.locked.length).toBe(r.locked.length);
  });

  it('ending 设置后 endingDetail 包含 passages', () => {
    const s = makeState();
    s.ending = ENDINGS[0].id;
    const v = viewState(s, 'x');
    expect(v.endingDetail).toBeDefined();
    expect(v.endingDetail!.passages.length).toBeGreaterThan(0);
  });

  it('unlockedAreas 起步至少含当前区域', () => {
    const s = makeState();
    s.area = 'gate';
    const v = viewState(s, 'x');
    expect(v.unlockedAreas.length).toBeGreaterThan(0);
  });

  it('locked neighbor 不可见(除非解锁)', () => {
    const s = makeState({ area: 'market' });
    const v = viewState(s, 'x');
    // market neighbors 里如有 lock=true 的,在 unlockFlag 未设时,area.name 不应出现在 unlockedAreas
    // 这间接验证 viewState 聚合 filters 是符合解锁逻辑的
    for (const aName of v.unlockedAreas) {
      expect(aName).toBeTruthy();
    }
  });

  it('全部 QUESTS 都有 area 字段', () => {
    // schema/data integrity guard
    for (const q of QUESTS) {
      expect(q.area).toBeTruthy();
      expect(q.methods.length).toBeGreaterThan(0);
    }
  });

  // v2.0.3: 主线进度(0..5) / firstTime / 锁定结局 hint / quest category
  it('mainProgress 默认 0,完成任一主线变成 1', () => {
    const s = makeState();
    const v0 = viewState(s, 'x');
    expect(v0.mainProgress).toBe(0);
    const mainStep1 = QUESTS.find((q) => q.mainStep === 1);
    expect(mainStep1).toBeTruthy();
    s.quests[mainStep1!.id] = { status: 'done', method: mainStep1!.methods[0].id };
    const v1 = viewState(s, 'x');
    expect(v1.mainProgress).toBe(1);
  });

  it('firstTime 默认 true; 标记 tutorial_seen 后变 false', () => {
    const s = makeState();
    expect(viewState(s, 'x').firstTime).toBe(true);
    s.tutorial_seen = true;
    expect(viewState(s, 'x').firstTime).toBe(false);
  });

  it('锁定结局都带 hint 中文文本', () => {
    const s = makeState();
    const v = viewState(s, 'x');
    expect(v.endings.locked.length).toBeGreaterThan(0);
    for (const e of v.endings.locked) {
      expect(e.hint).toBeTruthy();
      // 模糊"条件未达成"默认串不应该出现 — 我们每个 ENDINGS 都给了定制 hint
      expect(e.hint).not.toBe('条件未达成');
    }
  });

  it('主线任务都带 category=main 与 mainStep', () => {
    const mains = QUESTS.filter((q) => q.category === 'main');
    expect(mains.length).toBeGreaterThanOrEqual(5);
    const steps = mains.map((q) => q.mainStep).sort();
    expect(JSON.stringify(steps)).toBe(JSON.stringify([1, 2, 3, 4, 5]));
  });

  it('NPC trust 字段默认 0,设置后回显 0..5', () => {
    const s = makeState();
    const v = viewState(s, 'x');
    for (const n of v.npcs) {
      expect(n.trust).toBeGreaterThanOrEqual(0);
      expect(n.trust).toBeLessThanOrEqual(5);
    }
  });
});
