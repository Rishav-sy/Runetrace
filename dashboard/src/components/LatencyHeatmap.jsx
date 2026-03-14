import { useMemo } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function LatencyHeatmap({ logs }) {
  const { grid, maxCount, totalCells } = useMemo(() => {
    // 7 days × 24 hours grid
    const g = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 0;
    let total = 0;

    logs.forEach(l => {
      const d = new Date((l.timestamp || 0) * 1000);
      const day = d.getDay();
      const hour = d.getHours();
      g[day][hour]++;
      if (g[day][hour] > max) max = g[day][hour];
      total++;
    });

    return { grid: g, maxCount: max, totalCells: total };
  }, [logs]);

  const getColor = (count) => {
    if (count === 0) return 'var(--bg-hover)';
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    if (intensity < 0.25) return 'rgba(200, 255, 0, 0.15)';
    if (intensity < 0.5) return 'rgba(200, 255, 0, 0.35)';
    if (intensity < 0.75) return 'rgba(200, 255, 0, 0.6)';
    return 'rgba(200, 255, 0, 0.9)';
  };

  // Find peak hour
  const peak = useMemo(() => {
    let best = { day: 0, hour: 0, count: 0 };
    grid.forEach((row, d) => row.forEach((count, h) => {
      if (count > best.count) best = { day: d, hour: h, count };
    }));
    return best;
  }, [grid]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Request Heatmap</span>
        <div className="heatmap-legend">
          <span className="hm-legend-label">Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
            <div key={i} className="hm-legend-box" style={{
              background: v === 0 ? 'var(--bg-hover)' : `rgba(200, 255, 0, ${v * 0.9 + 0.1})`
            }} />
          ))}
          <span className="hm-legend-label">More</span>
        </div>
      </div>

      <div className="heatmap-grid">
        {/* Hour labels */}
        <div className="hm-corner" />
        {HOURS.map(h => (
          <div key={h} className="hm-hour-label">{h % 3 === 0 ? `${h}:00` : ''}</div>
        ))}

        {/* Rows */}
        {DAYS.map((day, d) => (
          <div key={d} className="hm-row" role="row">
            <div className="hm-day-label">{day}</div>
            {HOURS.map(h => (
              <div
                key={h}
                className="hm-cell"
                style={{ background: getColor(grid[d][h]) }}
                title={`${day} ${h}:00 — ${grid[d][h]} requests`}
              >
                {grid[d][h] > 0 && maxCount > 50 ? '' : grid[d][h] > 0 ? grid[d][h] : ''}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="hm-stats">
        <span>Peak: <strong>{DAYS[peak.day]} {peak.hour}:00</strong> ({peak.count} req)</span>
        <span>Total: <strong>{totalCells}</strong> requests mapped</span>
      </div>
    </div>
  );
}
