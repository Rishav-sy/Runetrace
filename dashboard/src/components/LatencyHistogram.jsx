import { useMemo } from 'react';

const BUCKETS = [
  { label: '<200ms', max: 200, color: 'var(--green)' },
  { label: '200-500', max: 500, color: '#00E676' },
  { label: '500-1k', max: 1000, color: 'var(--amber)' },
  { label: '1-2k', max: 2000, color: '#FF9800' },
  { label: '2k+', max: Infinity, color: 'var(--red)' },
];

export default function LatencyHistogram({ logs }) {
  const bucketCounts = useMemo(() => {
    const counts = BUCKETS.map(() => 0);
    logs.forEach(l => {
      const ms = l.latency_ms || 0;
      for (let i = 0; i < BUCKETS.length; i++) {
        if (ms < BUCKETS[i].max || i === BUCKETS.length - 1) {
          counts[i]++;
          break;
        }
      }
    });
    return counts;
  }, [logs]);

  const maxCount = Math.max(...bucketCounts, 1);

  return (
    <div className="sidebar-panel">
      <div className="sidebar-title">LATENCY DISTRIBUTION</div>
      <div className="histogram">
        {BUCKETS.map((b, i) => (
          <div key={b.label} className="histo-col">
            <div className="histo-bar-wrap">
              <div
                className="histo-bar"
                style={{
                  height: `${(bucketCounts[i] / maxCount) * 100}%`,
                  background: b.color,
                }}
              />
            </div>
            <div className="histo-label">{b.label}</div>
            <div className="histo-count">{bucketCounts[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
