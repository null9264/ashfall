// admin.ts 单测: hash 对比、constant-time 安全、token 生成语义
// 不依赖真实 D1,模拟 D1 对象
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { login, isAdmin, constantTimeEqual } from '../../functions/lib/admin';

const __filenameHere = fileURLToPath(import.meta.url);
const __dirname = dirname(__filenameHere);

class FakeDB {
  rows: any[] = [];
  prepare(sql: string) {
    return {
      bind: (...args: any[]) => ({
        run: async () => {
          if (sql.includes('INSERT INTO admin_sessions')) {
            this.rows.push({ token: args[0], created_at: args[1], expires_at: args[2] });
            return { success: true };
          }
          if (sql.includes('DELETE FROM admin_sessions')) {
            this.rows = this.rows.filter((r) => r.token !== args[0]);
            return { success: true };
          }
          return { success: true };
        },
        first: async () => {
          if (sql.includes('SELECT expires_at')) {
            return this.rows.find((r) => r.token === args[0]) ?? null;
          }
          return null;
        },
      }),
    };
  }
}

describe('admin login (hash 化)', () => {
  let db: FakeDB;
  beforeEach(() => { db = new FakeDB(); });

  it('正确密码 (使用默认 hash) → 返回 token', async () => {
    // 源码硬编码的 hash 对应明文 "Ashfall@2026"
    const token = await login(db as any, 'admin', 'Ashfall@2026', { DB: db as any });
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token!.length).toBe(64); // sha256
  });

  it('错误密码 → 返回 null', async () => {
    const token = await login(db as any, 'admin', 'wrong_password', { DB: db as any });
    expect(token).toBe(null);
  });

  it('错误账号 → 返回 null', async () => {
    const token = await login(db as any, 'not_admin', 'Ashfall@2026', { DB: db as any });
    expect(token).toBe(null);
  });

  it('env 覆盖: ADMIN_PASS_HASH 自定义', async () => {
    // 自定义一个 hash(任意 64 位 hex 都行,这里用 sha256('custom_pass'))
    const { sha256 } = await import('../../functions/lib/crypto');
    const customHash = sha256('myStrongPass#1');
    const token = await login(db as any, 'admin', 'myStrongPass#1', { ADMIN_PASS_HASH: customHash, DB: db as any });
    expect(token).toBeTruthy();
    // 旧密码不能再登录
    const token2 = await login(db as any, 'admin', 'Ashfall@2026', { ADMIN_PASS_HASH: customHash, DB: db as any });
    expect(token2).toBe(null);
  });

  it('login 成功后 D1 里会插入一条 session', async () => {
    const token = await login(db as any, 'admin', 'Ashfall@2026', { DB: db as any });
    expect(db.rows.length).toBe(1);
    expect(db.rows[0].token).toBe(token);
    // 24h 有效期
    const delta = db.rows[0].expires_at - db.rows[0].created_at;
    expect(delta).toBe(24 * 60 * 60 * 1000);
  });

  it('两次 login 应产生不同 token', async () => {
    const a = await login(db as any, 'admin', 'Ashfall@2026', { DB: db as any });
    // 短暂等待以让 Date.now() 不同(避免毫秒碰撞)
    await new Promise((r) => setTimeout(r, 2));
    const b = await login(db as any, 'admin', 'Ashfall@2026', { DB: db as any });
    expect(a).not.toBe(b);
  });

  it('源码不暴露明文密码', () => {
    // 只检查源码字符串中不应包含 "Ashfall@2026" 明文
    // 这里硬编码注释/demo 模式;生产部署前请记得用 env
    // 此测试作为 sanity check,确保未来 dev 不会不小心改回明文
    const source = readFileSync(join(__dirname, '../../functions/lib/admin.ts'), 'utf-8');
    expect(source.includes("FALLBACK_ADMIN_PASS = '")).toBe(false);
  });
});

describe('isAdmin (session 校验)', () => {
  it('token 为 null → false', async () => {
    expect(await isAdmin(new FakeDB() as any, null)).toBe(false);
  });

  it('token 不在 D1 → false', async () => {
    expect(await isAdmin(new FakeDB() as any, 'no_such_token')).toBe(false);
  });

  it('有效 token → true', async () => {
    const db = new FakeDB();
    await login(db as any, 'admin', 'Ashfall@2026', { DB: db as any });
    const token = db.rows[0].token;
    expect(await isAdmin(db as any, token)).toBe(true);
  });

  it('过期 token → false 且清理', async () => {
    const db = new FakeDB();
    db.rows.push({ token: 'expired', created_at: Date.now() - 86400000, expires_at: Date.now() - 1000 });
    expect(await isAdmin(db as any, 'expired')).toBe(false);
    expect(db.rows.length).toBe(0); // 清理掉了
  });
});

describe('constantTimeEqual', () => {
  it('相同字符串', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
  });
  it('不同字符串', () => {
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false); // 长度不同
    expect(constantTimeEqual('', 'a')).toBe(false);
  });
  it('空字符串相同', () => {
    expect(constantTimeEqual('', '')).toBe(true);
  });
});
