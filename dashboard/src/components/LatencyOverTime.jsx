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
      <div style={{ color: '#B388FF', fontWeight: 600 }}>{payload[0].value.toFixed(0)} ms avg</div>
    </div>
  );
};

export default function LatencyOverTime({ logs, timeRange }) {
  const data = useMemo(() => {
    const byHour = timeRange === '1h' || timeRange === '24h';
    const buckets = {};

    logs.forEach(l => {
      if (!l.latency_ms) return;
      
      const d = new Date(l.timestamp * 1000);
      let key;
      if (byHour) {
        key = `${d.getHours().toString().padStart(2, '0')}:00`;
      } else {
        key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      
      if (!buckets[key]) buckets[key] = { latency: 0, count: 0 };
      buckets[key].latency += l.latency_ms;
      buckets[key].count += 1;
    });

    return Object.entries(buckets).map(([label, d]) => ({ 
      label, 
      avgLatency: d.latency / d.count 
    }));
  }, [logs, timeRange]);

  return (
    <div className="chart-panel">
      <div className="chart-header">
        <div className="chart-title">Avg Latency over time</div>
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
            tickFormatter={(v) => `${v}ms`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="avgLatency"
            stroke="#B388FF"
            strokeWidth={2}
            fill="rgba(179,136,255,0.06)"
            dot={false}
            activeDot={{ r: 3, fill: '#B388FF', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
