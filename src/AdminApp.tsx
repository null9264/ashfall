// Admin 后台视图：登录 + 总览 + 事件 + 玩家
import { useEffect, useState, useCallback } from 'react';
import { admin } from './api';

type Overview = {
  totalPlayers: number;
  totalNicknames: number;
  totalEvents: number;
  totalEndings: number;
  dau: number;
  trend7: { day: string; c: number }[];
  typeDist: { type: string; c: number }[];
  endingDist: { ending: string; c: number }[];
};
type Player = {
  id: string;
  nickname: string | null;
  area: string | null;
  ending: string | null;
  finished_at: number | null;
  updated: number | null;
  events: number;
};
type AdminEvent = {
  id: number;
  player_id: string;
  nickname: string | null;
  type: string;
  ref: string | null;
  meta: string | null;
  created_at: number;
};

const TYPE_LABEL: Record<string, string> = {
  move: '移动', talk: '对话', pickup: '拾物',
  quest_accept: '接任务', quest_complete: '完任务',
  hidden: '隐藏要素', ending: '结局', reset: '重开',
  nickname: '取名', login: '上线',
};

export default function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'overview' | 'events' | 'players' | 'feedback'>('overview');

  useEffect(() => {
    // 试探：随便请求一次事件列表，能通则说明已登录
    admin.events({ limit: 1 }).then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  if (authed === null) return <div className="loading">载入后台…</div>;
  if (!authed) return <Login onOK={() => setAuthed(true)} />;

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="brand">灰烬城 <span>· 控制台</span></div>
        <nav>
          <button className={tab === 'overview' ? 'on' : ''} onClick={() => setTab('overview')}>总览</button>
          <button className={tab === 'events' ? 'on' : ''} onClick={() => setTab('events')}>事件流</button>
          <button className={tab === 'players' ? 'on' : ''} onClick={() => setTab('players')}>玩家</button>
          <button className={tab === 'feedback' ? 'on' : ''} onClick={() => setTab('feedback')}>反馈</button>
        </nav>
        <button className="mini ghost" onClick={async () => { await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }); location.href = '/'; }}>退出</button>
      </header>
      <main className="admin-main">
        {tab === 'overview' && <Overview />}
        {tab === 'events' && <Events />}
        {tab === 'players' && <Players />}
        {tab === 'feedback' && <FeedbackTab />}
      </main>
    </div>
  );
}

function Login({ onOK }: { onOK: () => void }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ user, pass }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || '登录失败');
      }
      onOK();
    } catch (e: any) { setErr(e?.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="gate-screen">
      <div className="gate-inner">
        <h1 className="gate-title">控制台登录</h1>
        <p className="gate-sub small muted">仅供档案馆管理员使用。</p>
        <input className="gate-input" placeholder="账号" value={user} onChange={(e) => setUser(e.target.value)} autoFocus />
        <input className="gate-input" placeholder="密码" type="password" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        {err && <p className="gate-err">{err}</p>}
        <button className="gate-btn" disabled={busy} onClick={submit}>{busy ? '验证中…' : '进入'}</button>
      </div>
    </div>
  );
}

