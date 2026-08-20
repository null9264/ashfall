// v2.0.3: 第一分钟教程浮层(3 张卡)
import { useState } from 'react';

const CARDS = [
  {
    title: '欢迎来到灰烬城',
    body: '你是从城外来的人。城门里每个人都带着秘密，但也很愿意用秘密换东西。',
    hint: '试着点右下角「行动」看最近发生的事；点 NPC 名字可以对话。',
  },
  {
    title: '先领你的第一个任务',
    body: '城门边是「老周」。他需要 3 块废金属；用「搜寻物资」按钮在城门外就能找到。',
    hint: '点「搜寻物资」获得废金属，再点老周选「给他 3 块废金属」即可完成。',
  },
  {
    title: '探索更多区域',
    body: '完成任务后，去黑市街区找医生 / 小满；去居民楼找林婶 / 少年；地铁和工厂危险更大，但也藏着真相。',
    hint: '右上角五个数值条显示你的生命 / 体力 / 辐射 / 声望 / 废料 — 别忘了看。',
  },
];

export function TutorialOverlay({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const total = CARDS.length;
  const cur = CARDS[step];
  return (
    <div className="tutorial-mask">
      <div className="tutorial-card">
        <div className="tutorial-step">第 {step + 1} / {total} 步</div>
        <h2 className="tutorial-title">{cur.title}</h2>
        <p className="tutorial-body">{cur.body}</p>
        <p className="tutorial-hint">{cur.hint}</p>
        <div className="tutorial-actions">
          {step > 0 && (
            <button className="dlg-opt ghost" onClick={() => setStep(step - 1)}>上一步</button>
          )}
          {step < total - 1 ? (
            <button className="dlg-opt primary" onClick={() => setStep(step + 1)}>下一步 →</button>
          ) : (
            <button className="dlg-opt primary" onClick={onClose}>开始灰烬城之旅</button>
          )}
        </div>
      </div>
    </div>
  );
}