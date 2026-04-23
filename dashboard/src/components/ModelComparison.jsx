import { useMemo } from 'react';
import { getModelColor } from './MetricCards';

export default function ModelComparison({ logs }) {
  const data = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const m = l.model || 'unknown';
      if (!map[m]) map[m] = { model: m, count: 0, totalLatency: 0, totalCost: 0, totalTokens: 0, p50Arr: [], errors: 0, firstSeen: Infinity, lastSeen: 0 };
      map[m].count++;
      map[m].totalLatency += (l.latency_ms || 0);
      map[m].totalCost += (l.cost || 0);
      map[m].totalTokens += (l.prompt_tokens || 0) + (l.completion_tokens || 0);
      map[m].p50Arr.push(l.latency_ms || 0);
      if (l.status === 'error') map[m].errors++;
      map[m].firstSeen = Math.min(map[m].firstSeen, l.timestamp || Infinity);
      map[m].lastSeen = Math.max(map[m].lastSeen, l.timestamp || 0);
    });

    return Object.values(map).map(d => {
      const sorted = d.p50Arr.sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      const avgLatency = d.count > 0 ? d.totalLatency / d.count : 0;
      const costPer1K = d.totalTokens > 0 ? (d.totalCost / d.totalTokens) * 1000 : 0;
      const errorRate = d.count > 0 ? (d.errors / d.count) * 100 : 0;
      const timeSpanHrs = d.lastSeen > d.firstSeen ? ((d.lastSeen - d.firstSeen) / 3600) : 1;
      const rpm = d.count / (timeSpanHrs * 60);

      return { ...d, avgLatency, p50, p95, costPer1K, errorRate, rpm };
    }).sort((a, b) => b.count - a.count);
  }, [logs]);

  if (!data.length) return (
    <div className="panel">
      <div className="panel-header"><span className="panel-title">Model Comparison</span></div>
      <div className="empty-state-mini">No data yet</div>
    </div>
  );

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const totalReqs = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-header" style={{ flexShrink: 0 }}>
        <span className="panel-title">Model Comparison</span>
        <span className="panel-subtitle">{data.length} model{data.length !== 1 ? 's' : ''} · {totalReqs.toLocaleString()} requests</span>
      </div>

      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', minHeight: 0, marginTop: 4 }}>
        {data.map((d, idx) => {
          const color = getModelColor(d.model);
          const pct = (d.count / maxCount) * 100;
          const latencyColor = d.avgLatency > 2000 ? '#FF4444' : d.avgLatency > 800 ? '#FFB300' : '#00E676';
          const errorColor = d.errorRate > 5 ? '#FF4444' : d.errorRate > 0 ? '#FFB300' : '#00E676';

          return (
            <div key={d.model} style={{
              padding: '10px 12px',
              borderBottom: idx < data.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              transition: 'background 0.12s',
              cursor: 'default',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Row 1: Model name + request count + bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
                  boxShadow: `0 0 6px ${color}44`,
                }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
                  {d.model}
                </span>
                <span style={{
                  fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600,
                  color: 'var(--text)', minWidth: 36, textAlign: 'right',
                }}>
                  {d.count.toLocaleString()}
                </span>
              </div>

              {/* Request share bar */}
              <div style={{
                width: '100%', height: 3, background: 'rgba(255,255,255,0.04)',
                borderRadius: 2, overflow: 'hidden', marginBottom: 8,
              }}>
                <div style={{
                  width: `${pct}%`, height: '100%', borderRadius: 2,
                  background: color, opacity: 0.7,
                  transition: 'width 0.4s ease',
                }} />
              </div>

              {/* Row 2: Stats */}
              <div style={{
                display: 'flex', gap: 4, flexWrap: 'wrap',
              }}>
                {[
                  { label: 'Avg', value: `${d.avgLatency.toFixed(0)}ms`, color: latencyColor },
                  { label: 'P50', value: `${d.p50.toFixed(0)}ms`, color: 'var(--text-2)' },
                  { label: 'P95', value: `${d.p95.toFixed(0)}ms`, color: 'var(--text-2)' },
                  { label: 'Err', value: `${d.errorRate.toFixed(1)}%`, color: errorColor },
                  { label: 'Cost', value: `$${d.totalCost.toFixed(4)}`, color: 'var(--text-2)' },
                  { label: '$/1K', value: `$${d.costPer1K.toFixed(4)}`, color: 'var(--text-3)' },
                  { label: 'Tok', value: d.totalTokens.toLocaleString(), color: 'var(--text-3)' },
                ].map(s => (
                  <div key={s.label} style={{
                    display: 'flex', alignItems: 'baseline', gap: 3,
                    padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(255,255,255,0.03)',
                  }}>
                    <span style={{ fontSize: 8, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {s.label}
                    </span>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 500, color: s.color }}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
