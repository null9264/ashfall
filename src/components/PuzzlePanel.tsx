// v2.0.3 P2: 解谜 Modal — 支持三种 puzzle
//  - p_lockbox   4 位数字密码
//  - p_sequence  红/蓝/绿 三色按钮序列
//  - p_wordcode  文字密码
import { useState } from 'react';
import { api } from '../api';

interface PuzzleItem {
  id: 'p_lockbox' | 'p_sequence' | 'p_wordcode';
  title: string;
  hint: string;
  done: boolean;
}

export function PuzzlePanel({ puzzles, onClose, onSolved, busy }: {
  puzzles: PuzzleItem[];
  onClose: () => void;
  onSolved: (id: string) => void;
  busy: boolean;
}) {
  const [active, setActive] = useState<PuzzleItem | null>(null);
  const [err, setErr] = useState('');
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box puzzle-modal" onClick={(e) => e.stopPropagation()}>
        <div className="speaker">🧩 解谜面板</div>
        {!active && (
          <>
            <p className="dialog-text small">城里有几个小谜题。解开后会得到物品/声望,部分谜题答案在剧情对话里。</p>
            <div className="puzzle-list">
              {puzzles.map((p) => (
                <button
                  key={p.id}
                  className={'puzzle-row' + (p.done ? ' done' : '')}
                  disabled={p.done || busy}
                  onClick={() => { setActive(p); setErr(''); }}
                >
                  <span className="puzzle-title">{p.done ? '✓ ' : '· '}{p.title}</span>
                  <span className="puzzle-hint small muted">{p.hint}</span>
                </button>
              ))}
            </div>
            <div className="row col">
              <button className="dlg-opt ghost" onClick={onClose}>关闭</button>
            </div>
          </>
        )}
        {active && (
          <PuzzleForm
            puzzle={active}
            onClose={() => { setActive(null); setErr(''); }}
            onSolved={() => { onSolved(active.id); setActive(null); setErr(''); }}
            onError={(m) => setErr(m)}
            busy={busy}
            errMsg={err}
          />
        )}
      </div>
    </div>
  );
}

function PuzzleForm({ puzzle, onClose, onSolved, onError, busy, errMsg }: {
  puzzle: PuzzleItem;
  onClose: () => void;
  onSolved: () => void;
  onError: (m: string) => void;
  busy: boolean;
  errMsg: string;
}) {
  if (puzzle.id === 'p_lockbox') return <LockboxForm onClose={onClose} onSolved={onSolved} onError={onError} busy={busy} errMsg={errMsg} />;
  if (puzzle.id === 'p_sequence') return <SequenceForm onClose={onClose} onSolved={onSolved} onError={onError} busy={busy} errMsg={errMsg} />;
  return <WordcodeForm onClose={onClose} onSolved={onSolved} onError={onError} busy={busy} errMsg={errMsg} />;
}

function LockboxForm(props: { onClose: () => void; onSolved: () => void; onError: (m: string) => void; busy: boolean; errMsg: string }) {
  const [val, setVal] = useState('');
  const submit = async () => {
    if (val.length !== 4) return props.onError('请输入 4 位数字');
    try {
      const r: any = await api.solvePuzzle('p_lockbox', val);
      if (!r.ok) { props.onError(r.hint || r.reason || '密码错误'); return; }
      props.onSolved();
    } catch (e: any) { props.onError(e?.message || '提交失败'); }
  };
  return (
    <>
      <p className="dialog-text small">小铁盒上的 4 位数字锁。提示在老吴的对话里。</p>
      <input
        className="gate-input"
        inputMode="numeric"
        maxLength={4}
        value={val}
        onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        autoFocus
      />
      {props.errMsg && <p className="gate-err">{props.errMsg}</p>}
      <div className="row col">
        <button className="dlg-opt primary" disabled={props.busy} onClick={submit}>尝试开锁</button>
        <button className="dlg-opt ghost" onClick={props.onClose}>返回</button>
      </div>
    </>
  );
}

function SequenceForm(props: { onClose: () => void; onSolved: () => void; onError: (m: string) => void; busy: boolean; errMsg: string }) {
  const [seq, setSeq] = useState<string[]>([]);
  const colors: { id: 'red' | 'blue' | 'green'; label: string; cls: string }[] = [
    { id: 'red', label: '红', cls: 'c-red' },
    { id: 'blue', label: '蓝', cls: 'c-blue' },
    { id: 'green', label: '绿', cls: 'c-green' },
  ];
  const submit = async () => {
    if (seq.length !== 3) return props.onError('按 3 次');
    try {
      const r: any = await api.solvePuzzle('p_sequence', seq);
      if (!r.ok) { props.onError(r.hint || r.reason || '不对'); return; }
      props.onSolved();
    } catch (e: any) { props.onError(e?.message || '提交失败'); }
  };
  return (
    <>
      <p className="dialog-text small">地铁里的三色灯,按正确顺序点亮。</p>
      <p className="small muted">当前: {seq.map((c) => colors.find((x) => x.id === c)?.label).join(' → ') || '空'}</p>
      <div className="row wrap seq-buttons">
        {colors.map((c) => (
          <button key={c.id} className={'seq-btn ' + c.cls} disabled={props.busy || seq.length >= 3} onClick={() => setSeq([...seq, c.id])}>
            {c.label}
          </button>
        ))}
        <button className="seq-btn ghost" disabled={props.busy || seq.length === 0} onClick={() => setSeq(seq.slice(0, -1))}>←</button>
      </div>
      {props.errMsg && <p className="gate-err">{props.errMsg}</p>}
      <div className="row col">
        <button className="dlg-opt primary" disabled={props.busy || seq.length !== 3} onClick={submit}>提交</button>
        <button className="dlg-opt ghost" onClick={props.onClose}>返回</button>
      </div>
    </>
  );
}

function WordcodeForm(props: { onClose: () => void; onSolved: () => void; onError: (m: string) => void; busy: boolean; errMsg: string }) {
  const [val, setVal] = useState('');
  const submit = async () => {
    if (val.trim().length === 0) return props.onError('请输入');
    try {
      const r: any = await api.solvePuzzle('p_wordcode', val.trim());
      if (!r.ok) { props.onError(r.hint || r.reason || '不对'); return; }
      props.onSolved();
    } catch (e: any) { props.onError(e?.message || '提交失败'); }
  };
  return (
    <>
      <p className="dialog-text small">照片背面写着一行字,只取中间 4 个字。</p>
      <input
        className="gate-input"
        maxLength={32}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        autoFocus
      />
      {props.errMsg && <p className="gate-err">{props.errMsg}</p>}
      <div className="row col">
        <button className="dlg-opt primary" disabled={props.busy} onClick={submit}>提交</button>
        <button className="dlg-opt ghost" onClick={props.onClose}>返回</button>
      </div>
    </>
  );
}