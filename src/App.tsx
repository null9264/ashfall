import { useEffect, useState, useCallback, useRef } from 'react';
import { api, getSavedNickname, setSavedNickname } from './api';
import type { ViewState, DialogView, HistoryEntry, ClueEntry, ItemDef } from './types';
import { StatsPanel } from './panels/StatsPanel';
import { CluesPanel } from './panels/CluesPanel';
import { HistoryDrawer } from './components/HistoryDrawer';
import { TutorialOverlay } from './components/TutorialOverlay';
import { MainProgress } from './components/MainProgress';
import { ItemTipModal } from './components/ItemTipModal';
import { EndingPreviewModal } from './components/EndingPreviewModal';
import { MilestoneModal } from './components/MilestoneModal';
import { WorldEventModal } from './components/WorldEventModal';
import { EndingChoiceModal } from './components/EndingChoiceModal';

type ToastCls = '' | 'good' | 'bad' | 'warn' | 'secret';

const ATTR_LABEL: Record<string, string> = {
  hp: '生命', stamina: '体力', radiation: '辐射', reputation: '声望', scrap: '废料',
};

export default function App() {
  const [view, setView] = useState<ViewState | null>(null);
  const [dialog, setDialog] = useState<DialogView | null>(null);
  const [toast, setToast] = useState('');
  const [toastCls, setToastCls] = useState<ToastCls>('');
  const [busy, setBusy] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [showCluesPanel, setShowCluesPanel] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [clues, setClues] = useState<ClueEntry[] | null>(null);
  const [panelBusy, setPanelBusy] = useState(false);
  const [histLoading, setHistLoading] = useState(false);
  // 顶部抽屉可见状态(mobile 默认收起, desktop 默认收起,点击展开)
  const [histOpen, setHistOpen] = useState(false);
  // 抑制同 hint 重复弹气泡
  const lastHintId = useRef('');
  // 用 ref 标记是否已经做过首次 state 拉取,避免 React StrictMode 双调用触发副作用
  const inited = useRef(false);
  const lastToastKey = useRef('');
  // v2.0.3: 物品定义(用于首拾 tip 弹窗)、教程浮层首拾提示 tip、主线里程碑 modal
  const [itemDefs, setItemDefs] = useState<ItemDef[]>([]);
  const [tipItem, setTipItem] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<{ title: string; body: string; step: number; total: number } | null>(null);
  const [showEndingPreview, setShowEndingPreview] = useState(false);
  const [worldEvent, setWorldEvent] = useState<{ id: string; title: string; body: string } | null>(null);
  // v2.0.3 P1: 选结局前的 modal(显示 cost/keeps)
  const [endingPick, setEndingPick] = useState<NonNullable<ViewState['endings']['available']> | null>(null);
  // v2.0.3 P1: 区域切换的短暂过渡(显示地点名)
  const [transit, setTransit] = useState<string | null>(null);
  // v2.0.3 P1: "我卡住了" 主动求助 — 服务端返回一条无视冷却的提示
  const [help, setHelp] = useState<{ id: string; kind: 'hidden' | 'quest' | 'npc'; text: string; area: { id: string; name: string } } | null>(null);
  const [helpBusy, setHelpBusy] = useState(false);
  // 比较上次与本次 inventory,得到"本次拾取的新物品 id"
  const lastInventoryRef = useRef<string[]>([]);
  // 已经在这次 session 看过的 world_event id,避免 refresh 后重弹
  const seenWorldEventsRef = useRef<Set<string>>(new Set());

  // 简单取数（不弹 toast 也不刷状态外的副作用）
  const fetchHistory = useCallback(async (limit = 20) => {
    setHistLoading(true);
    try {
      const r = await api.history(limit);
      setHistory(r.entries);
    } catch (e: any) {
      // 静默失败，不打扰玩家
      console.error('[history] load failed', e);
    } finally {
      setHistLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const v = await api.state();
    // 即便服务端这一次的响应里 nickname 字段恰好为 null(兼容老版本/防回归),
    // 也能从我们之前持久化的 localStorage 兜底拉回来,绝不再次进入登记门
    if (!v.nickname) {
      const cached = getSavedNickname();
      if (cached) v.nickname = cached;
    } else {
      setSavedNickname(v.nickname);
    }
    // v2.0.3: 检测本次是否拾了新物品(基于上次 inventory diff)
    const newIds = v.inventory.map((i) => i.id);
    const before = new Set(lastInventoryRef.current);
    const added = newIds.filter((id) => !before.has(id));
    if (added.length > 0) {
      // 只展示第一个未登记 tip 的物品,避免刷屏
      const candidate = added.find((id) => !(v as any).tips_seen?.includes?.(id)) || added[0];
      setTipItem(candidate);
    }
    lastInventoryRef.current = newIds;
    setView(v);
    // 静默刷新历史（顶部抽屉用），但只有在抽屉打开过/全屏面板打开时才拉
    if (histOpen || showStatsPanel) fetchHistory(20);
  }, [histOpen, showStatsPanel, fetchHistory]);
  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    refresh();
    fetchHistory(20);
    // v2.0.3: 一次性拉物品定义列表(公共 endpoint)用于首拾 tip
    api.items()
      .then((r) => setItemDefs(r.items || []))
      .catch((e) => console.error('[items]', e));
  }, [refresh, fetchHistory]);

  // v2.0.3: 监听 view.mainProgress 变化,弹主线里程碑过场
  const lastMilestoneShown = useRef(0);
  useEffect(() => {
    if (!view) return;
    const cur = view.mainProgress ?? 0;
    // 只在 mainProgress 增加时弹,避免初始化弹一份
    if (cur > lastMilestoneShown.current && cur >= 1 && cur <= 5) {
      // 找刚刚完成的那条主线任务,取其 milestone 文本
      const doneStepQuest = view.quests.find((q) => q.status === 'done' && q.mainStep === cur);
      if (doneStepQuest) {
        setMilestone({
          title: doneStepQuest.name,
          body: doneStepQuest.milestone || doneStepQuest.summary,
          step: cur,
          total: 5,
        });
      }
      lastMilestoneShown.current = cur;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.mainProgress]);

  // v2.0.3 P1: 监听 worldEvent,弹钟声等一次性事件 modal
  useEffect(() => {
    if (!view?.worldEvent) return;
    const ev = view.worldEvent;
    if (seenWorldEventsRef.current.has(ev.id)) return;
    seenWorldEventsRef.current.add(ev.id);
    // 推一个 ack 给服务端,避免下次 refresh 又推
    api.ackWorldEvent(ev.id).catch((e) => console.error('[world_event] ack failed', e));
    setWorldEvent(ev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.worldEvent?.id]);

  // v2.0.3: 高危区驻留心跳 — 每 10s 通知服务端一次;非危险区服务端 no-op
  // 只在看得到 view 时才跑,避免登录前空跑
  useEffect(() => {
    if (!view || !view.nickname) return;
    const tick = () => {
      // 只有当前 area.danger > 0 才上报,否则会被服务端 ignore
      if ((view.area?.danger ?? 0) > 0) {
        api.heartbeat().then((v) => {
          if (!v) return;
          // 把 hp/radiation 的扣血变化也透给 toast(对比 attrs 变化)
          setView(v);
        }).catch((e) => console.error('[heartbeat]', e));
      }
    };
    const handle = setInterval(tick, 10000);
    return () => clearInterval(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.area?.id, view?.area?.danger, !!view?.nickname]);

  // 静默暗线提示气泡
  useEffect(() => {
    if (!view?.hint) return;
    const h = view.hint;
    if (lastHintId.current === h.id) return;
    lastHintId.current = h.id;
    // 5s 后清掉（让玩家有时间看到），但不影响 hint 字段本身
    setTimeout(() => {
      setView((v) => v ? { ...v, hint: null } : v);
    }, 5000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.hint?.id]);

  const toastMsg = (m: string, cls: ToastCls = '', key?: string) => {
    // 简单 dedupe: 同 key 且未消失时不覆盖
    if (key && lastToastKey.current === key) return;
    if (key) lastToastKey.current = key;
    setToast(m);
    setToastCls(cls);
    setTimeout(() => {
      setToast('');
      setToastCls('');
      lastToastKey.current = '';
    }, 2600);
  };

  // v2.0.2: 把后端 changes 转换成连续 toast(数值变化反馈)
  const popChangeToasts = (v: ViewState) => {
    const c = v.changes;
    if (!c) return;
    let i = 0;
    const attrKeys = Object.keys(c.attr || {});
    for (const k of attrKeys) {
      const delta = c.attr[k];
      if (delta === 0) continue;
      const sign = delta > 0 ? '+' : '';
      const cls: ToastCls = delta > 0 ? 'good' : 'bad';
      const label = ATTR_LABEL[k] ?? k;
      setTimeout(
        () => toastMsg(`[${label}] ${sign}${delta}`, cls, `attr-${k}-${delta}`),
        i++ * 600,
      );
    }
    for (const a of c.item?.added ?? [])
      setTimeout(() => toastMsg(`+ ${a}`, 'good', `item+${a}`), i++ * 600);
    for (const r of c.item?.removed ?? [])
      setTimeout(() => toastMsg(`- ${r}`, 'warn', `item-${r}`), i++ * 600);
    for (const f of c.flags ?? []) {
      if (typeof f === 'string' && f.startsWith('hidden:')) {
        const id = f.slice('hidden:'.length);
        setTimeout(
          () => toastMsg(`发现隐藏:${id}`, 'secret', `flag-${f}`),
          i++ * 600,
        );
      }
    }
  };

  const busyRef = useRef(false);
  const act = useCallback(async (fn: () => Promise<ViewState | void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const v = await fn();
      if (v) {
        setView(v);
        popChangeToasts(v);
      }
    } catch (e: any) {
      toastMsg(e?.message || '操作失败', 'bad');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  if (!view) return <div className="loading">载入废土中…</div>;
  // 首次进入：未设置昵称 → 强制设置
  // 三重保险：服务端 view.nickname / 本地缓存 / setNickname 入库
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

  const openStatsPanel = async () => {
    setShowStatsPanel(true);
    if (!history) {
      setPanelBusy(true);
      try { const r = await api.history(120); setHistory(r.entries); }
      catch (e: any) { toastMsg(e?.message || '历史拉取失败', 'bad'); }
      finally { setPanelBusy(false); }
    }
  };
  const openCluesPanel = async () => {
    setShowCluesPanel(true);
    if (!clues) {
      setPanelBusy(true);
      try { const r = await api.clues(); setClues(r.clues); }
      catch (e: any) { toastMsg(e?.message || '线索拉取失败', 'bad'); }
      finally { setPanelBusy(false); }
    }
  };

  // 顶部抽屉的开启/折叠：第一次点开时如果没有数据就拉一下
  const toggleHistDrawer = async () => {
    setHistOpen((o) => !o);
    if (!history) fetchHistory(20);
  };

  const a = view.attrs;
  return (
    <div className={'app' + (histOpen ? ' hist-open' : '')}>
      <header className="topbar">
        <div className="brand">灰烬城 <span>· ASHFALL</span></div>
        <div className="who">{view.nickname && <span className="nick">@{view.nickname}</span>}{typeof view.day === 'number' && <span className="day">第 {view.day} 天</span>}</div>
        <div className="topbar-right">
          <div className="stats">
            <Stat label="生命" v={a.hp} max={100} cls="hp" />
            <Stat label="体力" v={a.stamina} max={100} cls="sta" />
            <Stat label="辐射" v={a.radiation} max={100} cls="rad" />
            <Stat label="声望" v={a.reputation} max={50} cls="rep" />
            <Stat label="废料" v={a.scrap} max={20} cls="scr" />
          </div>
          <MainProgress progress={view.mainProgress ?? 0} />
          <button
            className={'hist-toggle' + (histOpen ? ' on' : '')}
            onClick={toggleHistDrawer}
            aria-expanded={histOpen}
            aria-controls="hist-drawer-panel"
            title="最近行动 / 历史"
          >
            <span className="hist-toggle-dot" aria-hidden>⏱</span>
            <span className="hist-toggle-label">行动</span>
            {history && history.length > 0 && <span className="hist-toggle-badge">{history.length}</span>}
          </button>
        </div>
      </header>

      {/* 顶部右侧抽屉面板：默认折叠;展开后变成 full-width dropdown */}
      {histOpen && (
        <div id="hist-drawer-panel" className="hist-drawer-panel">
          <HistoryDrawer
            entries={history}
            loading={histLoading}
            onOpenFull={() => { setShowStatsPanel(true); }}
            onRefresh={() => fetchHistory(120)}
          />
          <button className="hist-drawer-close" onClick={() => setHistOpen(false)} aria-label="关闭">✕</button>
        </div>
      )}

      <main className="grid">
        {/* 区域探索 */}
        <section className="panel area">
          <h2>{view.area.name}</h2>
          <p className="desc">{view.area.desc}</p>
          {view.area.danger > 0 && (
            <p className="warn">⚠ 辐射危险区(进入 +{view.area.danger} 辐射 / -{Math.round(view.area.danger / 2)} 生命;滞留每 10 秒再加 1 辐射 / -1 生命)</p>
          )}
          <div className="row">
            <button className="act" disabled={busy} onClick={() => act(async () => {
              const v: any = await api.pickup('');
              if (v.remaining != null && v.remaining > 0) {
                toastMsg('拾得：' + (v.picked || '无') + `（这片还剩 ${v.remaining} 样没被搜过）`);
              } else {
                toastMsg('拾得：' + (v.picked || '无') + '（这片被翻遍了）');
              }
              return v;
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
              <button key={n.id} className="nav" disabled={busy} onClick={() => {
                // v2.0.3 P1: 区域切换时短暂显示 transit 层(避免突兀)
                setTransit(n.name);
                setTimeout(() => setTransit(null), 700);
                act(() => api.move(n.id));
              }}>{n.name}</button>
            ))}
          </div>
          {/* v2.0.3 P1: 玩家主动求助 — 无视冷却直接给一条方向提示 */}
          <button
            className="act help-btn"
            disabled={busy || helpBusy}
            onClick={async () => {
              setHelpBusy(true);
              try {
                const r: any = await api.help();
                setHelp(r.help || null);
              } catch (e: any) {
                toastMsg(e?.message || '求助失败', 'bad');
              } finally {
                setHelpBusy(false);
              }
            }}
            title="向档案管理员求一条方向性提示"
          >
            {helpBusy ? '查询中…' : '🆘 我卡住了'}
          </button>
          <p className="muted small">已探索：{view.unlockedAreas.join('、')}</p>
        </section>

        {/* NPC */}
        <section className="panel npcs">
          <h2>这里的人</h2>
          {view.npcs.length === 0 && <p className="muted">空无一人。</p>}
          {view.npcs.map((n) => {
            const stance = n.stance || 'neutral';
            const stanceLabel =
              stance === 'ally' ? '🟢 潜在帮手' :
              stance === 'witness' ? '🟡 知情者' :
              stance === 'hostile' ? '🔴 危险人物' :
              '⚪ 立场未明';
            return (
              <button key={n.id} className={'npc stance-' + stance} disabled={busy} onClick={() => openNpc(n.id)}>
                <span className="npc-name">{n.name}</span>
                <span className="npc-blurb">{n.blurb}</span>
                <span className={'npc-stance stance-' + stance}>{stanceLabel}</span>
                {typeof n.trust === 'number' && (
                  <span className="npc-trust" title={'信任度 ' + n.trust + '/5'}>
                    {'❤'.repeat(n.trust)}{'·'.repeat(Math.max(0, 5 - n.trust))}
                  </span>
                )}
              </button>
            );
          })}
        </section>

        {/* 任务 / 背包 / 进度 */}
        <section className="panel side">
          <h2>任务日志</h2>
          {view.quests.length === 0 && <p className="muted small">还没有任务。</p>}
          {view.quests.map((q) => {
            const cat = q.category || 'side';
            return (
              <div key={q.id} className={'quest q-' + q.status + ' q-' + cat}>
                <div className="q-head">
                  <b>{q.name}</b>
                  <span className={'tag t-' + q.status} data-cat={cat}>
                    {q.status === 'done' ? '✓ 已完成' : q.status === 'active' ? '● 进行中' : '○ 可接取'}
                    {q.category === 'main' && q.status !== 'done' && q.mainStep ? ` · 步骤${q.mainStep}/5` : ''}
                  </span>
                </div>
                <p className="small muted">{q.summary}</p>
                {q.status === 'open' && (
                  <button className="mini primary" disabled={busy} onClick={() => act(() => api.acceptQuest(q.id))}>
                    ▶ 接取
                  </button>
                )}
                {q.status === 'active' && (
                  <div className="row wrap q-methods">
                    {q.methods.map((m) => (
                      <button key={m.id} className="mini primary" disabled={busy} onClick={() => act(async () => {
                        try { return await api.completeQuest(q.id, m.id); }
                        catch (e: any) { toastMsg(e?.message); throw e; }
                      })}>{m.label}</button>
                    ))}
                  </div>
                )}
                {q.status === 'done' && (
                  <div className="q-done-hint small muted">已了结</div>
                )}
              </div>
            );
          })}

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
            <button key={e.id} className="end-btn" disabled={busy} onClick={() => {
              // v2.0.3 P1:先弹 choice modal,看清楚 cost/keeps 再确认
              setEndingPick(view.endings.available);
            }}>走向 · {e.title}</button>
          ))}
          {view.endings.available.length === 0 && view.endings.locked.length > 0 && (
            <div className="locked-endings-wrap">
              <p className="muted small">已锁定的结局（点查看方向提示）：</p>
              <div className="row wrap">
                {view.endings.locked.map((l) => (
                  <button
                    key={l.id}
                    className="end-btn locked"
                    onClick={() => setShowEndingPreview(true)}
                    title={l.hint}
                  >
                    🔒 {l.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 底部反馈入口 */}
      <footer className="footer">
        <button className="footer-link" onClick={openStatsPanel}>
          📊 数值记录
        </button>
        <button className="footer-link" onClick={openCluesPanel}>
          🔖 线索日志
        </button>
        <button className="footer-link" onClick={() => setShowFeedback(true)}>
          📬 反馈意见
        </button>
        <span className="footer-text">灰烬城 · 由乱涂机器人工坊建造 · v2.0</span>
      </footer>

      {showFeedback && (
        <FeedbackModal
          view={view}
          onClose={() => setShowFeedback(false)}
          onSuccess={() => { setShowFeedback(false); toastMsg('已收到反馈，谢谢。', 'good'); }}
          onError={(m) => toastMsg(m, 'bad')}
        />
      )}

      {showStatsPanel && (
        <StatsPanel
          view={view}
          entries={history}
          loading={panelBusy}
          onClose={() => setShowStatsPanel(false)}
        />
      )}

      {showCluesPanel && (
        <CluesPanel
          clues={clues}
          loading={panelBusy}
          onClose={() => setShowCluesPanel(false)}
        />
      )}

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

      {/* 暗线提示气泡 — 显示 5s 自动消失 */}
      {view.hint && view.hint.text && !dialog && (
        <div className="hint-bubble" role="status" aria-live="polite">
          <div className="hint-bubble-title">暗线 · {view.hint.area.name}</div>
          <div className="hint-bubble-text">{view.hint.text}</div>
        </div>
      )}

      {/* v2.0.3: 教程浮层(仅 firstTime 时显示) */}
      {view.firstTime && !milestone && !tipItem && !showEndingPreview && (
        <TutorialOverlay
          onClose={() => {
            api.dismissTutorial().catch(() => null);
            setView((v) => v ? { ...v, firstTime: false } : v);
          }}
        />
      )}

      {/* v2.0.3: 首次拾取物品 — 显示 tip */}
      {tipItem && (
        <ItemTipModal
          itemId={tipItem}
          itemDefs={itemDefs}
          onClose={() => {
            const id = tipItem;
            setTipItem(null);
            api.markItemTipSeen(id).catch(() => null);
          }}
        />
      )}

      {/* v2.0.3: 主线里程碑过场 */}
      {milestone && (
        <MilestoneModal
          title={milestone.title}
          body={milestone.body}
          step={milestone.step}
          total={milestone.total}
          onClose={() => setMilestone(null)}
        />
      )}

      {/* v2.0.3 P1: 区域切换过渡层 */}
      {transit && (
        <div className="transit-overlay">
          <div className="transit-label">走向 · {transit}</div>
        </div>
      )}

      {/* v2.0.3: 锁定结局的方向提示 */}
      {showEndingPreview && (
        <EndingPreviewModal
          endings={view.endings.locked}
          onClose={() => setShowEndingPreview(false)}
        />
      )}

      {/* v2.0.3 P1: 世界事件 modal */}
      {worldEvent && (
        <WorldEventModal
          event={worldEvent}
          onClose={() => {
            setWorldEvent(null);
            // 重新拉 state 让 heard_bell 也生效,然后应用 effects(已 ack 过)
            refresh();
          }}
        />
      )}

      {/* v2.0.3 P1: 选结局前的回顾 modal */}
      {endingPick && (
        <EndingChoiceModal
          endings={endingPick}
          busy={busy}
          onChoose={(id) => {
            setEndingPick(null);
            act(async () => {
              try {
                const r: any = await api.endingChoose(id);
                setView({ ...view, ending: id, endingDetail: r.ending });
                return undefined;
              } catch (e2: any) {
                toastMsg(e2?.message);
                throw e2;
              }
            });
          }}
          onClose={() => setEndingPick(null)}
        />
      )}

      {/* v2.0.3 P1: "我卡住了" 求助结果 */}
      {help && (
        <div className="modal" onClick={() => setHelp(null)}>
          <div className="modal-box help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="speaker">🆘 档案管理员 · 提示</div>
            <p className="dialog-text">{help.text}</p>
            <p className="small muted">指向：{help.area.name}</p>
            <div className="row col">
              <button className="dlg-opt primary" onClick={() => setHelp(null)}>知道了</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={'toast ' + toastCls}>{toast}</div>}
    </div>
  );
}

function Stat({ label, v, max, cls }: { label: string; v: number; max: number; cls: string }) {
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  return (
    <div className="stat" title={label + ' ' + v + '/' + max}>
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

function FeedbackModal({ view, onClose, onSuccess, onError }: {
  view: ViewState;
  onClose: () => void;
  onSuccess: () => void;
  onError: (m: string) => void;
}) {
  const [category, setCategory] = useState<'bug' | 'suggestion' | 'praise' | 'other'>('suggestion');
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (message.trim().length < 4) { onError('至少写几个字吧…'); return; }
    setBusy(true);
    try {
      await api.submitFeedback({
        category,
        message: message.trim(),
        rating: rating || undefined,
        meta: { area: view.area.id, quests: view.quests.length, ending: view.ending },
      });
      onSuccess();
    } catch (e: any) { onError(e?.message || '提交失败'); }
    finally { setBusy(false); }
  };
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="speaker">📬 反馈意见</div>
        <p className="dialog-text small">告诉档案管理员哪里需要改进、有什么 bug、或者单纯想赞美一下。</p>

        <div className="form-row">
          <label className="form-label">类型</label>
          <div className="seg">
            {([
              ['bug', '🐞 Bug'],
              ['suggestion', '💡 建议'],
              ['praise', '✨ 赞美'],
              ['other', '📝 其他'],
            ] as const).map(([v, label]) => (
              <button key={v} className={'seg-btn ' + (category === v ? 'on' : '')} onClick={() => setCategory(v)}>{label}</button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label className="form-label">评分 <span className="muted small">（可选）</span></label>
          <div className="rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={'star ' + (rating >= n ? 'on' : '')} onClick={() => setRating(rating === n ? 0 : n)}>★</button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label className="form-label">内容</label>
          <textarea
            className="feedback-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="比如：第三关捡不到钥匙 / 想增加存档功能 / 这个故事真棒…"
            maxLength={1000}
            rows={5}
          />
          <div className="char-count small muted">{message.length} / 1000</div>
        </div>

        <div className="row col">
          <button className="dlg-opt primary" onClick={submit} disabled={busy}>{busy ? '发送中…' : '发送反馈'}</button>
          <button className="dlg-opt ghost" onClick={onClose}>取消</button>
        </div>
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
      setSavedNickname(v); // 显式缓存，作为后续任何响应丢失兜底
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

// v2.0.2: 数值记录 + 线索日志 已拆到 src/panels/

