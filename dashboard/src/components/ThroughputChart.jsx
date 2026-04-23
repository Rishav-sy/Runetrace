import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

export default function ThroughputChart({ logs, timeRange }) {
  const { data, avgRPM, peakRPM, peakTime, totalReqs } = useMemo(() => {
    if (!logs.length) return { data: [], avgRPM: 0, peakRPM: 0, peakTime: '', totalReqs: 0 };

    let minTs = Infinity;
    let maxTs = 0;
    logs.forEach(l => {
      const ts = (l.timestamp || 0) * 1000;
      if (ts < minTs) minTs = ts;
      if (ts > maxTs) maxTs = ts;
    });

    const rangeMs = maxTs - minTs;
    const days = rangeMs / (1000 * 60 * 60 * 24);
    
    let bucketMs = 60000; // default 1 minute
    if (days > 14) bucketMs = 86400000; // 1 day
    else if (days > 2) bucketMs = 3600000; // 1 hour
    else if (days > 0.5) bucketMs = 900000; // 15 mins

    // Create continuous buckets
    const startBucket = Math.floor(minTs / bucketMs) * bucketMs;
    const endBucket = Math.floor(maxTs / bucketMs) * bucketMs;
    const numBuckets = Math.floor((endBucket - startBucket) / bucketMs) + 1;
    
    // Safety cap on buckets
    const safeNumBuckets = Math.min(numBuckets, 500);
    const adjustedBucketMs = safeNumBuckets < numBuckets ? Math.ceil((endBucket - startBucket) / 500) : bucketMs;

    const buckets = {};
    for (let i = 0; i <= safeNumBuckets; i++) {
      buckets[startBucket + (i * adjustedBucketMs)] = { count: 0, errors: 0, totalLatency: 0 };
    }

    logs.forEach(l => {
      const ts = (l.timestamp || 0) * 1000;
      const bucket = Math.floor(ts / adjustedBucketMs) * adjustedBucketMs;
      // Find nearest valid bucket
      const validBucket = Object.keys(buckets).reduce((prev, curr) => 
        Math.abs(curr - bucket) < Math.abs(prev - bucket) ? curr : prev
      );
      
      buckets[validBucket].count++;
      if (l.status === 'error') buckets[validBucket].errors++;
      buckets[validBucket].totalLatency += (l.latency_ms || 0);
    });

    const sorted = Object.entries(buckets)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([ts, b]) => {
        // Normalize count to Requests Per Minute (RPM)
        const bucketMinutes = adjustedBucketMs / 60000;
        const rpm = bucketMinutes > 0 ? b.count / bucketMinutes : b.count;
        
        return {
          time: Number(ts),
          rpm: Number(rpm.toFixed(2)),
          errors: b.errors,
          avgLatency: b.count > 0 ? Math.round(b.totalLatency / b.count) : 0,
        };
      });

    const rpms = sorted.map(d => d.rpm);
    const avg = rpms.length > 0 ? rpms.reduce((s, r) => s + r, 0) / rpms.length : 0;
    const peak = Math.max(...rpms, 0);
    const peakEntry = sorted.find(d => d.rpm === peak);
    
    let peakTimeStr = '';
    if (peakEntry) {
        if (adjustedBucketMs >= 86400000) {
            peakTimeStr = new Date(peakEntry.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
            peakTimeStr = new Date(peakEntry.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
    }

    return { data: sorted, avgRPM: avg, peakRPM: peak, peakTime: peakTimeStr, totalReqs: logs.length };
  }, [logs]);

  // Check if there are any actual errors to render the error area
  const hasErrors = data.some(d => d.errors > 0);

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="panel">
      <div className="panel-header" style={{ flexShrink: 0 }}>
        <span className="panel-title">Throughput</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="tp-badge">Avg: <strong>{avgRPM.toFixed(1)}</strong> rpm</span>
          <span className="tp-badge peak">Peak: <strong>{peakRPM}</strong> rpm {peakTime && `@ ${peakTime}`}</span>
        </div>
      </div>

      {data.length > 0 ? (
        <div style={{ width: '100%', flex: 1, minHeight: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="tpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C8FF00" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#C8FF00" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="tpErrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#FF4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <XAxis dataKey="time" tickFormatter={fmtTime} tick={{ fill: '#666', fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis tick={{ fill: '#666', fontSize: 9 }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 11, padding: '8px 12px' }}
                labelFormatter={v => new Date(v).toLocaleString()}
                formatter={(v, n) => [v, n === 'rpm' ? 'Requests/min' : n === 'errors' ? 'Errors' : 'Avg Latency (ms)']}
              />
              <ReferenceLine y={avgRPM} stroke="#C8FF0044" strokeDasharray="4 4" label={false} />
              <Area type="monotone" dataKey="rpm" stroke="#C8FF00" fill="url(#tpGrad)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: '#C8FF00', stroke: '#000', strokeWidth: 1 }} />
              {hasErrors && (
                <Area type="monotone" dataKey="errors" stroke="#FF4444" fill="url(#tpErrGrad)" strokeWidth={1} dot={false} activeDot={{ r: 3, fill: '#FF4444', stroke: '#000', strokeWidth: 1 }} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state-mini">No throughput data</div>
      )}
    </div>
  );
}
