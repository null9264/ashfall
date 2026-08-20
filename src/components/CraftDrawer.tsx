// v2.0.3 P2: 制作 / 兑换面板
import { useState, useEffect } from 'react';
import { api } from '../api';

interface Recipe {
  id: string; name: string; desc: string;
  consumes: Record<string, number>;
  produces: any;
  ok: boolean; reason?: string;
}

export function CraftDrawer({ onClose, onCrafted, busy }: {
  onClose: () => void;
  onCrafted: (msg: string) => void;
  busy: boolean;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.listRecipes().then((r) => { setRecipes(r.recipes || []); setLoading(false); })
      .catch((e: any) => { setErr(e?.message || '加载失败'); setLoading(false); });
  }, []);
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box craft-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="speaker">🔧 制作 / 兑换</div>
        {loading && <p className="dialog-text small muted">加载配方…</p>}
        {err && <p className="gate-err">{err}</p>}
        {!loading && recipes.length === 0 && <p className="dialog-text small muted">没有可用的配方。</p>}
        {!loading && recipes.map((r) => (
          <div key={r.id} className="craft-row">
            <div className="craft-head">
              <b>{r.name}</b>
              {!r.ok && <span className="small warn">材料不足</span>}
            </div>
            <p className="small muted">{r.desc}</p>
            <button
              className="mini primary"
              disabled={busy || !r.ok}
              onClick={async () => {
                try {
                  const res: any = await api.doCraft(r.id);
                  if (res.ok) { onCrafted('制作完成'); }
                  else setErr(res.hint || res.reason || '失败');
                } catch (e: any) { setErr(e?.message || '失败'); }
              }}
            >制作</button>
          </div>
        ))}
        <div className="row col">
          <button className="dlg-opt ghost" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}