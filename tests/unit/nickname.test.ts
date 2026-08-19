// nickname 系统单测:仅测试无 D1 的纯函数部分(isValidNickname)
import { describe, it, expect } from 'vitest';
import { isValidNickname } from '../../functions/lib/nickname';

describe('isValidNickname (无 DB 依赖部分)', () => {
  it('2-16 中文字符通过', () => {
    expect(isValidNickname('灰烬')).toBe(true);
    expect(isValidNickname('旧城守夜人')).toBe(true);
  });

  it('1 字符拒', () => {
    expect(isValidNickname('测')).toBe(false);
  });

  it('超 16 字符拒', () => {
    expect(isValidNickname('测试'.repeat(10))).toBe(false);
    // 20 个中文 = 20 码点 > 16
  });

  it('刚好 16 字符通过', () => {
    expect(isValidNickname('测'.repeat(16))).toBe(true);
  });

  it('英文+数字+下划线+短横线通过', () => {
    expect(isValidNickname('Freya_2026')).toBe(true);
    expect(isValidNickname('user-name')).toBe(true);
  });

  it('含空格拒', () => {
    expect(isValidNickname('hello world')).toBe(false);
  });

  it('含特殊字符拒', () => {
    expect(isValidNickname('@admin')).toBe(false);
    expect(isValidNickname('user!')).toBe(false);
    expect(isValidNickname('中文#标签')).toBe(false);
  });

  it('纯 emoji 拒(不在白名单字符类)', () => {
    // emoji 字符不在 [\p{L}\p{N}_-] 范围
    expect(isValidNickname('🎮')).toBe(false);
  });

  it('空字符串拒', () => {
    expect(isValidNickname('')).toBe(false);
  });

  it('混合中日韩(CJK) 字符正常', () => {
    expect(isValidNickname('旧城守夜人')).toBe(true);
    expect(isValidNickname('제로')).toBe(true); // 韩文
  });
});
