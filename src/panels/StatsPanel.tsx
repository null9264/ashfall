// v2.0.2: 数值记录面板
import type { ViewState, HistoryEntry } from '../types';
import { summarizeEntry, HISTORY_TYPE_LABEL, filterVisibleEntries } from '../components/HistoryDrawer';

const ATTR_LABEL: Record<string, string> = {
  hp: '生命', stamina: '体力', radiation: '辐射', reputation: '声望', scrap: '废料',
};

function fmtTime(ts: number): string {
  try {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return String(ts); }
}

export function StatsPanel({ view, entries, loading, onClose }: {
  view: ViewState; entries: HistoryEntry[] | null; loading: boolean; onClose: () => void;
}) {
  const a = view.attrs;
  const visible = filterVisibleEntries(entries);
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box stats-panel" onClick={(e) => e.stopPropagation()}>
        <div className="speaker">📊 数值记录</div>
        <p className="dialog-text small muted">声望、生命、辐射当前值，以及最近 120 条行为记录（已过滤系统事件）。</p>

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
            <span className="stat-bar big"><i className="scr" style={{ width: Math.max(0, Math.min(100, (a.scrap / 20) * 100)) + '%' }} /></span>
            <span className="stats-v">{a.scrap}</span>
          </div>
        </div>

        <h3 style={{ marginTop: 18 }}>历史记录</h3>
        {loading && <p className="muted small">载入中…</p>}
        {!loading && visible.length === 0 && <p className="muted small">还没有任何行动记录。</p>}
        <ul className="hist-list scrollbox">
          {visible.map((e, i) => (
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
