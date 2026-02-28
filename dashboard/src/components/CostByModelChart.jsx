import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { getModelColor } from './MetricCards';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: '#1a1a1a', border: '1px solid #262626', borderRadius: 4,
      padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11
    }}>
      <div style={{ color: '#EDEDED', fontWeight: 600, marginBottom: 4 }}>{d.model}</div>
      <div style={{ color: '#C8FF00' }}>${d.cost.toFixed(6)}</div>
      <div style={{ color: '#8A8A8A', marginTop: 2 }}>{d.count} calls · avg ${d.avg.toFixed(6)}/call</div>
      <div style={{ color: '#4A4A4A', fontSize: 9, marginTop: 6 }}>Click to filter by this model →</div>
    </div>
  );
};

export default function CostByModelChart({ logs, onFilterModel }) {
  const data = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const m = l.model || 'unknown';
      if (!map[m]) map[m] = { cost: 0, count: 0 };
      map[m].cost += l.cost || 0;
      map[m].count++;
    });
    return Object.entries(map)
      .map(([model, d]) => ({
        model,
        cost: parseFloat(d.cost.toFixed(6)),
        count: d.count,
        avg: d.cost / d.count,
        color: getModelColor(model),
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [logs]);

  if (data.length === 0) {
    return (
      <div className="chart-panel">
        <div className="chart-header"><div className="chart-title">Cost by model</div></div>
        <div className="chart-empty">No data</div>
      </div>
    );
  }

  return (
    <div className="chart-panel">
      <div className="chart-header">
        <div className="chart-title">Cost by model</div>
        <div className="chart-legend">
          {data.slice(0, 4).map(d => (
            <div
              key={d.model}
              className="legend-item clickable"
              onClick={() => onFilterModel && onFilterModel(d.model)}
            >
              <div className="legend-dot" style={{ background: d.color }} />
              <span>{d.model}</span>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={data.length * 38 + 20}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
          onClick={(e) => {
            if (e?.activePayload?.[0]?.payload?.model && onFilterModel) {
              onFilterModel(e.activePayload[0].payload.model);
            }
          }}
          style={{ cursor: onFilterModel ? 'pointer' : 'default' }}
        >
          <CartesianGrid horizontal={false} stroke="#1a1a1a" />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="model"
            width={120}
            tick={{ fill: '#8A8A8A', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="cost" radius={[0, 3, 3, 0]} barSize={20}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={0.8} style={{ cursor: 'pointer' }} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
