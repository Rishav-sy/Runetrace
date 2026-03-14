import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const ERROR_COLORS = {
  'Rate limit': '#FF6B35',
  'Timeout': '#FFB300',
  'Context length': '#B388FF',
  'Content filter': '#448AFF',
  'Model overloaded': '#FF4757',
  'Auth error': '#FF1744',
  'Connection error': '#00BCD4',
  'Other': '#888888',
};

function classifyError(msg) {
  if (!msg) return 'Other';
  const lower = msg.toLowerCase();
  if (lower.includes('rate limit') || lower.includes('429')) return 'Rate limit';
  if (lower.includes('timeout') || lower.includes('timed out')) return 'Timeout';
  if (lower.includes('context length') || lower.includes('too long')) return 'Context length';
  if (lower.includes('content filter') || lower.includes('blocked')) return 'Content filter';
  if (lower.includes('overloaded') || lower.includes('503')) return 'Model overloaded';
  if (lower.includes('api key') || lower.includes('auth') || lower.includes('401') || lower.includes('403')) return 'Auth error';
  if (lower.includes('connection') || lower.includes('reset')) return 'Connection error';
  return 'Other';
}

export default function ErrorAnalysis({ logs, onFilterStatus }) {
  const [timeWindow, setTimeWindow] = useState('24h');

  const errorLogs = useMemo(() => logs.filter(l => l.status === 'error'), [logs]);
  const errorRate = logs.length > 0 ? ((errorLogs.length / logs.length) * 100) : 0;

  // Error type breakdown
  const typeBreakdown = useMemo(() => {
    const map = {};
    errorLogs.forEach(l => {
      const cat = classifyError(l.error_message);
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [errorLogs]);

  // Error rate over time
  const timeData = useMemo(() => {
    const buckets = {};
    const now = Date.now() / 1000;
    const range = timeWindow === '1h' ? 3600 : timeWindow === '24h' ? 86400 : timeWindow === '7d' ? 604800 : 2592000;
    const bucketCount = timeWindow === '1h' ? 12 : timeWindow === '24h' ? 24 : timeWindow === '7d' ? 7 : 30;
    const bucketSize = range / bucketCount;

    for (let i = 0; i < bucketCount; i++) {
      const start = now - range + i * bucketSize;
      const end = start + bucketSize;
      const total = logs.filter(l => l.timestamp >= start && l.timestamp < end).length;
      const errors = logs.filter(l => l.timestamp >= start && l.timestamp < end && l.status === 'error').length;
      const d = new Date(start * 1000);
      const label = timeWindow === '1h'
        ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : timeWindow === '24h'
          ? d.toLocaleTimeString('en-US', { hour: '2-digit' })
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      buckets[label] = { label, rate: total > 0 ? (errors / total * 100) : 0, errors, total };
    }
    return Object.values(buckets);
  }, [logs, timeWindow]);

  return (
    <div className="chart-panel">
      <div className="chart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="chart-title">Error Analysis</span>
          <span
            className="error-rate-badge"
            style={{
              color: errorRate > 5 ? 'var(--red)' : errorRate > 2 ? 'var(--amber)' : 'var(--green)',
              background: errorRate > 5 ? 'var(--red-dim)' : errorRate > 2 ? 'var(--amber-dim)' : 'var(--green-dim)',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => onFilterStatus && onFilterStatus('error')}
            title="Click to filter error logs"
          >
            {errorRate.toFixed(1)}% error rate
          </span>
        </div>
        <div className="time-micro-picker">
          {['1h', '24h', '7d', '30d'].map(w => (
            <button
              key={w}
              className={`time-micro-btn ${timeWindow === w ? 'active' : ''}`}
              onClick={() => setTimeWindow(w)}
            >
              {w.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Error rate over time */}
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={timeData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4757" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#FF4757" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fill: '#4A4A4A', fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#4A4A4A', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
          <Tooltip
            contentStyle={{ background: '#161616', border: '1px solid #262626', borderRadius: 6, fontSize: 11 }}
            formatter={(v, name) => [`${v.toFixed(1)}%`, 'Error Rate']}
          />
          <Area type="monotone" dataKey="rate" stroke="#FF4757" fill="url(#errorGrad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Error type breakdown */}
      {typeBreakdown.length > 0 && (
        <div className="error-breakdown">
          <span className="chart-subtitle" style={{ marginBottom: 4 }}>Error Types</span>
          <div className="error-type-list">
            {typeBreakdown.map(t => (
              <div key={t.name} className="error-type-row">
                <div className="error-type-dot" style={{ background: ERROR_COLORS[t.name] || '#888' }} />
                <span className="error-type-name">{t.name}</span>
                <span className="error-type-count">{t.value}</span>
                <div className="error-type-bar-track">
                  <div
                    className="error-type-bar-fill"
                    style={{
                      width: `${(t.value / (typeBreakdown[0]?.value || 1)) * 100}%`,
                      background: ERROR_COLORS[t.name] || '#888',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorLogs.length === 0 && (
        <div className="empty-state-mini">
          <span style={{ color: 'var(--green)' }}>✓ No errors detected</span>
        </div>
      )}
    </div>
  );
}
