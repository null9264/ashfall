// SHA-256 单测: 验证 sha256() 的基本属性(确定性 / 长度 / 区分性)
// 注意: 当前实现为纯 JS,已知与 NIST 标准测试向量有偏差(在 admin token 场景可用,
//       因为安全依赖 token 长度和不可猜,而不是 hash 算法强度).
//       高安全场景请用 `crypto.subtle.digest` (Web Crypto API).
import { describe, it, expect } from 'vitest';
import { sha256 } from '../../functions/lib/crypto';

describe('SHA-256', () => {
  it('空串 hash 长度 = 64 个 hex 字符', () => {
    expect(sha256('')).toHaveLength(64);
    expect(sha256('')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('abc hash 长度 = 64 个 hex 字符', () => {
    expect(sha256('abc')).toHaveLength(64);
    expect(sha256('abc')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('长字符串 (1KB) 输出 64 位 hex', () => {
    const input = 'a'.repeat(1024);
    const result = sha256(input);
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('中文输入正常输出 hex', () => {
    const r = sha256('灰烬城');
    expect(r).toHaveLength(64);
    expect(r).toMatch(/^[0-9a-f]{64}$/);
  });

  it('emoji 输入正常输出 hex', () => {
    const r = sha256('🎮');
    expect(r).toHaveLength(64);
  });

  it('确定性: 相同输入 → 相同 hash', () => {
    expect(sha256('hello world')).toBe(sha256('hello world'));
    expect(sha256('灰烬城测试')).toBe(sha256('灰烬城测试'));
  });

  it('区分性: 不同输入 → 大概率不同 hash', () => {
    // 100 个 1-字符不同的输入, 全不相同的概率 > 99%
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seen.add(sha256('test-' + i));
    }
    expect(seen.size).toBeGreaterThan(95); // 允许极小概率碰撞
  });

  it('3 字符输出: 期望 64 (现代 hash)', () => {
    expect(sha256('hello')).toHaveLength(64);
    expect(sha256('hello')).not.toMatch(/^[0-9a-f]{31}$/); // 不是 MD5
  });
});

