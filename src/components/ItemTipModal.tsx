// v2.0.3: 物品首次拾取 - 弹一个"在哪用 / 为什么重要"的提示
import { getItemTip } from '../lib/itemTips';
import type { ItemDef } from '../types';

export function ItemTipModal({
  itemId,
  itemDefs,
  onClose,
}: {
  itemId: string | null;
  itemDefs: ItemDef[];
  onClose: () => void;
}) {
  if (!itemId) return null;
  const def = itemDefs.find((d) => d.id === itemId);
  const tip = getItemTip(itemId, def as any);
  if (!def || !tip) {
    // 没有登记 tip 也允许关闭
    return (
      <div className="modal" onClick={onClose}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <div className="speaker">已拾取 · {itemId}</div>
          <p className="dialog-text small muted">已加入背包。</p>
          <div className="row col">
            <button className="dlg-opt primary" onClick={onClose}>收好</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box item-tip-modal" onClick={(e) => e.stopPropagation()}>
        <div className="speaker">📦 首次拾取 · {tip.name}</div>
        <p className="dialog-text">{tip.desc || '在灰烬城里,不会总有人愿意为你解释每件东西。'}</p>
        {tip.where && (
          <p className="item-tip-row">
            <span className="item-tip-label">📍 出现在哪里</span>
            <span>{tip.where}</span>
          </p>
        )}
        {tip.hint && (
          <p className="item-tip-row">
            <span className="item-tip-label">💡 为什么重要</span>
            <span>{tip.hint}</span>
          </p>
        )}
        <div className="row col">
          <button className="dlg-opt primary" onClick={onClose}>明白了</button>
        </div>
      </div>
    </div>
  );
}
