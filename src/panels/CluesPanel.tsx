// v2.0.2: 关键线索日志面板
import type { ClueEntry } from '../types';

function fmtTime(ts: number): string {
  try {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return String(ts); }
}

export function CluesPanel({ clues, loading, onClose }: {
  clues: ClueEntry[] | null; loading: boolean; onClose: () => void;
}) {
  const grouped: Record<string, ClueEntry[]> = {};
  for (const c of clues || []) {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  }
  const cats = Object.keys(grouped).sort();
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box clues-panel" onClick={(e) => e.stopPropagation()}>
        <div className="speaker">🔖 线索日志</div>
        <p className="dialog-text small muted">已获取的关键线索汇总。剧情全貌往往就在这些碎片里。</p>

        {loading && <p className="muted small">载入中…</p>}
        {!loading && cats.length === 0 && (
          <p className="muted small">你还没拾起任何线索——多和这里的人说说话、仔细搜寻每个角落。</p>
        )}

        {cats.map((cat) => (
          <div key={cat} className="clue-group">
            <h4 className="clue-cat">{cat} <span className="muted small">×{grouped[cat].length}</span></h4>
            <ul className="clue-list">
              {grouped[cat].map((c) => (
                <li key={c.id} className="clue-item">
                  <span className="clue-text">{c.text}</span>
                  <span className="muted small">— {c.source} · {fmtTime(c.acquired_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="row col" style={{ marginTop: 16 }}>
          <button className="dlg-opt ghost" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
