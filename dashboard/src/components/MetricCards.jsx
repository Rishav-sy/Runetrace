import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const MODEL_COLORS = {
  'gpt-4o': '#C8FF00',
  'gpt-4o-mini': '#448AFF',
  'claude-3.5-sonnet': '#FF6B35',
  'claude-3.5-haiku': '#00E676',
  'gemini-2.0-flash': '#B388FF',
  'deepseek-v3': '#FFB300',
};

export const getModelColor = (model) => MODEL_COLORS[model] || '#888888';

const RANGE_SECONDS = {
  '1h': 3600, '24h': 86400, '7d': 604800, '30d': 2592000, 'all': null,
};

function TrendBadge({ current, previous }) {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  const color = up ? 'var(--green)' : 'var(--red)';
  const bg = up ? 'var(--green-dim)' : 'var(--red-dim)';
  return (
    <span className="trend-badge" style={{ color, background: bg }}>
      {up ? '↑' : '↓'}{Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export default function MetricCards({ logs, timeRange = 'all', onFilterStatus, onFilterModel }) {
  const now = Date.now() / 1000;
  const rangeSec = RANGE_SECONDS[timeRange];

  const currentLogs = useMemo(() => rangeSec ? logs.filter(l => l.timestamp >= (now - rangeSec)) : logs, [logs, rangeSec, now]);
  const prevLogs = useMemo(() => rangeSec ? logs.filter(l => l.timestamp >= (now - rangeSec * 2) && l.timestamp < (now - rangeSec)) : [], [logs, rangeSec, now]);

  const totalCost = currentLogs.reduce((s, l) => s + (l.cost || 0), 0);
  const prevCost = prevLogs.reduce((s, l) => s + (l.cost || 0), 0);
  const totalRequests = currentLogs.length;
  const prevRequests = prevLogs.length;
  const avgLatency = totalRequests > 0 ? currentLogs.reduce((s, l) => s + (l.latency_ms || 0), 0) / totalRequests : 0;
  const prevAvgLat = prevLogs.length > 0 ? prevLogs.reduce((s, l) => s + (l.latency_ms || 0), 0) / prevLogs.length : 0;
  const totalTokens = currentLogs.reduce((s, l) => s + (l.prompt_tokens || 0) + (l.completion_tokens || 0), 0);
  const models = [...new Set(currentLogs.map(l => l.model).filter(Boolean))];
  const errors = currentLogs.filter(l => l.status === 'error').length;
  const errorRate = totalRequests > 0 ? (errors / totalRequests * 100) : 0;
  const prevErrors = prevLogs.filter(l => l.status === 'error').length;
  const prevErrorRate = prevLogs.length > 0 ? (prevErrors / prevLogs.length * 100) : 0;

  const useHourly = timeRange === '1h' || timeRange === '24h';
  const sparkData = useMemo(() => {
    const buckets = {};
    currentLogs.forEach(l => {
      const d = new Date(l.timestamp * 1000);
      const k = useHourly ? d.getHours() : d.toLocaleDateString();
      buckets[k] = (buckets[k] || 0) + (l.cost || 0);
    });
    return Object.entries(buckets).map(([k, v]) => ({ k, v }));
  }, [currentLogs, useHourly]);

  const reqSparkData = useMemo(() => {
    const buckets = {};
    currentLogs.forEach(l => {
      const d = new Date(l.timestamp * 1000);
      const k = useHourly ? d.getHours() : d.toLocaleDateString();
      buckets[k] = (buckets[k] || 0) + 1;
    });
    return Object.entries(buckets).map(([k, v]) => ({ k, v }));
  }, [currentLogs, useHourly]);

  const latencyColor = avgLatency < 500 ? 'var(--green)' : avgLatency < 1500 ? 'var(--amber)' : 'var(--red)';
  const latencyLabel = avgLatency < 500 ? 'FAST' : avgLatency < 1500 ? 'OK' : 'SLOW';
  const latencyPct = Math.min(100, (avgLatency / 5000) * 100);

  return (
    <div className="metrics-grid">
      {/* Cost */}
      <div className="metric-card">
        <div className="metric-label">Total spend</div>
        <div className="metric-value">${totalCost.toFixed(2)}</div>
        <div className="metric-sub">
          <TrendBadge current={totalCost} previous={prevCost} />
        </div>
        <div className="metric-sparkline">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Area type="monotone" dataKey="v" stroke="#C8FF00" fill="rgba(200,255,0,0.08)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Requests */}
      <div className="metric-card">
        <div className="metric-label">Requests</div>
        <div className="metric-value">{totalRequests.toLocaleString()}</div>
        <div className="metric-sub">
          <span className="accent">{totalTokens.toLocaleString()}</span> tokens
          {' '}<TrendBadge current={totalRequests} previous={prevRequests} />
        </div>
        <div className="metric-sparkline">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={reqSparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Area type="monotone" dataKey="v" stroke="#448AFF" fill="rgba(68,138,255,0.08)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latency */}
      <div className="metric-card">
        <div className="metric-label">Avg latency</div>
        <div className="metric-value">{avgLatency.toFixed(0)}<span className="metric-unit">ms</span></div>
        <div className="metric-sub">
          <span className="status-chip" style={{
            color: latencyColor,
            background: avgLatency < 500 ? 'var(--green-dim)' : avgLatency < 1500 ? 'var(--amber-dim)' : 'var(--red-dim)',
          }}>
            {latencyLabel}
          </span>
          {' '}<TrendBadge current={avgLatency} previous={prevAvgLat} />
        </div>
        <div className="latency-gauge">
          <div className="latency-gauge-fill" style={{ width: `${latencyPct}%`, background: latencyColor }} />
        </div>
      </div>

      {/* Error Rate — clickable */}
      <div
        className="metric-card metric-card-clickable"
        onClick={() => onFilterStatus && onFilterStatus('error')}
        title="Click to view error logs"
      >
        <div className="metric-label">Error rate</div>
        <div className="metric-value" style={errors > 0 ? { color: 'var(--red)' } : {}}>
          {errorRate.toFixed(1)}<span className="metric-unit">%</span>
        </div>
        <div className="metric-sub">
          <span className="accent" style={errors > 0 ? { color: 'var(--red)' } : {}}>{errors}</span> failures
          {' '}<TrendBadge current={errorRate} previous={prevErrorRate} />
        </div>
        <div className="latency-gauge">
          <div className="latency-gauge-fill" style={{
            width: `${Math.min(100, errorRate * 5)}%`,
            background: errorRate < 2 ? 'var(--green)' : errorRate < 5 ? 'var(--amber)' : 'var(--red)'
          }} />
        </div>
      </div>

      {/* Models — each pill clickable */}
      <div className="metric-card">
        <div className="metric-label">Models active</div>
        <div className="metric-value">{models.length}</div>
        <div className="model-pills">
          {models.slice(0, 6).map(m => (
            <span
              key={m}
              className="model-pill clickable"
              style={{ background: `${getModelColor(m)}18`, color: getModelColor(m) }}
              onClick={() => onFilterModel && onFilterModel(m)}
              title={`Click to filter by ${m}`}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export { MODEL_COLORS };
