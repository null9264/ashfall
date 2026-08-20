// v2.0.3: 主线进度条(5 步)
export function MainProgress({ progress = 0 }: { progress?: number }) {
  const labels = ['小月', '医生', '老吴', '密码', '抉择'];
  const safe = Math.max(0, Math.min(5, progress));
  return (
    <div className="main-progress">
      <div className="main-progress-label">
        <span className="main-progress-title">主线进度</span>
        <span className="main-progress-count">{safe} / 5</span>
      </div>
      <div className="main-progress-bar">
        {labels.map((l, i) => (
          <div key={i} className={'main-progress-step' + (i < safe ? ' done' : (i === safe ? ' cur' : ''))}>
            <div className="main-progress-dot" />
            <span className="main-progress-name">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}