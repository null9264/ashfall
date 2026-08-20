// v2.0.3 P2: 信箱抽屉
import { useState } from 'react';
import { api } from '../api';

export function MailDrawer({ mails, unread, onClose, onChanged }: {
  mails: Array<{ id: string; from: string; subject: string; body: string; read: boolean }>;
  unread: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = mails.find((m) => m.id === activeId) || null;
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box mail-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="speaker">📮 信箱{unread > 0 && <span className="badge">{unread}</span>}</div>
        {!active && (
          <>
            {mails.length === 0 && <p className="dialog-text small muted">信箱是空的。也许走出去走一走,会有档案管理员给你写信。</p>}
            <div className="mail-list">
              {mails.map((m) => (
                <button key={m.id} className={'mail-row' + (m.read ? ' read' : '')} onClick={async () => {
                  setActiveId(m.id);
                  if (!m.read) { try { await api.readMail(m.id); onChanged(); } catch {} }
                }}>
                  <span className="mail-subject">{m.read ? '· ' : '● '}{m.subject}</span>
                  <span className="mail-from small muted">— {m.from}</span>
                </button>
              ))}
            </div>
            <div className="row col"><button className="dlg-opt ghost" onClick={onClose}>关闭</button></div>
          </>
        )}
        {active && (
          <>
            <div className="speaker">{active.subject} <span className="small muted">— {active.from}</span></div>
            <p className="dialog-text">{active.body}</p>
            <div className="row col">
              <button className="dlg-opt ghost" onClick={() => setActiveId(null)}>返回信箱</button>
              <button className="dlg-opt ghost" onClick={onClose}>关闭</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}