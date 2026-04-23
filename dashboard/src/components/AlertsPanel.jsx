import { useState, useMemo } from 'react';
import { AlertTriangle, Bell, BellOff, DollarSign, Percent, Clock, Activity } from 'lucide-react';

const DEFAULT_ALERTS = [
  { id: 'daily_cost', name: 'Daily Cost', metric: 'daily_cost', threshold: 1.00, enabled: true, icon: 'dollar', unit: '$' },
  { id: 'monthly_cost', name: 'Monthly Budget', metric: 'monthly_cost', threshold: 25.00, enabled: true, icon: 'dollar', unit: '$' },
  { id: 'error_rate', name: 'Error Rate', metric: 'error_rate', threshold: 5, enabled: true, icon: 'percent', unit: '%' },
  { id: 'latency_p95', name: 'P95 Latency', metric: 'latency_p95', threshold: 3000, enabled: false, icon: 'clock', unit: 'ms' },
  { id: 'rpm_spike', name: 'RPM Spike', metric: 'rpm', threshold: 100, enabled: false, icon: 'activity', unit: '/min' },
];

const ICONS = {
  dollar: DollarSign,
  percent: Percent,
  clock: Clock,
  activity: Activity,
};

export default function AlertsPanel({ logs }) {
  const [alerts, setAlerts] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('rune_alerts'));
      // Merge saved values with defaults to pick up any new icon/unit fields
      if (saved) return DEFAULT_ALERTS.map(d => {
        const s = saved.find(x => x.id === d.id);
        return s ? { ...d, threshold: s.threshold, enabled: s.enabled } : d;
      });
      return DEFAULT_ALERTS;
    } catch { return DEFAULT_ALERTS; }
  });

  const metrics = useMemo(() => {
    const now = Date.now() / 1000;
    const day = logs.filter(l => (now - (l.timestamp || 0)) < 86400);
    const month = logs.filter(l => (now - (l.timestamp || 0)) < 2592000);

    const dailyCost = day.reduce((s, l) => s + (l.cost || 0), 0);
    const monthlyCost = month.reduce((s, l) => s + (l.cost || 0), 0);
    const errorRate = logs.length > 0 ? (logs.filter(l => l.status === 'error').length / logs.length * 100) : 0;

    const latencies = logs.map(l => l.latency_ms || 0).sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;

    const lastHour = logs.filter(l => (now - (l.timestamp || 0)) < 3600);
    const rpm = lastHour.length / 60;

    return { daily_cost: dailyCost, monthly_cost: monthlyCost, error_rate: errorRate, latency_p95: p95, rpm };
  }, [logs]);

  const getVal = (metric) => metrics[metric] || 0;

  const fmtVal = (metric, value) => ({
    daily_cost: `$${value.toFixed(4)}`,
    monthly_cost: `$${value.toFixed(2)}`,
    error_rate: `${value.toFixed(1)}%`,
    latency_p95: `${value.toFixed(0)}ms`,
    rpm: `${value.toFixed(1)}/min`,
  })[metric] || String(value);

  const fmtThreshold = (metric, threshold) => ({
    daily_cost: `$${threshold.toFixed(2)}`,
    monthly_cost: `$${threshold.toFixed(2)}`,
    error_rate: `${threshold}%`,
    latency_p95: `${threshold}ms`,
    rpm: `${threshold}/min`,
  })[metric] || String(threshold);

  const toggleAlert = (id) => {
    const next = alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
    setAlerts(next);
    localStorage.setItem('rune_alerts', JSON.stringify(next));
  };

  const updateThreshold = (id, value) => {
    const next = alerts.map(a => a.id === id ? { ...a, threshold: parseFloat(value) || 0 } : a);
    setAlerts(next);
    localStorage.setItem('rune_alerts', JSON.stringify(next));
  };

  const triggered = alerts.filter(a => a.enabled && getVal(a.metric) >= a.threshold);

  return (
    <div className="panel">
      <div className="panel-header" style={{ flexShrink: 0 }}>
        <span className="panel-title">Alerts & Budgets</span>
        {triggered.length > 0 ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 700, color: '#FF4444',
            background: 'rgba(255,68,68,0.12)', padding: '2px 8px', borderRadius: 4,
          }}>
            <AlertTriangle size={11} /> {triggered.length} triggered
          </span>
        ) : (
          <span style={{
            fontSize: 10, color: 'var(--green)', fontWeight: 600,
            background: 'rgba(0,230,118,0.08)', padding: '2px 8px', borderRadius: 4,
          }}>
            All clear
          </span>
        )}
      </div>

      {/* Alert rows */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        {alerts.map(a => {
          const val = getVal(a.metric);
          const pct = a.threshold > 0 ? (val / a.threshold) * 100 : 0;
          const isOver = pct >= 100;
          const isWarn = pct >= 80;
          const Icon = ICONS[a.icon] || Activity;

          const barColor = !a.enabled
            ? 'rgba(255,255,255,0.08)'
            : isOver ? '#FF4444'
            : isWarn ? '#FFB300'
            : '#C8FF00';

          return (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8,
              background: a.enabled && isOver ? 'rgba(255,68,68,0.06)' : 'transparent',
              border: a.enabled && isOver ? '1px solid rgba(255,68,68,0.15)' : '1px solid transparent',
              opacity: a.enabled ? 1 : 0.45,
              transition: 'all 0.15s ease',
            }}>
              {/* Toggle */}
              <button
                onClick={() => toggleAlert(a.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: a.enabled ? 'var(--lime)' : 'var(--text-3)',
                  padding: 0, display: 'flex', flexShrink: 0,
                }}
                title={a.enabled ? 'Disable alert' : 'Enable alert'}
              >
                {a.enabled ? <Bell size={14} /> : <BellOff size={14} />}
              </button>

              {/* Icon */}
              <div style={{
                width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                background: 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: a.enabled ? barColor : 'var(--text-3)',
              }}>
                <Icon size={14} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  marginBottom: 4,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{a.name}</span>
                  <span style={{
                    fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 600,
                    color: a.enabled ? (isOver ? '#FF4444' : isWarn ? '#FFB300' : 'var(--text-2)') : 'var(--text-3)',
                  }}>
                    {fmtVal(a.metric, val)}
                    <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> / {fmtThreshold(a.metric, a.threshold)}</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{
                  width: '100%', height: 4, background: 'rgba(255,255,255,0.06)',
                  borderRadius: 2, overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.min(pct, 100)}%`,
                    height: '100%', borderRadius: 2,
                    background: barColor,
                    transition: 'width 0.4s ease, background 0.3s ease',
                  }} />
                </div>
              </div>

              {/* Threshold stepper */}
              {(() => {
                const step = a.metric.includes('cost') ? 0.5 : a.metric.includes('rate') ? 1 : 100;
                return (
                  <div style={{
                    display: 'flex', alignItems: 'center', flexShrink: 0,
                    border: '1px solid var(--border)', borderRadius: 6,
                    overflow: 'hidden', background: 'var(--bg-primary)',
                  }}>
                    <button
                      onClick={() => updateThreshold(a.id, Math.max(0, a.threshold - step))}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text-3)',
                        cursor: 'pointer', padding: '4px 6px', fontSize: 12,
                        lineHeight: 1, display: 'flex', alignItems: 'center',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                    >−</button>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={a.threshold}
                      onChange={e => updateThreshold(a.id, e.target.value)}
                      style={{
                        width: 42, background: 'transparent',
                        border: 'none', borderLeft: '1px solid var(--border)',
                        borderRight: '1px solid var(--border)',
                        color: 'var(--text)', fontSize: 10, fontFamily: 'var(--mono)',
                        padding: '4px 2px', textAlign: 'center', outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => updateThreshold(a.id, a.threshold + step)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text-3)',
                        cursor: 'pointer', padding: '4px 6px', fontSize: 12,
                        lineHeight: 1, display: 'flex', alignItems: 'center',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                    >+</button>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
