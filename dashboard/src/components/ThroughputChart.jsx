import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function ThroughputChart({ logs, timeRange }) {
  const { data, avgRPM, peakRPM, peakTime, totalReqs } = useMemo(() => {
    if (!logs.length) return { data: [], avgRPM: 0, peakRPM: 0, peakTime: '', totalReqs: 0 };

    // Bucket by minute
    const buckets = {};
    logs.forEach(l => {
      const ts = (l.timestamp || 0) * 1000;
      const minute = Math.floor(ts / 60000) * 60000;
      if (!buckets[minute]) buckets[minute] = { count: 0, errors: 0, totalLatency: 0 };
      buckets[minute].count++;
      if (l.status === 'error') buckets[minute].errors++;
      buckets[minute].totalLatency += (l.latency_ms || 0);
    });

    const sorted = Object.entries(buckets)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([ts, b]) => ({
        time: Number(ts),
        rpm: b.count,
        errors: b.errors,
        avgLatency: b.count > 0 ? Math.round(b.totalLatency / b.count) : 0,
      }));

    // If too many points, bucket by larger intervals
    let data = sorted;
    if (data.length > 120) {
      const interval = Math.ceil(data.length / 60);
      const compressed = [];
      for (let i = 0; i < data.length; i += interval) {
        const slice = data.slice(i, i + interval);
        compressed.push({
          time: slice[0].time,
          rpm: Math.round(slice.reduce((s, d) => s + d.rpm, 0) / slice.length),
          errors: slice.reduce((s, d) => s + d.errors, 0),
          avgLatency: Math.round(slice.reduce((s, d) => s + d.avgLatency, 0) / slice.length),
        });
      }
      data = compressed;
    }

    const rpms = data.map(d => d.rpm);
    const avg = rpms.length > 0 ? rpms.reduce((s, r) => s + r, 0) / rpms.length : 0;
    const peak = Math.max(...rpms, 0);
    const peakEntry = data.find(d => d.rpm === peak);
    const peakTime = peakEntry ? new Date(peakEntry.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
    const total = logs.length;

    return { data, avgRPM: avg, peakRPM: peak, peakTime, totalReqs: total };
  }, [logs]);

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Throughput</span>
        <div className="tp-badges">
          <span className="tp-badge">Avg: <strong>{avgRPM.toFixed(1)}</strong> rpm</span>
          <span className="tp-badge peak">Peak: <strong>{peakRPM}</strong> rpm {peakTime && `@ ${peakTime}`}</span>
        </div>
      </div>

      {data.length > 0 ? (
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="tpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C8FF00" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#C8FF00" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="tpErrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF4444" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#FF4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tickFormatter={fmtTime} tick={{ fill: '#666', fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis tick={{ fill: '#666', fontSize: 9 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, fontSize: 11 }}
                labelFormatter={v => new Date(v).toLocaleString()}
                formatter={(v, n) => [v, n === 'rpm' ? 'Requests/min' : n === 'errors' ? 'Errors' : 'Avg Latency (ms)']}
              />
              <ReferenceLine y={avgRPM} stroke="#C8FF0066" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="rpm" stroke="#C8FF00" fill="url(#tpGrad)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="errors" stroke="#FF4444" fill="url(#tpErrGrad)" strokeWidth={1} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state-mini">No throughput data</div>
      )}
    </div>
  );
}
