// v2.0.3 P2: weather / craft / mail 单测
import { describe, it, expect } from 'vitest';
import { getWeatherForDay, weatherToView } from '../../functions/lib/weather';
import { checkRecipe, applyRecipe, findRecipe } from '../../functions/lib/craft';
import { listAvailableMails, isRead, markRead } from '../../functions/lib/mail';
import { makeState } from './_helpers';

describe('getWeatherForDay', () => {
  it('不同 day 可能得到不同天气(确定性 hash)', () => {
    const ws = new Set<number>();
    for (let d = 1; d <= 20; d++) ws.add(getWeatherForDay(d).id as any);
    // 5 种天气中至少出现 2 种(证明 hash 是工作的)
    expect(ws.size).toBeGreaterThanOrEqual(2);
  });
  it('同 day 始终返回同一天气(确定性)', () => {
    expect(getWeatherForDay(3).id).toBe(getWeatherForDay(3).id);
    expect(getWeatherForDay(7).id).toBe(getWeatherForDay(7).id);
  });
  it('weatherToView 给 danger 区返回偏移量', () => {
    const w = getWeatherForDay(1);
    const v = weatherToView(w, 'metro');
    expect(typeof v.dangerOffset).toBe('number');
    expect(v.icon).toBeTruthy();
  });
});

describe('checkRecipe / applyRecipe', () => {
  it('craft_medicine 缺材料 → fail', () => {
    const s = makeState();
    expect(checkRecipe(s, 'craft_medicine').ok).toBe(false);
  });
  it('craft_medicine 材料齐 → ok + 给 meds', () => {
    const s = makeState();
    s.inventory = [
      { id: 'scrap_metal', name: '废金属', qty: 2 },
      { id: 'ration', name: '压缩口粮', qty: 1 },
    ];
    expect(checkRecipe(s, 'craft_medicine').ok).toBe(true);
    const r = applyRecipe(s, 'craft_medicine');
    expect(r.ok).toBe(true);
    expect(s.inventory.find((i) => i.id === 'meds')?.qty).toBe(1);
    // 材料被扣光(数组里已经没有它们)
    expect(s.inventory.find((i) => i.id === 'scrap_metal')).toBeUndefined();
    expect(s.inventory.find((i) => i.id === 'ration')).toBeUndefined();
  });
  it('craft_bunker_key 缺料 → fail,给料 → ok', () => {
    const s = makeState();
    expect(checkRecipe(s, 'craft_bunker_key').ok).toBe(false);
    s.inventory = [{ id: 'scrap_metal', name: '废金属', qty: 3 }];
    expect(applyRecipe(s, 'craft_bunker_key').ok).toBe(true);
    expect(s.inventory.find((i) => i.id === 'key_bunker')).toBeDefined();
  });
  it('未知 recipe → fail', () => {
    const s = makeState();
    expect(checkRecipe(s, 'xxx').ok).toBe(false);
  });
  it('findRecipe 找不到返回 null', () => {
    expect(findRecipe('xxx')).toBeNull();
  });
});

describe('listAvailableMails', () => {
  it('空玩家只能看到 m_welcome(无前置)', () => {
    const s = makeState();
    const list = listAvailableMails(s);
    expect(list.map((m) => m.id)).toEqual(['m_welcome']);
  });
  it('has_truth flag 设了 → 看到 m_truth', () => {
    const s = makeState();
    s.flags['has_truth'] = true;
    const list = listAvailableMails(s);
    expect(list.map((m) => m.id).sort()).toEqual(['m_truth', 'm_welcome']);
  });
  it('questDone q_search1 + has_echo_core → 看 m_bunker / m_echo', () => {
    const s = makeState();
    s.flags['has_echo_core'] = true;
    s.quests['q_search1'] = { status: 'done' };
    const ids = listAvailableMails(s).map((m) => m.id).sort();
    expect(ids).toContain('m_bunker');
    expect(ids).toContain('m_echo');
  });
  it('loopMin=2 → loop>=2 才出现 m_loop', () => {
    const s = makeState();
    expect(listAvailableMails(s).map((m) => m.id)).not.toContain('m_loop');
    s.loop = 2;
    expect(listAvailableMails(s).map((m) => m.id)).toContain('m_loop');
  });
  it('isRead + markRead 正确切换', () => {
    const s = makeState();
    const list = listAvailableMails(s);
    const welcome = list.find((m) => m.id === 'm_welcome')!;
    expect(isRead(s, welcome)).toBe(false);
    expect(markRead(s, welcome)).toBe(true);
    expect(isRead(s, welcome)).toBe(true);
    expect(markRead(s, welcome)).toBe(false); // 二次调用 false
  });
});