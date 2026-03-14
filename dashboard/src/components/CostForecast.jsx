import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

export default function CostForecast({ logs }) {
  const now = Date.now() / 1000;

  // Calculate daily spend for the last 30 days and project forward
  const { chartData, projectedMonthly, currentMonthSpend, daysElapsed, budgetLine } = useMemo(() => {
    const thirtyDaysAgo = now - 30 * 86400;
    const recentLogs = logs.filter(l => l.timestamp >= thirtyDaysAgo);

    // Group by day
    const dailyMap = {};
    recentLogs.forEach(l => {
      const d = new Date(l.timestamp * 1000);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      dailyMap[key] = (dailyMap[key] || 0) + (l.cost || 0);
    });

    // Current month calculations
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const elapsed = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let monthSpend = 0;
    recentLogs.forEach(l => {
      const d = new Date(l.timestamp * 1000);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        monthSpend += (l.cost || 0);
      }
    });

    // Linear projection
    const avgDailySpend = elapsed > 0 ? monthSpend / elapsed : 0;
    const projected = avgDailySpend * daysInMonth;

    // Build chart data: actual days + projected days
    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const label = `${currentMonth + 1}/${day}`;
      if (day <= elapsed) {
        const actualSpend = dailyMap[label] || 0;
        data.push({ day: label, actual: actualSpend, projected: null, cumActual: null });
      } else {
        data.push({ day: label, actual: null, projected: avgDailySpend, cumActual: null });
      }
    }

    // Compute cumulative
    let cum = 0;
    let cumProj = monthSpend;
    data.forEach(d => {
      if (d.actual !== null) {
        cum += d.actual;
        d.cumActual = cum;
        d.cumProjected = null;
      } else {
        cumProj += d.projected || 0;
        d.cumActual = null;
        d.cumProjected = cumProj;
      }
    });

    // Bridge point: last actual day also gets cumProjected for seamless line
    const bridgeIdx = data.findIndex(d => d.actual === null) - 1;
    if (bridgeIdx >= 0) {
      data[bridgeIdx].cumProjected = data[bridgeIdx].cumActual;
    }

    return {
      chartData: data,
      projectedMonthly: projected,
      currentMonthSpend: monthSpend,
      daysElapsed: elapsed,
      budgetLine: projected * 1.2, // 20% above projected as "budget" reference
    };
  }, [logs, now]);

  const formatCost = (v) => {
    if (v >= 1) return `$${v.toFixed(2)}`;
    if (v >= 0.01) return `$${v.toFixed(3)}`;
    return `$${v.toFixed(4)}`;
  };

  return (
    <div className="chart-panel">
      <div className="chart-header">
        <span className="chart-title">Cost Forecast</span>
        <div className="forecast-badges">
          <span className="forecast-badge actual">
            Spent: {formatCost(currentMonthSpend)}
          </span>
          <span className="forecast-badge projected">
            Projected: {formatCost(projectedMonthly)}
          </span>
        </div>
      </div>

      <div className="forecast-hero">
        <div className="forecast-hero-value">{formatCost(projectedMonthly)}</div>
        <div className="forecast-hero-label">projected this month</div>
        <div className="forecast-hero-sub">
          Based on {formatCost(currentMonthSpend)} spent over {daysElapsed} days
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="costActualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C8FF00" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#C8FF00" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="costProjGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C8FF00" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#C8FF00" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            tick={{ fill: '#4A4A4A', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            interval={Math.floor(chartData.length / 6)}
          />
          <YAxis
            tick={{ fill: '#4A4A4A', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${v.toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{ background: '#161616', border: '1px solid #262626', borderRadius: 6, fontSize: 11 }}
            formatter={(v, name) => [v !== null ? formatCost(v) : '—', name === 'cumActual' ? 'Actual' : 'Projected']}
          />
          <Area
            type="monotone"
            dataKey="cumActual"
            stroke="#C8FF00"
            fill="url(#costActualGrad)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Area
            type="monotone"
            dataKey="cumProjected"
            stroke="#C8FF00"
            fill="url(#costProjGrad)"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