function Overview() {
  const [data, setData] = useState<Overview | null>(null);
  const reload = useCallback(() => { admin.overview().then(setData); }, []);
  useEffect(() => { reload(); const id = setInterval(reload, 15000); return () => clearInterval(id); }, [reload]);
  if (!data) return <div className="loading">…</div>;
  const maxTrend = Math.max(1, ...data.trend7.map((t) => t.c));
  const totalTypes = data.typeDist.reduce((s, x) => s + x.c, 0) || 1;
  return (
    <div className="overview">
      <div className="kpis">
        <Kpi label="玩家总数" v={data.totalPlayers} sub={`${data.totalNicknames} 已取名`} />
        <Kpi label="今日活跃" v={data.dau} sub="DAU" />
        <Kpi label="事件总数" v={data.totalEvents} sub="行为埋点" />
        <Kpi label="通关玩家" v={data.totalEndings} sub="已抵达结局" />
      </div>
      <section className="chart-card">
        <h3>最近 7 日活跃玩家</h3>
        <div className="bars">
          {data.trend7.length === 0 && <p className="muted small">暂无数据</p>}
          {data.trend7.map((t) => (
            <div className="bar" key={t.day}>
              <div className="bar-fill" style={{ height: (t.c / maxTrend * 100) + '%' }} title={t.c + ' 人'} />
              <span className="bar-label">{t.day.slice(5)}</span>
              <span className="bar-v">{t.c}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="chart-card">
        <h3>事件类型分布</h3>
        <div className="pie-list">
          {data.typeDist.map((t) => {
            const pct = (t.c / totalTypes * 100).toFixed(1);
            return (
              <div className="pie-row" key={t.type}>
                <span className="pie-name">{TYPE_LABEL[t.type] || t.type}</span>
                <span className="pie-bar"><i style={{ width: pct + '%' }} /></span>
                <span className="pie-v">{t.c} · {pct}%</span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="chart-card">
        <h3>结局分布</h3>
        {data.endingDist.length === 0 && <p className="muted small">尚无玩家达成结局</p>}
        <ul className="ending-list">
          {data.endingDist.map((e) => (
            <li key={e.ending}><b>{e.ending}</b><span>{e.c} 人</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Events() {
  const [list, setList] = useState<AdminEvent[]>([]);
  const [type, setType] = useState('');
  const [nick, setNick] = useState('');
  const [days, setDays] = useState(7);
  const reload = useCallback(() => {
    admin.events({
      type: type || undefined,
      nickname: nick || undefined,
      since: Date.now() - days * 86400_000,
      limit: 200,
    }).then((r) => setList(r.events));
  }, [type, nick, days]);
  useEffect(() => { reload(); }, [reload]);
  return (
    <div className="events">
      <div className="filters">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">全部事件类型</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input placeholder="按昵称筛选（精确）" value={nick} onChange={(e) => setNick(e.target.value)} />
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))}>
          <option value={1}>最近 1 天</option>
          <option value={7}>最近 7 天</option>
          <option value={30}>最近 30 天</option>
          <option value={365}>最近 1 年</option>
        </select>
        <button onClick={reload}>刷新</button>
      </div>
      <div className="tbl">
        <div className="th"><span>时间</span><span>玩家</span><span>事件</span><span>关联</span><span>详情</span></div>
        {list.length === 0 && <p className="muted small center">无数据</p>}
        {list.map((e) => (
          <div className="tr" key={e.id}>
            <span className="time">{new Date(e.created_at).toLocaleString()}</span>
            <span className="who">{e.nickname || <code>{e.player_id.slice(0, 6)}…</code>}</span>
            <span className={'tag t-' + e.type}>{TYPE_LABEL[e.type] || e.type}</span>
            <span>{e.ref || '—'}</span>
            <span className="meta">{e.meta || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Players() {
  const [list, setList] = useState<Player[]>([]);
  const [picked, setPicked] = useState<any>(null);
  const reload = useCallback(() => admin.players().then((r) => setList(r.players)), []);
  useEffect(() => { reload(); }, [reload]);
  return (
    <div className="players">
      <div className={'tbl' + (picked ? ' split' : '')}>
        <div>
          <div className="th"><span>昵称</span><span>当前位置</span><span>结局</span><span>事件</span><span>最近更新</span></div>
          {list.length === 0 && <p className="muted small center">尚无玩家</p>}
          {list.map((p) => (
            <div className="tr click" key={p.id} onClick={() => admin.players(p.id).then(setPicked)}>
              <span className="who">{p.nickname || <code>{p.id.slice(0, 8)}…</code>}</span>
              <span>{p.area || '—'}</span>
              <span>{p.ending || '—'}</span>
              <span>{p.events}</span>
              <span className="time">{p.updated ? new Date(p.updated).toLocaleString() : '—'}</span>
            </div>
          ))}
        </div>
        {picked && (
          <aside className="player-detail">
            <button className="mini ghost" onClick={() => setPicked(null)}>关闭</button>
            <h3>{picked.nickname || picked.id}</h3>
            <p className="muted small">ID: <code>{picked.id}</code></p>
            <p>事件总数: <b>{picked.eventCount}</b></p>
            <p>最近活跃: {picked.lastActive ? new Date(picked.lastActive).toLocaleString() : '—'}</p>
            <p>最后所在区域: {picked.area || '—'}</p>
            <p>结局: {picked.ending || '—'}</p>
            <h4>最近事件</h4>
            <ul>
              {picked.recentEvents.map((e: any, i: number) => (
                <li key={i}>
                  <span className="time">{new Date(e.created_at).toLocaleString()}</span>
                  <span className={'tag t-' + e.type}>{TYPE_LABEL[e.type] || e.type}</span>
                  <span>{e.ref || ''}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, v, sub }: { label: string; v: number; sub?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-v">{v.toLocaleString()}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
const CAT_LABEL: Record<string, string> = {
  bug: '🐞 Bug', suggestion: '💡 建议', praise: '✨ 赞美', other: '📝 其他',
};
const STATUS_LABEL: Record<string, string> = {
  new: '新', read: '已读', archived: '已归档',
};

function FeedbackTab() {
  const [list, setList] = useState<any>(null);
  const [cat, setCat] = useState('');
  const [status, setStatus] = useState('');
  const reload = useCallback(() => {
    admin.feedback({ category: cat || undefined, status: status || undefined, limit: 200 })
      .then(setList);
  }, [cat, status]);
  useEffect(() => { reload(); }, [reload]);

  const updateStatus = async (id: number, s: 'new' | 'read' | 'archived') => {
    await admin.feedbackUpdate(id, s);
    reload();
  };

  if (!list) return <div className="loading">载入反馈…</div>;
  const total = list.feedback.length;
  const newCount = list.newCount;

  return (
    <div className="feedback-tab">
      <div className="kpis">
        <Kpi label="反馈总数" v={total} sub="近 200 条" />
        <Kpi label="待处理" v={newCount} sub="status=new" />
        <Kpi label="类别" v={list.catDist.length} sub="已收到" />
      </div>
      <section className="chart-card">
        <h3>类别分布</h3>
        <div className="pie-list">
          {list.catDist.length === 0 && <p className="muted small">暂无反馈</p>}
          {list.catDist.map((c: any) => (
            <div className="pie-row" key={c.category}>
              <span className="pie-name">{CAT_LABEL[c.category] || c.category}</span>
              <span className="pie-bar"><i style={{ width: (c.c / Math.max(1, total) * 100) + '%' }} /></span>
              <span className="pie-v">{c.c}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="filters">
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">全部类别</option>
          <option value="bug">🐞 Bug</option>
          <option value="suggestion">💡 建议</option>
          <option value="praise">✨ 赞美</option>
          <option value="other">📝 其他</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="new">新</option>
          <option value="read">已读</option>
          <option value="archived">已归档</option>
        </select>
        <button onClick={reload}>刷新</button>
      </div>

      <div className="fb-list">
        {list.feedback.length === 0 && <p className="muted small center">暂无反馈</p>}
        {list.feedback.map((f: any) => (
          <div key={f.id} className={'fb-card s-' + f.status}>
            <div className="fb-head">
              <span className="fb-id">#{f.id}</span>
              <span className={'cat-tag c-' + f.category}>{CAT_LABEL[f.category] || f.category}</span>
              {f.rating && <span className="fb-rating">{'★'.repeat(f.rating)}</span>}
              <span className="fb-by">
                {f.nickname || <code>{f.player_id.slice(0, 8)}…</code>}
              </span>
              <span className="fb-time">{new Date(f.created_at).toLocaleString()}</span>
              <span className={'tag s-tag-' + f.status}>{STATUS_LABEL[f.status]}</span>
            </div>
            <div className="fb-body">{f.message}</div>
            {f.meta && (
              <div className="fb-meta small muted">
                {(() => { try { return JSON.stringify(JSON.parse(f.meta)); } catch { return f.meta; } })()}
              </div>
            )}
            <div className="fb-actions">
              {f.status !== 'read' && <button className="mini" onClick={() => updateStatus(f.id, 'read')}>标记已读</button>}
              {f.status !== 'archived' && <button className="mini" onClick={() => updateStatus(f.id, 'archived')}>归档</button>}
              {f.status !== 'new' && <button className="mini ghost" onClick={() => updateStatus(f.id, 'new')}>重置为新</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
