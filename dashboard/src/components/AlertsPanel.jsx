import { useState, useMemo } from 'react';
import { AlertTriangle, DollarSign, Zap, Bell, BellOff, TrendingUp } from 'lucide-react';

const DEFAULT_ALERTS = [
  { id: 'daily_cost', name: 'Daily Cost Limit', metric: 'daily_cost', threshold: 1.00, enabled: true },
  { id: 'monthly_cost', name: 'Monthly Cost Limit', metric: 'monthly_cost', threshold: 25.00, enabled: true },
  { id: 'error_rate', name: 'Error Rate Threshold', metric: 'error_rate', threshold: 5, enabled: true },
  { id: 'latency_p95', name: 'P95 Latency Threshold', metric: 'latency_p95', threshold: 3000, enabled: false },
  { id: 'rpm_spike', name: 'RPM Spike Alert', metric: 'rpm', threshold: 100, enabled: false },
];

export default function AlertsPanel({ logs }) {
  const [alerts, setAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rune_alerts')) || DEFAULT_ALERTS; }
    catch { return DEFAULT_ALERTS; }
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

    // RPM (last hour)
    const lastHour = logs.filter(l => (now - (l.timestamp || 0)) < 3600);
    const rpm = lastHour.length / 60;

    return { daily_cost: dailyCost, monthly_cost: monthlyCost, error_rate: errorRate, latency_p95: p95, rpm };
  }, [logs]);

  const getMetricValue = (metric) => metrics[metric] || 0;

  const getMetricLabel = (metric) => ({
    daily_cost: 'Daily Cost',
    monthly_cost: 'Monthly Cost',
    error_rate: 'Error Rate',
    latency_p95: 'P95 Latency',
    rpm: 'RPM',
  })[metric] || metric;

  const getMetricDisplay = (metric, value) => ({
    daily_cost: `$${value.toFixed(4)}`,
    monthly_cost: `$${value.toFixed(4)}`,
    error_rate: `${value.toFixed(1)}%`,
    latency_p95: `${value.toFixed(0)}ms`,
    rpm: `${value.toFixed(1)}/min`,
  })[metric] || value;

  const getThresholdDisplay = (metric, threshold) => ({
    daily_cost: `$${threshold.toFixed(2)}`,
    monthly_cost: `$${threshold.toFixed(2)}`,
    error_rate: `${threshold}%`,
    latency_p95: `${threshold}ms`,
    rpm: `${threshold}/min`,
  })[metric] || threshold;

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

  const triggered = alerts.filter(a => a.enabled && getMetricValue(a.metric) >= a.threshold);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Alerts & Budgets</span>
        {triggered.length > 0 && (
          <span className="alert-triggered-badge">
            <AlertTriangle size={11} /> {triggered.length} triggered
          </span>
        )}
      </div>

      {/* Triggered alerts */}
      {triggered.length > 0 && (
        <div className="alert-triggered-list">
          {triggered.map(a => {
            const val = getMetricValue(a.metric);
            const pct = Math.min((val / a.threshold) * 100, 200);
            return (
              <div key={a.id} className="alert-triggered-card">
                <AlertTriangle size={14} className="alert-icon" />
                <div className="alert-triggered-info">
                  <div className="alert-triggered-name">{a.name}</div>
                  <div className="alert-triggered-detail">
                    {getMetricDisplay(a.metric, val)} / {getThresholdDisplay(a.metric, a.threshold)}
                    <span className="alert-pct" style={{ color: pct > 100 ? 'var(--red)' : 'var(--amber)' }}>
                      ({pct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <div className="alert-gauge-mini">
                  <div className="alert-gauge-track">
                    <div className="alert-gauge-fill" style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: pct > 100 ? 'var(--red)' : pct > 80 ? 'var(--amber)' : 'var(--green)'
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All alerts list */}
      <div className="alert-config-list">
        {alerts.map(a => {
          const val = getMetricValue(a.metric);
          const pct = a.threshold > 0 ? (val / a.threshold) * 100 : 0;
          const isOver = pct >= 100;

          return (
            <div key={a.id} className={`alert-config-row ${a.enabled ? '' : 'disabled'}`}>
              <button className="alert-toggle" onClick={() => toggleAlert(a.id)}>
                {a.enabled ? <Bell size={13} /> : <BellOff size={13} />}
              </button>
              <div className="alert-config-info">
                <span className="alert-config-name">{a.name}</span>
                <div className="alert-config-gauge">
                  <div className="alert-gauge-track">
                    <div className="alert-gauge-fill" style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: !a.enabled ? 'var(--text-3)' : isOver ? 'var(--red)' : pct > 80 ? 'var(--amber)' : 'var(--lime)',
                      opacity: a.enabled ? 1 : 0.3,
                    }} />
                  </div>
                  <span className="alert-config-current">
                    {getMetricDisplay(a.metric, val)}
                  </span>
                </div>
              </div>
              <div className="alert-threshold-input-wrap">
                <input
                  type="number"
                  value={a.threshold}
                  onChange={e => updateThreshold(a.id, e.target.value)}
                  className="alert-threshold-input"
                  step={a.metric.includes('cost') ? 0.5 : a.metric.includes('rate') ? 1 : 100}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
