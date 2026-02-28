import { useMemo } from 'react';

export default function LatencyByFunction({ logs, onFilterFunction }) {
  const fnData = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const fn = l.function_name || 'unknown';
      if (!map[fn]) map[fn] = [];
      map[fn].push(l.latency_ms || 0);
    });
    return Object.entries(map)
      .map(([fn, latencies]) => ({
        fn,
        latencies: latencies.slice(0, 50),
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p50: latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.5)] || 0,
        p95: latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] || 0,
        total: latencies.length,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [logs]);

  const dotColor = (ms) =>
    ms < 500 ? 'var(--green)' : ms < 1500 ? 'var(--amber)' : 'var(--red)';

  if (fnData.length === 0) {
    return (
      <div className="chart-panel">
        <div className="chart-header"><div className="chart-title">Latency by function</div></div>
        <div className="chart-empty">No data</div>
      </div>
    );
  }

  return (
    <div className="chart-panel">
      <div className="chart-header">
        <div className="chart-title">Latency by function</div>
        <div className="chart-legend">
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--green)' }} /><span>&lt;500ms</span></div>
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--amber)' }} /><span>&lt;1.5s</span></div>
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--red)' }} /><span>&gt;1.5s</span></div>
        </div>
      </div>
      <div>
        {fnData.map(d => (
          <div
            key={d.fn}
            className="fn-row clickable"
            onClick={() => onFilterFunction && onFilterFunction(d.fn)}
            title={`Click to filter logs by ${d.fn}`}
          >
            <div className="fn-name" title={d.fn}>{d.fn}</div>
            <div className="fn-dots">
              {d.latencies.map((ms, i) => (
                <div
                  key={i}
                  className="fn-dot"
                  style={{ background: dotColor(ms) }}
                  title={`${ms.toFixed(0)}ms`}
                />
              ))}
              {d.total > 50 && <span style={{ fontSize: 9, color: 'var(--text-3)', marginLeft: 4 }}>+{d.total - 50}</span>}
            </div>
            <div className="fn-avg" style={{ color: dotColor(d.avg) }}>{d.avg.toFixed(0)}ms</div>
          </div>
        ))}
      </div>
    </div>
  );
}
