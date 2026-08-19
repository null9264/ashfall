// v2.0.2 Top-right history drawer
// 显示最近 N 条历史(mobile 上压缩为紧凑列表,desktop 展开为下拉)
import type { HistoryEntry } from '../types';

const ATTR_LABEL: Record<string, string> = {
  hp: '生命', stamina: '体力', radiation: '辐射', reputation: '声望', scrap: '废料',
};

export const HISTORY_TYPE_LABEL: Record<string, string> = {
  move: '移动',
  pickup: '拾取',
  talk: '对话',
  quest_accept: '接取',
  quest_complete: '完成',
  hidden: '发现',
  ending: '结局',
  reset: '重来',
  nickname: '登记',
  hint: '风声',
  // login / feedback 在视图中默认过滤掉,不展示
};

function fmtTimeShort(ts: number): string {
  try {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}

// 这些 type 我们不在面板里展示
const HIDDEN_TYPES: ReadonlySet<string> = new Set(['login', 'feedback']);

export function filterVisibleEntries(entries: HistoryEntry[] | null): HistoryEntry[] {
  if (!entries) return [];
  // 1. 完全过滤掉 login / feedback
  // 2. 当只看到 talk / move 的"老数据"没带中文名时,展示 fallback ref
  return entries.filter((e) => !HIDDEN_TYPES.has(e.type));
}

export function summarizeEntry(e: HistoryEntry): string {
  const m = (e.meta as any) || {};
  switch (e.type) {
    case 'move': {
      if (m.from_name && m.to_name) return `${m.from_name} → ${m.to_name}`;
      if (m.from_name) return `→ ${m.to_name || e.ref}`;
      if (m.to_name) return `→ ${m.to_name}`;
      return e.ref || '移动';
    }
    case 'pickup': return `${m.name || e.ref || '物品'} ×${m.qty ?? 1}`;
    case 'talk': {
      const name = m.npc_name || e.ref || '';
      // node 是对话节点 id,不展示 raw id;只展示"对谁"
      return name ? `与 ${name}` : '对话';
    }
    case 'quest_accept': return m.name || e.ref || '任务';
    case 'quest_complete': {
      const attr = m.attr
        ? Object.entries(m.attr).map(([k, v]) => `${ATTR_LABEL[k] || k} ${(v as number) > 0 ? '+' : ''}${v}`).join(' / ')
        : '';
      return m.method ? `${m.name || e.ref} · ${m.method}` : (m.name || e.ref || '任务') + (attr ? ` · ${attr}` : '');
    }
    case 'hidden': return m.name || e.ref || '隐藏要素';
    case 'ending': return m.title || e.ref || '结局';
    case 'reset': return '重置了世界';
    case 'nickname': return `起名 @${e.ref || m.nickname || ''}`;
    case 'hint': return m.text || m.area_name || '暗线提示';
    case 'login': return ''; // 不会显示,但兜底
    case 'feedback': return '';
    default: return e.ref || e.type;
  }
}

export function HistoryDrawer({
  entries,
  loading,
  onOpenFull,
  onRefresh,
}: {
  entries: HistoryEntry[] | null;
  loading: boolean;
  onOpenFull: () => void;
  onRefresh?: () => void;
}) {
  const visible = filterVisibleEntries(entries);
  const recent = visible.slice(0, 5);
  return (
    <div className="hist-drawer" aria-label="最近行动">
      <div className="hist-head">
        <span className="hist-title">最近行动</span>
        {onRefresh && (
          <button className="hist-refresh" onClick={onRefresh} disabled={loading} title="刷新">↻</button>
        )}
        <button className="hist-open" onClick={onOpenFull}>查看全部 →</button>
      </div>
      {loading && <div className="hist-empty">载入中…</div>}
      {!loading && recent.length === 0 && <div className="hist-empty">暂无行动</div>}
      {!loading && recent.length > 0 && (
        <ul className="hist-mini-list">
          {recent.map((e, i) => (
            <li key={i} className="hist-mini">
              <span className="hist-mini-type">{HISTORY_TYPE_LABEL[e.type] || e.type}</span>
              <span className="hist-mini-text">{summarizeEntry(e)}</span>
              <span className="hist-mini-time">{fmtTimeShort(e.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

