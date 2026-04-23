import { useMemo, useState } from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function LatencyHeatmap({ logs, onFilterTime }) {
  const { grid, maxCount, totalCells } = useMemo(() => {
    // 7 days × 24 hours grid (index 0 = Mon, 6 = Sun)
    const g = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 0;
    let total = 0;

    logs.forEach(l => {
      const d = new Date((l.timestamp || 0) * 1000);
      // JS getDay: 0=Sun,1=Mon..6=Sat → remap to 0=Mon..6=Sun
      const jsDay = d.getDay();
      const day = jsDay === 0 ? 6 : jsDay - 1;
      const hour = d.getHours();
      g[day][hour]++;
      if (g[day][hour] > max) max = g[day][hour];
      total++;
    });

    return { grid: g, maxCount: max, totalCells: total };
  }, [logs]);

  const getColor = (count) => {
    if (count === 0) return 'rgba(255,255,255,0.03)';
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    if (intensity < 0.25) return 'rgba(200, 255, 0, 0.12)';
    if (intensity < 0.5) return 'rgba(200, 255, 0, 0.30)';
    if (intensity < 0.75) return 'rgba(200, 255, 0, 0.55)';
    return 'rgba(200, 255, 0, 0.85)';
  };

  const [hoveredCell, setHoveredCell] = useState(null);

  const handleMouseEnter = (e, d, h, count) => {
    if (count === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredCell({
      day: DAYS[d],
      hour: h,
      count,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
    e.currentTarget.style.transform = 'scale(1.4)';
    e.currentTarget.style.zIndex = '10';
    e.currentTarget.style.boxShadow = '0 0 8px rgba(0,0,0,0.5)';
  };

  const handleMouseLeave = (e) => {
    setHoveredCell(null);
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.zIndex = '1';
    e.currentTarget.style.boxShadow = 'none';
  };

  // Find peak hour
  const peak = useMemo(() => {
    let best = { day: 0, hour: 0, count: 0 };
    grid.forEach((row, d) => row.forEach((count, h) => {
      if (count > best.count) best = { day: d, hour: h, count };
    }));
    return best;
  }, [grid]);

  // Only show every 3rd hour label to avoid clutter
  const showHourLabels = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="panel" style={{ position: 'relative' }}>
      <div className="panel-header" style={{ flexShrink: 0 }}>
        <span className="panel-title">Request Heatmap</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--text-3)' }}>Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: 2,
              background: v === 0 ? 'rgba(255,255,255,0.03)' : `rgba(200, 255, 0, ${v * 0.85 + 0.05})`
            }} />
          ))}
          <span style={{ fontSize: 9, color: 'var(--text-3)' }}>More</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 0' }}>
        {/* Hour labels row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '32px repeat(24, 1fr)',
          gap: 2,
          marginBottom: 4,
        }}>
          <div /> {/* corner spacer */}
          {HOURS.map(h => (
            <div key={h} style={{
              textAlign: 'center',
              fontSize: 8,
              color: 'var(--text-3)',
              fontFamily: 'var(--mono)',
              lineHeight: 1,
            }}>
              {showHourLabels.includes(h) ? `${h}h` : ''}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {DAYS.map((day, d) => (
          <div key={d} style={{
            display: 'grid',
            gridTemplateColumns: '32px repeat(24, 1fr)',
            gap: 2,
            marginBottom: 2,
          }}>
            <div style={{
              fontSize: 9,
              color: 'var(--text-3)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
            }}>
              {day}
            </div>
            {HOURS.map(h => {
              const count = grid[d][h];
              return (
                <div
                  key={h}
                  onClick={() => {
                    if (count > 0 && onFilterTime) {
                      onFilterTime(d, h, `${day} ${h}:00 - ${h + 1}:00`);
                    }
                  }}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 2,
                    background: getColor(count),
                    cursor: count > 0 ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    zIndex: 1,
                  }}
                  onMouseEnter={(e) => handleMouseEnter(e, d, h, count)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', gap: 16, paddingTop: 6,
        borderTop: '1px solid var(--border-dim)',
        fontSize: 10, color: 'var(--text-3)', flexShrink: 0,
      }}>
        <span>Peak: <strong style={{ color: 'var(--text-2)' }}>{DAYS[peak.day]} {peak.hour}:00</strong> ({peak.count} req)</span>
        <span>Total: <strong style={{ color: 'var(--text-2)' }}>{totalCells}</strong> requests mapped</span>
      </div>

      {/* Floating Custom Tooltip */}
      {hoveredCell && (
        <div style={{
          position: 'fixed',
          top: hoveredCell.y,
          left: hoveredCell.x,
          transform: 'translate(-50%, -100%)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          padding: '6px 10px',
          borderRadius: 6,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          zIndex: 9999,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          minWidth: 100,
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {hoveredCell.day} {hoveredCell.hour}:00 - {hoveredCell.hour + 1}:00
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--mono)', fontWeight: 600 }}>
            {hoveredCell.count.toLocaleString()} <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--sans)' }}>requests</span>
          </div>
          {/* Tooltip Arrow */}
          <div style={{
            position: 'absolute',
            bottom: -5,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 8, height: 8,
            background: 'var(--bg-elevated)',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
          }} />
        </div>
      )}
    </div>
  );
}
