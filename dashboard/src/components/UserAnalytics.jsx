import { useMemo } from 'react';
import { User, DollarSign, Zap, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getModelColor } from './MetricCards';

const COLORS = ['#C8FF00', '#448AFF', '#FF6B35', '#00E676', '#B388FF', '#FFB300', '#00BCD4', '#FF4081'];

export default function UserAnalytics({ logs }) {
  const { users, topModels } = useMemo(() => {
    const map = {};
    const modelMap = {};

    logs.forEach(l => {
      const uid = l.user_id || 'anonymous';
      if (!map[uid]) map[uid] = { id: uid, requests: 0, cost: 0, tokens: 0, errors: 0, models: new Set(), lastActive: 0 };
      map[uid].requests++;
      map[uid].cost += (l.cost || 0);
      map[uid].tokens += (l.prompt_tokens || 0) + (l.completion_tokens || 0);
      if (l.status === 'error') map[uid].errors++;
      if (l.model) map[uid].models.add(l.model);
      map[uid].lastActive = Math.max(map[uid].lastActive, l.timestamp || 0);

      const m = l.model || 'unknown';
      if (!modelMap[m]) modelMap[m] = { model: m, users: new Set() };
      modelMap[m].users.add(uid);
    });

    const users = Object.values(map)
      .map(u => ({ ...u, models: u.models.size, errorRate: u.requests > 0 ? (u.errors / u.requests * 100) : 0 }))
      .sort((a, b) => b.cost - a.cost);

    const topModels = Object.values(modelMap)
      .map(m => ({ model: m.model, users: m.users.size }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 8);

    return { users, topModels };
  }, [logs]);

  const totalUsers = users.length;
  const totalCost = users.reduce((s, u) => s + u.cost, 0);
  const topUser = users[0];

  const barData = users.slice(0, 10).map(u => ({
    name: u.id === 'anonymous' ? 'anonymous' : u.id.slice(0, 12),
    cost: parseFloat(u.cost.toFixed(4)),
    requests: u.requests,
  }));

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">User Analytics</span>
        <span className="panel-subtitle">{totalUsers} user{totalUsers !== 1 ? 's' : ''}</span>
      </div>

      {/* Summary Cards */}
      <div className="ua-summary">
        <div className="ua-stat">
          <User size={13} />
          <div>
            <div className="ua-stat-value">{totalUsers}</div>
            <div className="ua-stat-label">Active Users</div>
          </div>
        </div>
        <div className="ua-stat">
          <DollarSign size={13} />
          <div>
            <div className="ua-stat-value">${totalCost.toFixed(4)}</div>
            <div className="ua-stat-label">Total Spend</div>
          </div>
        </div>
        <div className="ua-stat">
          <TrendingUp size={13} />
          <div>
            <div className="ua-stat-value">{topUser ? topUser.id.slice(0, 10) : '—'}</div>
            <div className="ua-stat-label">Top Spender</div>
          </div>
        </div>
      </div>

      {/* Cost by User Bar Chart */}
      {barData.length > 0 && (
        <div style={{ width: '100%', height: 150, marginTop: 8 }}>
          <ResponsiveContainer>
            <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10, top: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#999', fontSize: 10, fontFamily: 'monospace' }} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, fontSize: 11 }}
                formatter={(v, n) => [n === 'cost' ? `$${v}` : v, n === 'cost' ? 'Cost' : 'Requests']}
              />
              <Bar dataKey="cost" radius={[0, 3, 3, 0]} maxBarSize={14}>
                {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.7} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* User Table */}
      <div className="ua-table-wrap">
        <table className="mc-table ua-table">
          <thead>
            <tr>
              <th>User</th>
              <th className="mc-right">Requests</th>
              <th className="mc-right">Cost</th>
              <th className="mc-right">Tokens</th>
              <th className="mc-right">Errors</th>
              <th className="mc-right">Models</th>
            </tr>
          </thead>
          <tbody>
            {users.slice(0, 15).map(u => (
              <tr key={u.id}>
                <td className="mc-mono" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.id === 'anonymous' ? <span style={{ color: 'var(--text-3)' }}>anonymous</span> : u.id.slice(0, 16)}
                </td>
                <td className="mc-right mc-mono">{u.requests.toLocaleString()}</td>
                <td className="mc-right mc-mono">${u.cost.toFixed(4)}</td>
                <td className="mc-right mc-mono mc-dim">{u.tokens.toLocaleString()}</td>
                <td className="mc-right mc-mono">
                  <span className={u.errorRate > 5 ? 'mc-bad' : u.errorRate > 0 ? 'mc-warn' : 'mc-good'}>
                    {u.errors}
                  </span>
                </td>
                <td className="mc-right mc-mono mc-dim">{u.models}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
