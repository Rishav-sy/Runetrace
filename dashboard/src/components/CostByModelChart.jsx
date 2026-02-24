import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './CostByModelChart.css';

const MODEL_COLORS = [
  '#34d399', '#60a5fa', '#a78bfa', '#fbbf24', '#f472b6',
  '#fb923c', '#38bdf8', '#c084fc', '#4ade80', '#f87171'
];

export default function CostByModelChart({ logs }) {
  // Group cost by model
  const costByModel = {};
  logs.forEach(log => {
    const model = log.model || 'unknown';
    costByModel[model] = (costByModel[model] || 0) + (log.cost || 0);
  });

  const data = Object.entries(costByModel)
    .map(([model, cost]) => ({ model, cost: parseFloat(cost.toFixed(6)) }))
    .sort((a, b) => b.cost - a.cost);

  if (data.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Cost by Model</h3>
        <div className="chart-empty">No data yet — send some LLM requests!</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Cost by Model</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="model"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              angle={-25}
              textAnchor="end"
              height={60}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#f1f5f9',
                fontSize: '0.85rem'
              }}
              formatter={(value) => [`$${value.toFixed(6)}`, 'Cost']}
            />
            <Bar dataKey="cost" radius={[8, 8, 0, 0]} maxBarSize={60}>
              {data.map((_, index) => (
                <Cell key={index} fill={MODEL_COLORS[index % MODEL_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
