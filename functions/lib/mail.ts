// v2.0.3 P2: 邮件系统 — 档案管理员发来的信件(可在剧情节点触发)
// 玩家在 footer 进"信箱"翻阅
import type { PlayerState } from './types';

export interface Mail {
  id: string;
  // 触发条件(达到后才会出现在列表)
  requires: Array<{ flag?: string; questDone?: string; loopMin?: number; attrs?: Record<string, number> }>;
  from: string;       // 寄件人显示名
  subject: string;
  body: string;       // 短文本(1-3 段)
  // 已读标记字段名(默认 'mail_<id>_read')
  readFlag: string;
}

export const MAILS: Mail[] = [
  {
    id: 'm_welcome',
    from: '档案管理员',
    subject: '欢迎来到灰烬城',
    body: '陌生人,我把你的身份记录在案了。别着急走出去 —— 先在西门坐一坐,听听风声。',
    readFlag: 'mail_m_welcome_read',
    requires: [],
  },
  {
    id: 'm_truth',
    from: '档案管理员',
    subject: '关于那张照片',
    body: '如果你捡到了一张被烧焦的照片,把它带在手上 —— 该说话的人会对你多嘴一些。',
    readFlag: 'mail_m_truth_read',
    requires: [{ flag: 'has_truth' }],
  },
  {
    id: 'm_bunker',
    from: '档案管理员',
    subject: '密室在何方',
    body: '那条街,有个老家伙有一把钥匙。钥匙哪儿来?问铁皮棚里的人。',
    readFlag: 'mail_m_bunker_read',
    requires: [{ questDone: 'q_search1' }],
  },
  {
    id: 'm_echo',
    from: '回声',
    subject: '……',
    body: '你不必听懂我。我只是把声音留下,让以后的人知道,我们也曾在这里活过。',
    readFlag: 'mail_m_echo_read',
    requires: [{ flag: 'has_echo_core' }],
  },
  {
    id: 'm_loop',
    from: '档案管理员',
    subject: '新的一周目',
    body: '你又回来了。这是好事。我给你留了一份旧笔记 —— 也许这次你会看见上次没看见的。',
    readFlag: 'mail_m_loop_read',
    requires: [{ loopMin: 2 }],
  },
];

// 把 flags + questDone + attrs + loop 全打包成 req 校验
function reqOk(s: PlayerState, r: Mail['requires'][number]): boolean {
  if (r.flag && !s.flags[r.flag]) return false;
  if (r.questDone && s.quests[r.questDone]?.status !== 'done') return false;
  if (r.attrs) {
    for (const [k, v] of Object.entries(r.attrs)) {
      const cur = (s.attrs as any)[k] ?? 0;
      if (cur < v) return false;
    }
  }
  if (typeof r.loopMin === 'number' && (s.loop ?? 1) < r.loopMin) return false;
  return true;
}

export function listAvailableMails(s: PlayerState): Mail[] {
  return MAILS.filter((m) => m.requires.every((r) => reqOk(s, r)));
}

export function isRead(s: PlayerState, m: Mail): boolean {
  return !!s.flags[m.readFlag];
}

export function markRead(s: PlayerState, m: Mail): boolean {
  if (s.flags[m.readFlag]) return false;
  s.flags[m.readFlag] = true;
  return true;
}