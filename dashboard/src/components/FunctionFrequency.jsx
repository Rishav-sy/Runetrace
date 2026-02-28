import { useMemo } from 'react';

export default function FunctionFrequency({ logs, onFilterFunction }) {
  const data = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const fn = l.function_name || 'unknown';
      map[fn] = (map[fn] || 0) + 1;
    });
    return Object.entries(map)
      .map(([fn, count]) => ({ fn, count }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  const maxCount = data.length > 0 ? data[0].count : 1;

  return (
    <div className="chart-panel compact">
      <div className="chart-header">
        <div className="chart-title">Top functions</div>
        <span className="chart-badge">{logs.length} total</span>
      </div>
      <div className="fn-freq-list">
        {data.map(d => (
          <div
            key={d.fn}
            className="fn-freq-row clickable"
            onClick={() => onFilterFunction && onFilterFunction(d.fn)}
            title={`Click to filter logs by ${d.fn}`}
          >
            <span className="fn-freq-name" title={d.fn}>{d.fn}</span>
            <div className="fn-freq-bar-wrap">
              <div
                className="fn-freq-bar"
                style={{ width: `${(d.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="fn-freq-count">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
