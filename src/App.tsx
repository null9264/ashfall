import { useEffect, useState, useCallback } from 'react';
import { api } from './api';
import type { ViewState, DialogView } from './types';

export default function App() {
  const [view, setView] = useState<ViewState | null>(null);
  const [dialog, setDialog] = useState<DialogView | null>(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => { setView(await api.state()); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const toastMsg = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2400); };
  const act = useCallback(async (fn: () => Promise<ViewState | void>) => {
    setBusy(true);
    try { const v = await fn(); if (v) setView(v); }
    catch (e: any) { toastMsg(e?.message || '操作失败'); }
    finally { setBusy(false); }
  }, []);

  if (!view) return <div className="loading">载入废土中…</div>;
  // 首次进入：未设置昵称 → 强制设置
  if (!view.nickname) return <NicknameGate onDone={refresh} />;
  if (view.ending && view.endingDetail)
    return <Ending detail={view.endingDetail} onReset={() => act(async () => api.reset())} />;

  const openNpc = async (id: string) => {
    try { setDialog(await api.talkStart(id)); }
    catch (e: any) { toastMsg(e?.message || '无法对话'); }
  };
  const choose = async (optIndex: number) => {
    if (!dialog) return;
    try {
      const r: any = await api.talkChoice(dialog.npc, dialog.node, optIndex);
      if (r.closed) { setDialog(null); await refresh(); }
      else setDialog(r);
    } catch (e: any) { toastMsg(e?.message || '无法继续'); }
  };

  const a = view.attrs;
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">灰烬城 <span>· ASHFALL</span></div>
        <div className="who">{view.nickname && <span className="nick">@{view.nickname}</span>}</div>
        <div className="stats">
          <Stat label="生命" v={a.hp} max={100} cls="hp" />
          <Stat label="辐射" v={a.radiation} max={100} cls="rad" />
          <Stat label="声望" v={a.reputation} max={50} cls="rep" />
        </div>
      </header>

      <main className="grid">
        {/* 区域探索 */}
        <section className="panel area">
          <h2>{view.area.name}</h2>
          <p className="desc">{view.area.desc}</p>
          {view.area.danger > 0 && (
            <p className="warn">⚠ 辐射危险区（进入 +{view.area.danger} 辐射 / -{Math.round(view.area.danger / 2)} 生命）</p>
          )}
          <div className="row">
            <button className="act" disabled={busy} onClick={() => act(async () => {
              const v: any = await api.pickup(''); toastMsg('拾得：' + (v.picked || '无')); return v;
            })}>搜寻物资</button>
            <button className="act" disabled={busy} onClick={() => act(async () => {
              const v: any = await api.searchHidden(); toastMsg(v.found ? '发现：' + v.found : '暂时没新发现'); return v;
            })}>仔细搜寻</button>
          </div>
          {view.area.id === 'gate' && (
            <button className="act ghost" disabled={busy} onClick={() => act(async () => {
              const v: any = await api.poke('radio'); toastMsg(v.text || '…'); return v;
            })}>拨弄旧收音机</button>
          )}
          <h3>前往</h3>
          <div className="row wrap">
            {view.area.neighbors.map((n) => (
              <button key={n.id} className="nav" disabled={busy} onClick={() => act(() => api.move(n.id))}>{n.name}</button>
            ))}
          </div>
          <p className="muted small">已探索：{view.unlockedAreas.join('、')}</p>
        </section>

        {/* NPC */}
        <section className="panel npcs">
          <h2>这里的人</h2>
          {view.npcs.length === 0 && <p className="muted">空无一人。</p>}
          {view.npcs.map((n) => (
            <button key={n.id} className="npc" disabled={busy} onClick={() => openNpc(n.id)}>
              <span className="npc-name">{n.name}</span>
              <span className="npc-blurb">{n.blurb}</span>
            </button>
          ))}
        </section>

        {/* 任务 / 背包 / 进度 */}
        <section className="panel side">
          <h2>任务日志</h2>
          {view.quests.length === 0 && <p className="muted small">还没有任务。</p>}
          {view.quests.map((q) => (
            <div key={q.id} className="quest">
              <div className="q-head"><b>{q.name}</b><span className={'tag ' + q.status}>{q.status === 'done' ? '已完成' : q.status === 'active' ? '进行中' : '可接取'}</span></div>
              <p className="small muted">{q.summary}</p>
              {q.status === 'open' && <button className="mini" disabled={busy} onClick={() => act(() => api.acceptQuest(q.id))}>接取</button>}
              {q.status === 'active' && (
                <div className="row wrap">
                  {q.methods.map((m) => (
                    <button key={m.id} className="mini" disabled={busy} onClick={() => act(async () => {
                      try { return await api.completeQuest(q.id, m.id); }
                      catch (e: any) { toastMsg(e?.message); throw e; }
                    })}>{m.label}</button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <h2>背包</h2>
          {view.inventory.length === 0 && <p className="muted small">空空如也。</p>}
          <div className="row wrap">
            {view.inventory.map((i) => <span key={i.id} className="chip">{i.name} ×{i.qty}</span>)}
          </div>

          <h2>隐藏发现</h2>
          {view.hiddenFound.length === 0 && <p className="muted small">尚未发现隐藏要素。</p>}
          <div className="row wrap">
            {view.hiddenFound.map((h, i) => <span key={i} className="chip secret">◈ {h}</span>)}
          </div>

          <h2>结局</h2>
          {view.endings.available.length === 0 && <p className="muted small">你的选择还在累积，结局尚未成形。</p>}
          {view.endings.available.map((e) => (
            <button key={e.id} className="end-btn" disabled={busy} onClick={() => act(async () => {
              try { const r: any = await api.endingChoose(e.id); setView({ ...view, ending: e.id, endingDetail: r.ending }); return undefined; }
              catch (e2: any) { toastMsg(e2?.message); throw e2; }
            })}>走向 · {e.title}</button>
          ))}
          {view.endings.available.length === 0 && view.endings.locked.length > 0 && (
            <p className="muted small">已锁定的结局：{view.endings.locked.map((l) => l.title).join('、')}（继续探索以解锁）</p>
          )}
        </section>
      </main>

      {dialog && (
        <div className="modal" onClick={() => setDialog(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {dialog.speaker && <div className="speaker">{dialog.speaker}</div>}
            <p className="dialog-text">{dialog.text}</p>
            <div className="row col">
              {dialog.options.map((o) => (
                <button key={o.index} className="dlg-opt" onClick={() => choose(o.index)}>{o.label}</button>
              ))}
              <button className="dlg-opt ghost" onClick={() => { setDialog(null); refresh(); }}>离开</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Stat({ label, v, max, cls }: { label: string; v: number; max: number; cls: string }) {
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-bar"><i className={cls} style={{ width: pct + '%' }} /></span>
      <span className="stat-v">{v}</span>
    </div>
  );
}

function Ending({ detail, onReset }: { detail: NonNullable<ViewState['endingDetail']>; onReset: () => void }) {
  return (
    <div className="ending-screen">
      <div className="ending-inner">
        <h1>{detail.title}</h1>
        <div className="passages">
          {detail.passages.map((p, i) => <p key={i} className="fade" style={{ animationDelay: i * 0.3 + 's' }}>{p}</p>)}
        </div>
        <button className="end-btn" onClick={onReset}>重新走入灰烬城</button>
      </div>
    </div>
  );
}

function NicknameGate({ onDone }: { onDone: () => void }) {
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    const v = val.trim();
    if (!v) { setErr('给自己起个名号'); return; }
    setBusy(true); setErr('');
    try {
      await api.setNickname(v);
      onDone();
    } catch (e: any) {
      console.error('[nickname]', e);
      setErr(e?.message || '设置失败');
    }
    finally { setBusy(false); }
  };
  return (
    <div className="gate-screen">
      <div className="gate-inner">
        <h1 className="gate-title">灰烬城 · 入城登记</h1>
        <p className="gate-sub">在你的记忆被归档之前，请先告诉记录者你是谁。</p>
        <p className="gate-sub small muted">昵称须 2-16 位（中文 / 字母 / 数字 / 下划线 / 短横线），全城唯一。</p>
        <input
          className="gate-input"
          placeholder="例如：旧城守夜人"
          value={val}
          maxLength={16}
          autoFocus
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        {err && <p className="gate-err">{err}</p>}
        <button className="gate-btn" disabled={busy} onClick={submit}>{busy ? '登记中…' : '推开城门'}</button>
      </div>
    </div>
  );
}
