import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';

const MODEL_COLORS = {
  'gpt-4o': '#C8FF00',
  'gpt-4o-mini': '#448AFF',
  'claude-3.5-sonnet': '#FF6B35',
  'claude-3.5-haiku': '#00E676',
  'gemini-2.0-flash': '#B388FF',
  'deepseek-v3': '#FFB300',
  'llama-3.3-70b-versatile': '#00BCD4',
};

function getColor(model) {
  return MODEL_COLORS[model] || '#888888';
}

function latColor(ms) {
  if (ms < 500) return 'var(--green)';
  if (ms < 1500) return 'var(--amber)';
  return 'var(--red)';
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export default function LatencyPercentiles({ logs }) {
  const latencies = useMemo(() =>
    logs.filter(l => l.latency_ms > 0).map(l => l.latency_ms),
    [logs]
  );

  const p50 = useMemo(() => percentile(latencies, 50), [latencies]);
  const p95 = useMemo(() => percentile(latencies, 95), [latencies]);
  const p99 = useMemo(() => percentile(latencies, 99), [latencies]);

  const maxVal = Math.max(p99, 1);

  const gauges = [
    { label: 'P50', value: p50 },
    { label: 'P95', value: p95 },
    { label: 'P99', value: p99 },
  ];

  // Per-model breakdown
  const byModel = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      if (!l.model || !l.latency_ms) return;
      if (!map[l.model]) map[l.model] = [];
      map[l.model].push(l.latency_ms);
    });
    return Object.entries(map)
      .map(([model, lats]) => ({
        model,
        p50: percentile(lats, 50),
        p95: percentile(lats, 95),
        count: lats.length,
      }))
      .sort((a, b) => b.p95 - a.p95)
      .slice(0, 6);
  }, [logs]);

  return (
    <div className="chart-panel">
      <div className="chart-header">
        <span className="chart-title">Latency Percentiles</span>
        <span className="chart-subtitle">{latencies.length} requests</span>
      </div>

      {/* Gauge bars */}
      <div className="percentile-gauges">
        {gauges.map(g => (
          <div key={g.label} className="percentile-row">
            <span className="percentile-label">{g.label}</span>
            <div className="percentile-bar-track">
              <div
                className="percentile-bar-fill"
                style={{
                  width: `${Math.min(100, (g.value / maxVal) * 100)}%`,
                  background: latColor(g.value),
                }}
              />
            </div>
            <span className="percentile-value" style={{ color: latColor(g.value) }}>
              {g.value.toFixed(0)}ms
            </span>
          </div>
        ))}
      </div>

      {/* By model */}
      <div className="percentile-model-section">
        <span className="chart-subtitle" style={{ marginBottom: 6 }}>By Model (P95)</span>
        <ResponsiveContainer width="100%" height={byModel.length * 28 + 8}>
          <BarChart data={byModel} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="model"
              width={120}
              tick={{ fill: '#8A8A8A', fontSize: 10, fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={m => m.length > 16 ? m.slice(0, 16) + '…' : m}
            />
            <Tooltip
              contentStyle={{ background: '#161616', border: '1px solid #262626', borderRadius: 6, fontSize: 11 }}
              labelStyle={{ color: '#EDEDED' }}
              formatter={(v) => [`${v.toFixed(0)}ms`, 'P95']}
            />
            <Bar dataKey="p95" radius={[0, 3, 3, 0]} maxBarSize={16}>
              {byModel.map((entry, i) => (
                <Cell key={i} fill={getColor(entry.model)} fillOpacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
