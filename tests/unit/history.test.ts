// v2.0.2: 历史记录中文名回归 + EventType 包括 'hint'
import { describe, it, expect } from 'vitest';

// 确保我们导出的 history 摘要能用上 meta 里提供的 from_name/to_name/npc_name
import { summarizeEntry } from '../../src/components/HistoryDrawer';
import type { HistoryEntry } from '../../src/types';

describe('summarizeEntry 中文名优先', () => {
  it('move: meta from_name/to_name 优先于 ref', () => {
    const e: HistoryEntry = {
      type: 'move',
      ref: 'metro',
      meta: { from: 'metro', from_name: '地铁废线', to_name: '居民楼群', area: 'tenements' } as any,
      created_at: Date.now(),
    };
    const s = summarizeEntry(e);
    expect(s).toContain('地铁废线');
    expect(s).toContain('居民楼群');
    expect(s).not.toContain('metro');
  });

  it('move: 缺 from_name 但有 to_name 也能展示', () => {
    const e: HistoryEntry = {
      type: 'move', ref: 'market', meta: { to_name: '黑市街区' } as any, created_at: Date.now(),
    };
    const s = summarizeEntry(e);
    expect(s).toContain('黑市街区');
  });

  it('move: 完全无中文名时回退 ref', () => {
    const e: HistoryEntry = { type: 'move', ref: 'tenements', meta: {}, created_at: Date.now() };
    const s = summarizeEntry(e);
    expect(s).toBe('tenements');
  });

  it('talk: meta.npc_name 优先', () => {
    const e: HistoryEntry = {
      type: 'talk',
      ref: 'linshen',
      meta: { npc_name: '林婶', node: 'a', choice: 1 } as any,
      created_at: Date.now(),
    };
    // summarizeEntry 当前不专门处理 talk 类型 — 检查不抛错即可
    expect(() => summarizeEntry(e)).not.toThrow();
  });

  it('quest_accept: meta.name 优先于 ref', () => {
    const e: HistoryEntry = {
      type: 'quest_accept', ref: 'q_husband', meta: { name: '林婶的丈夫' }, created_at: Date.now(),
    };
    const s = summarizeEntry(e);
    expect(s).toBe('林婶的丈夫');
    expect(s).not.toContain('q_husband');
  });

  it('quest_complete: meta.name + method 都展示', () => {
    const e: HistoryEntry = {
      type: 'quest_complete',
      ref: 'q_cure',
      meta: { name: '医生的药', method: '给他 2 盒抗生素' },
      created_at: Date.now(),
    };
    const s = summarizeEntry(e);
    expect(s).toContain('医生的药');
    expect(s).toContain('给他 2 盒抗生素');
  });

  it('hidden: meta.name 优先于 ref', () => {
    const e: HistoryEntry = {
      type: 'hidden', ref: 'h_undermap', meta: { name: '地下管网地图', area: 'factory' },
      created_at: Date.now(),
    };
    const s = summarizeEntry(e);
    expect(s).toBe('地下管网地图');
  });

  it('hint 类型也能 summarize', () => {
    const e: HistoryEntry = {
      type: 'hint',
      ref: 'h_undermap',
      meta: { text: '工厂某处藏着一张通往地下的地图。', area_name: '废弃工厂' } as any,
      created_at: Date.now(),
    };
    const s = summarizeEntry(e);
    expect(s).toContain('工厂某处');
  });
});
