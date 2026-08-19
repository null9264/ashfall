// 昵称系统：服务端强制唯一
import type { D1Database } from '@cloudflare/workers-types';

const NICK_RE = /^[\p{L}\p{N}_-]{2,16}$/u;

export function isValidNickname(s: string): boolean {
  if (!NICK_RE.test(s)) return false;
  // 用码点计数（避免 emoji 多字符突破长度限制）
  return Array.from(s).length <= 16;
}

export async function getNickname(DB: D1Database, player_id: string): Promise<string | null> {
  const r = await DB.prepare('SELECT nickname FROM nicknames WHERE player_id = ? ORDER BY created_at DESC LIMIT 1').bind(player_id).first<any>();
  return r?.nickname ?? null;
}

export async function setNickname(DB: D1Database, player_id: string, nickname: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isValidNickname(nickname)) return { ok: false, reason: '昵称需 2-16 位字母/数字/中文/下划线/短横线' };
  // 唯一性：先查是否被他人占用
  const taken = await DB.prepare('SELECT player_id FROM nicknames WHERE nickname = ?').bind(nickname).first<any>();
  if (taken && taken.player_id !== player_id) {
    return { ok: false, reason: '昵称已被其他玩家使用' };
  }
  // 删除该玩家旧昵称，再插入
  await DB.prepare('DELETE FROM nicknames WHERE player_id = ?').bind(player_id).run();
  await DB.prepare('INSERT INTO nicknames (nickname, player_id, created_at) VALUES (?,?,?)').bind(nickname, player_id, Date.now()).run();
  return { ok: true };
}

export async function listAllNicknames(DB: D1Database): Promise<Array<{ nickname: string; player_id: string; created_at: number }>> {
  const r = await DB.prepare('SELECT nickname, player_id, created_at FROM nicknames ORDER BY created_at DESC').all<any>();
  return r.results || [];
}