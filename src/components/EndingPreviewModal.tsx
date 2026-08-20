// v2.0.3: 锁定结局预览 - 让玩家知道还得做什么
import type { ViewState } from '../types';

export function EndingPreviewModal({
  endings,
  onClose,
}: {
  endings: ViewState['endings']['locked'];
  onClose: () => void;
}) {
  if (!endings || endings.length === 0) return null;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box ending-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="speaker">🔒 尚未解锁的结局</div>
        <p className="dialog-text small muted">
          这些结局需要满足不同的条件。选择是公开 / 沉默 / 妥协 / 牺牲，决定你会走向哪一个。<br />
          下面的线索会告诉你方向，但不会直接告诉你所有细节。
        </p>
        <ul className="ending-preview-list">
          {endings.map((e) => (
            <li key={e.id} className="ending-preview-item">
              <div className="ending-preview-title">
                <span className="lock-ic">🔒</span> {e.title}
              </div>
              <p className="ending-preview-hint">{e.hint}</p>
            </li>
          ))}
        </ul>
        <div className="row col">
          <button className="dlg-opt primary" onClick={onClose}>明白了</button>
        </div>
      </div>
    </div>
  );
}
