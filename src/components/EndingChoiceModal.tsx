// v2.0.3: 结局选择 modal — 选之前显示 cost/keeps,让玩家看清选择
import type { ViewState } from '../types';

export function EndingChoiceModal({
  endings,
  busy,
  onChoose,
  onClose,
}: {
  endings: NonNullable<ViewState['endings']['available']>;
  busy: boolean;
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box ending-choice-modal" onClick={(e) => e.stopPropagation()}>
        <div className="speaker">🛤 走向终点</div>
        <p className="dialog-text small muted">
          你的选择已经走到这里。每一个结局,都是把一部分东西留下、把一部分东西带走。<br/>
          选之前,请看清你会失去什么、留下什么。
        </p>
        <div className="ending-choices-list">
          {endings.map((e) => (
            <div key={e.id} className="ending-choice-card" style={{ borderColor: e.tone_color || '#888' }}>
              <div className="ending-choice-head">
                <span className="ending-choice-title">{e.title}</span>
                <span className="ending-choice-tone">{e.tone}</span>
              </div>
              {e.cost && (
                <div className="ending-choice-row cost">
                  <span className="ending-choice-label">失去</span>
                  <span className="ending-choice-val">{e.cost}</span>
                </div>
              )}
              {e.keeps && (
                <div className="ending-choice-row keeps">
                  <span className="ending-choice-label">留下</span>
                  <span className="ending-choice-val">{e.keeps}</span>
                </div>
              )}
              <button
                className="dlg-opt primary"
                disabled={busy}
                onClick={() => onChoose(e.id)}
              >
                走向这条结局
              </button>
            </div>
          ))}
        </div>
        <div className="row col">
          <button className="dlg-opt ghost" onClick={onClose}>我再想想</button>
        </div>
      </div>
    </div>
  );
}
