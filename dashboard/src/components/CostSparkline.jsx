import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function CostSparkline({ logs }) {
  const data = useMemo(() => {
    const now = Date.now() / 1000;
    const h24 = now - 86400;
    const hourly = {};
    for (let h = 0; h < 24; h++) hourly[h] = 0;

    logs.forEach(l => {
      if (l.timestamp >= h24) {
        const d = new Date(l.timestamp * 1000);
        hourly[d.getHours()] += l.cost || 0;
      }
    });

    return Object.entries(hourly).map(([h, cost]) => ({
      h: +h,
      cost: parseFloat(cost.toFixed(6)),
    }));
  }, [logs]);

  const totalCost24h = data.reduce((s, d) => s + d.cost, 0);

  return (
    <div className="sidebar-panel">
      <div className="sidebar-title">
        COST 24H
        <span className="sidebar-value">${totalCost24h.toFixed(4)}</span>
      </div>
      <div className="sparkline-wrap">
        <ResponsiveContainer width="100%" height={52}>
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <Area
              type="monotone"
              dataKey="cost"
              stroke="#C8FF00"
              fill="rgba(200,255,0,0.1)"
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
