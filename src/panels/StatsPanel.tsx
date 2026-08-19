// v2.0.2: 数值记录面板
import type { ViewState, HistoryEntry } from '../types';

const ATTR_LABEL: Record<string, string> = {
  hp: '生命', stamina: '体力', radiation: '辐射', reputation: '声望', scrap: '废料',
};

const HISTORY_TYPE_LABEL: Record<string, string> = {
  move: '移动', pickup: '拾取', quest_accept: '接取任务',
  quest_complete: '完成任务', hidden: '隐藏发现', ending: '结局',
  reset: '重来', nickname: '登记', login: '登录',
};

function fmtTime(ts: number): string {
  try {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return String(ts); }
}

function summarizeEntry(e: HistoryEntry): string {
  const m = e.meta || {};
  switch (e.type) {
    case 'move': return m.from ? `从 ${m.from} → ${m.to || e.ref}` : (e.ref || '移动');
    case 'pickup': return `${m.name || e.ref || '物品'} ×${m.qty ?? 1}`;
    case 'quest_accept': return `${m.name || e.ref || '任务'}`;
    case 'quest_complete': {
      const attr = m.attr ? Object.entries(m.attr).map(([k, v]) => `${ATTR_LABEL[k] || k} ${v as number > 0 ? '+' : ''}${v}`).join(' / ') : '';
      return `${m.name || e.ref || '任务'}${attr ? `  ·  ${attr}` : ''}`;
    }
    case 'hidden': return `${m.name || e.ref || '隐藏要素'}（${m.area || ''}）`;
    case 'ending': return m.title || e.ref || '结局';
    case 'reset': return '重置了世界';
    case 'nickname': return `起名 @${e.ref || m.nickname || ''}`;
    case 'login': return '登入';
    default: return e.ref || e.type;
  }
}

export function StatsPanel({ view, entries, loading, onClose }: {
  view: ViewState; entries: HistoryEntry[] | null; loading: boolean; onClose: () => void;
}) {
  const a = view.attrs;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box stats-panel" onClick={(e) => e.stopPropagation()}>
        <div className="speaker">📊 数值记录</div>
        <p className="dialog-text small muted">声望、生命、辐射当前值，以及最近 120 条行为记录。</p>

        <div className="stats-current">
          <div className="stats-row">
            <span className="stats-name">生命</span>
            <span className="stat-bar big"><i className="hp" style={{ width: Math.max(0, Math.min(100, a.hp)) + '%' }} /></span>
            <span className="stats-v">{a.hp}</span>
          </div>
          <div className="stats-row">
            <span className="stats-name">辐射</span>
            <span className="stat-bar big"><i className="rad" style={{ width: Math.max(0, Math.min(100, a.radiation)) + '%' }} /></span>
            <span className="stats-v">{a.radiation}</span>
          </div>
          <div className="stats-row">
            <span className="stats-name">声望</span>
            <span className="stat-bar big"><i className="rep" style={{ width: Math.max(0, Math.min(100, (a.reputation / 50) * 100)) + '%' }} /></span>
            <span className="stats-v">{a.reputation}</span>
          </div>
          <div className="stats-row">
            <span className="stats-name">体力</span>
            <span className="stat-bar big"><i className="sta" style={{ width: Math.max(0, Math.min(100, a.stamina)) + '%' }} /></span>
            <span className="stats-v">{a.stamina}</span>
          </div>
          <div className="stats-row">
            <span className="stats-name">废料</span>
            <span className="stat-bar big"><i className="scr" style={{ width: Math.max(0, Math.min(100, a.scrap)) + '%' }} /></span>
            <span className="stats-v">{a.scrap}</span>
          </div>
        </div>

        <h3 style={{ marginTop: 18 }}>历史记录</h3>
        {loading && <p className="muted small">载入中…</p>}
        {!loading && (!entries || entries.length === 0) && <p className="muted small">还没有任何行动记录。</p>}
        <ul className="hist-list">
          {(entries || []).map((e, i) => (
            <li key={i} className="hist-item">
              <span className="hist-type">{HISTORY_TYPE_LABEL[e.type] || e.type}</span>
              <span className="hist-text">{summarizeEntry(e)}</span>
              <span className="hist-time">{fmtTime(e.created_at)}</span>
            </li>
          ))}
        </ul>

        <div className="row col" style={{ marginTop: 16 }}>
          <button className="dlg-opt ghost" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
