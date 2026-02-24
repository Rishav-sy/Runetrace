import { DollarSign, Activity, Clock, Zap } from 'lucide-react';
import './MetricCards.css';

export default function MetricCards({ logs }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime() / 1000;

  const todayLogs = logs.filter(log => log.timestamp >= todayTimestamp);

  const totalCost = todayLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
  const totalRequests = todayLogs.length;
  const avgLatency = totalRequests > 0
    ? todayLogs.reduce((sum, log) => sum + (log.latency_ms || 0), 0) / totalRequests
    : 0;
  const totalTokens = todayLogs.reduce((sum, log) => sum + (log.prompt_tokens || 0) + (log.completion_tokens || 0), 0);

  const cards = [
    {
      title: 'Cost Today',
      value: `$${totalCost.toFixed(4)}`,
      icon: DollarSign,
      gradient: 'gradient-emerald',
      subtitle: `${totalRequests} request${totalRequests !== 1 ? 's' : ''}`
    },
    {
      title: 'Requests Today',
      value: totalRequests.toLocaleString(),
      icon: Activity,
      gradient: 'gradient-blue',
      subtitle: `${totalTokens.toLocaleString()} total tokens`
    },
    {
      title: 'Avg Latency',
      value: `${avgLatency.toFixed(0)}ms`,
      icon: Clock,
      gradient: 'gradient-amber',
      subtitle: avgLatency < 500 ? 'Excellent' : avgLatency < 1000 ? 'Good' : 'Slow'
    },
    {
      title: 'Models Used',
      value: [...new Set(todayLogs.map(l => l.model))].length,
      icon: Zap,
      gradient: 'gradient-violet',
      subtitle: [...new Set(todayLogs.map(l => l.model))].join(', ') || 'None'
    }
  ];

  return (
    <div className="metric-cards">
      {cards.map((card) => (
        <div key={card.title} className={`metric-card ${card.gradient}`}>
          <div className="metric-card-header">
            <span className="metric-card-title">{card.title}</span>
            <card.icon className="metric-card-icon" size={20} />
          </div>
          <div className="metric-card-value">{card.value}</div>
          <div className="metric-card-subtitle">{card.subtitle}</div>
        </div>
      ))}
    </div>
  );
}
