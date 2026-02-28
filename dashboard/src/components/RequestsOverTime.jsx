import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1a1a1a', border: '1px solid #262626', borderRadius: 4,
      padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11
    }}>
      <div style={{ color: '#8A8A8A', marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#C8FF00', fontWeight: 600 }}>{payload[0].value} calls</div>
    </div>
  );
};

export default function RequestsOverTime({ logs, timeRange }) {
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
      buckets[key] = (buckets[key] || 0) + 1;
    });

    return Object.entries(buckets).map(([label, count]) => ({ label, count }));
  }, [logs, timeRange]);

  return (
    <div className="chart-panel">
      <div className="chart-header">
        <div className="chart-title">Call volume over time</div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
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
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#C8FF00"
            strokeWidth={2}
            fill="rgba(200,255,0,0.06)"
            dot={false}
            activeDot={{ r: 3, fill: '#C8FF00', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
