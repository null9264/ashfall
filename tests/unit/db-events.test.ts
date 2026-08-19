// v2.0.2: state.ts 不再写入 login 事件（避免污染历史）
// 通过纯静态文本扫描保证：state.ts 里不能再出现 logEvent(..., 'login', ...)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('state.ts 不再产生 login 事件', () => {
  it('不应再调用 logEvent(..., "login", ...)', () => {
    const p = resolve(__dirname, '../../functions/api/state.ts');
    const text = readFileSync(p, 'utf8');
    expect(text).not.toMatch(/logEvent\(\s*[^,]+,\s*['"]login['"]/);
  });

  it('应包含 pickHint 调用', () => {
    const p = resolve(__dirname, '../../functions/api/state.ts');
    const text = readFileSync(p, 'utf8');
    expect(text).toMatch(/pickHint/);
    expect(text).toMatch(/hint/);
  });
});

describe('endpoint meta 中文名', () => {
  it('move.ts: logEvent meta 含 from_name/to_name', () => {
    const p = resolve(__dirname, '../../functions/api/move.ts');
    expect(readFileSync(p, 'utf8')).toMatch(/from_name/);
    expect(readFileSync(p, 'utf8')).toMatch(/to_name/);
  });
  it('talk.ts: logEvent meta 含 npc_name', () => {
    const p = resolve(__dirname, '../../functions/api/talk.ts');
    expect(readFileSync(p, 'utf8')).toMatch(/npc_name/);
  });
  it('quest/accept.ts: logEvent meta 含 name', () => {
    const p = resolve(__dirname, '../../functions/api/quest/accept.ts');
    expect(readFileSync(p, 'utf8')).toMatch(/name:\s*questName/);
  });
  it('quest/complete.ts: logEvent meta 含 name + method', () => {
    const p = resolve(__dirname, '../../functions/api/quest/complete.ts');
    expect(readFileSync(p, 'utf8')).toMatch(/name:\s*questName/);
    expect(readFileSync(p, 'utf8')).toMatch(/method:\s*methodLabel/);
  });
  it('trigger-hidden.ts: logEvent meta 含 hiddenName', () => {
    const p = resolve(__dirname, '../../functions/api/trigger-hidden.ts');
    expect(readFileSync(p, 'utf8')).toMatch(/name:\s*hiddenName/);
  });
});

describe('events.ts: hint 类型已加入 EventType', () => {
  it('EventType 包含 hint', () => {
    const p = resolve(__dirname, '../../functions/lib/events.ts');
    const text = readFileSync(p, 'utf8');
    expect(text).toMatch(/'hint'/);
  });
});
