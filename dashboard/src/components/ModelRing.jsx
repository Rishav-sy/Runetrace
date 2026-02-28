import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { getModelColor } from './MetricCards';

export default function ModelRing({ logs, onFilterModel }) {
  const data = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const m = l.model || 'unknown';
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map)
      .map(([model, count]) => ({ model, count, color: getModelColor(model) }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="chart-panel compact">
      <div className="chart-header">
        <div className="chart-title">Model distribution</div>
      </div>
      <div className="ring-wrap">
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={2}
              dataKey="count"
              strokeWidth={0}
              onClick={(_, idx) => {
                if (onFilterModel && data[idx]) onFilterModel(data[idx].model);
              }}
              style={{ cursor: 'pointer' }}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} fillOpacity={0.85} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="ring-center-label">{total}</div>
      </div>
      <div className="ring-legend">
        {data.map(d => (
          <div
            key={d.model}
            className="ring-legend-item clickable"
            onClick={() => onFilterModel && onFilterModel(d.model)}
          >
            <div className="ring-legend-dot" style={{ background: d.color }} />
            <span className="ring-legend-name">{d.model}</span>
            <span className="ring-legend-pct">{((d.count / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
