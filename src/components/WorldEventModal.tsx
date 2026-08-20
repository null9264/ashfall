// v2.0.3: 世界事件 modal — 钟声等一次性事件
export function WorldEventModal({
  event,
  onClose,
}: {
  event: { id: string; title: string; body: string } | null | undefined;
  onClose: () => void;
}) {
  if (!event) return null;
  const isBell = event.id === 'w_bell';
  return (
    <div className="modal" onClick={onClose}>
      <div className={'modal-box world-event-modal' + (isBell ? ' bell' : '')} onClick={(e) => e.stopPropagation()}>
        <div className="world-event-icon">{isBell ? '🔔' : '✦'}</div>
        <h2 className="world-event-title">{event.title}</h2>
        <p className="dialog-text world-event-body">
          {event.body.split('\n\n').map((para, i) => (
            <span key={i} className="world-event-para">
              {para}
              {i < event.body.split('\n\n').length - 1 && <br />}
            </span>
          ))}
        </p>
        <div className="row col">
          <button className="dlg-opt primary" onClick={onClose}>我听到了</button>
        </div>
      </div>
    </div>
  );
}
