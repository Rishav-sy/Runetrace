import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, DollarSign, Clock, Hash } from 'lucide-react';
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
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
      const avgLatency = d.count > 0 ? d.totalLatency / d.count : 0;
      const costPer1K = d.totalTokens > 0 ? (d.totalCost / d.totalTokens) * 1000 : 0;
      const errorRate = d.count > 0 ? (d.errors / d.count) * 100 : 0;
      const timeSpanHrs = d.lastSeen > d.firstSeen ? ((d.lastSeen - d.firstSeen) / 3600) : 1;
      const rpm = d.count / (timeSpanHrs * 60);

      return { ...d, avgLatency, p50, p95, p99, costPer1K, errorRate, rpm };
    }).sort((a, b) => b.count - a.count);
  }, [logs]);

  if (!data.length) return (
    <div className="panel">
      <div className="panel-header"><span className="panel-title">Model Comparison</span></div>
      <div className="empty-state-mini">No data yet</div>
    </div>
  );

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="panel" style={{ overflow: 'auto' }}>
      <div className="panel-header">
        <span className="panel-title">Model Comparison</span>
        <span className="panel-subtitle">{data.length} models</span>
      </div>
      <table className="mc-table">
        <thead>
          <tr>
            <th>Model</th>
            <th className="mc-right">Requests</th>
            <th className="mc-right">Avg Latency</th>
            <th className="mc-right">P50 / P95</th>
            <th className="mc-right">Error Rate</th>
            <th className="mc-right">Total Cost</th>
            <th className="mc-right">Cost/1K tok</th>
            <th className="mc-right">Tokens</th>
            <th className="mc-right">RPM</th>
          </tr>
        </thead>
        <tbody>
          {data.map(d => (
            <tr key={d.model}>
              <td>
                <div className="mc-model-cell">
                  <div className="mc-model-dot" style={{ background: getModelColor(d.model) }} />
                  <span className="mc-model-name">{d.model}</span>
                </div>
              </td>
              <td className="mc-right">
                <div className="mc-bar-cell">
                  <span>{d.count.toLocaleString()}</span>
                  <div className="mc-mini-bar">
                    <div className="mc-mini-bar-fill" style={{ width: `${(d.count / maxCount) * 100}%`, background: getModelColor(d.model) }} />
                  </div>
                </div>
              </td>
              <td className="mc-right mc-mono">
                <span className={d.avgLatency > 2000 ? 'mc-bad' : d.avgLatency > 800 ? 'mc-warn' : 'mc-good'}>
                  {d.avgLatency.toFixed(0)}ms
                </span>
              </td>
              <td className="mc-right mc-mono mc-dim">
                {d.p50.toFixed(0)} / {d.p95.toFixed(0)}ms
              </td>
              <td className="mc-right mc-mono">
                <span className={d.errorRate > 5 ? 'mc-bad' : d.errorRate > 0 ? 'mc-warn' : 'mc-good'}>
                  {d.errorRate.toFixed(1)}%
                </span>
              </td>
              <td className="mc-right mc-mono">${d.totalCost.toFixed(4)}</td>
              <td className="mc-right mc-mono mc-dim">${d.costPer1K.toFixed(4)}</td>
              <td className="mc-right mc-mono mc-dim">{d.totalTokens.toLocaleString()}</td>
              <td className="mc-right mc-mono mc-dim">{d.rpm.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
