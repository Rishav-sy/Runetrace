import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1a1a1a', border: '1px solid #262626', borderRadius: 4,
      padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11
    }}>
      <div style={{ color: '#8A8A8A', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#448AFF' }}>Prompt: {payload[0]?.value?.toLocaleString() || 0}</div>
      <div style={{ color: '#FFB300' }}>Completion: {payload[1]?.value?.toLocaleString() || 0}</div>
    </div>
  );
};

export default function TokenBreakdown({ logs, timeRange }) {
  const data = useMemo(() => {
    const byHour = timeRange === '1h' || timeRange === '24h';
    const buckets = {};

    logs.forEach(l => {
      const d = new Date(l.timestamp * 1000);
      let key;
      if (byHour) {
        key = `${d.getHours().toString().padStart(2, '0')}:00`;
      } else {
        key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      if (!buckets[key]) buckets[key] = { prompt: 0, completion: 0 };
      buckets[key].prompt += l.prompt_tokens || 0;
      buckets[key].completion += l.completion_tokens || 0;
    });

    return Object.entries(buckets).map(([label, d]) => ({ label, ...d }));
  }, [logs, timeRange]);

  return (
    <div className="chart-panel">
      <div className="chart-header">
        <div className="chart-title">Token consumption</div>
        <div className="chart-legend">
          <div className="legend-item"><div className="legend-dot" style={{ background: '#448AFF' }} /><span>prompt</span></div>
          <div className="legend-item"><div className="legend-dot" style={{ background: '#FFB300' }} /><span>completion</span></div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#1a1a1a" strokeDasharray="none" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#4A4A4A', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={{ stroke: '#1a1a1a' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#4A4A4A', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="prompt" stackId="a" fill="#448AFF" fillOpacity={0.7} radius={[0, 0, 0, 0]} barSize={20} />
          <Bar dataKey="completion" stackId="a" fill="#FFB300" fillOpacity={0.7} radius={[3, 3, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
