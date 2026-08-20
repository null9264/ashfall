// v2.0.3: 主线里程碑完成时的过场
export function MilestoneModal({
  title,
  body,
  step,
  total,
  onClose,
}: {
  title: string;
  body: string;
  step: number;
  total: number;
  onClose: () => void;
}) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box milestone-modal" onClick={(e) => e.stopPropagation()}>
        <div className="milestone-step">主线 · 第 {step} / {total} 步</div>
        <h2 className="milestone-title">✦ {title}</h2>
        <p className="dialog-text">{body}</p>
        <div className="row col">
          <button className="dlg-opt primary" onClick={onClose}>继续</button>
        </div>
      </div>
    </div>
  );
}
