import { useMemo } from 'react';
import { ThumbsUp, ThumbsDown, Tag, Star, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function EvaluationScores({ logs }) {
  const scores = useMemo(() => {
    let up = 0, down = 0, total = 0, tagged = 0;
    const tagCounts = {};
    const modelScores = {};

    logs.forEach(l => {
      const key = `rune_ann_${l.project_id || 'default'}_${l.timestamp}`;
      let ann;
      try { ann = JSON.parse(localStorage.getItem(key)); } catch { ann = null; }
      if (!ann) return;

      total++;
      if (ann.rating === 'up') up++;
      if (ann.rating === 'down') down++;
      if (ann.tags?.length) {
        tagged++;
        ann.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
      }

      // Per-model scoring
      const m = l.model || 'unknown';
      if (!modelScores[m]) modelScores[m] = { model: m, up: 0, down: 0, total: 0 };
      modelScores[m].total++;
      if (ann.rating === 'up') modelScores[m].up++;
      if (ann.rating === 'down') modelScores[m].down++;
    });

    const unrated = total - up - down;
    const satisfaction = total > 0 ? ((up / (up + down || 1)) * 100) : 0;
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const modelList = Object.values(modelScores).sort((a, b) => b.total - a.total);

    return { up, down, total, unrated, tagged, satisfaction, topTags, modelList };
  }, [logs]);

  const pieData = [
    { name: 'Positive', value: scores.up, color: '#00E676' },
    { name: 'Negative', value: scores.down, color: '#FF4444' },
    { name: 'Unrated', value: Math.max(0, scores.total - scores.up - scores.down), color: '#333' },
  ].filter(d => d.value > 0);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Evaluation & Feedback</span>
        <span className="panel-subtitle">{scores.total} annotated</span>
      </div>

      {scores.total === 0 ? (
        <div className="empty-state-mini">
          No annotations yet. Click a log entry and use 👍/👎 to start evaluating responses.
        </div>
      ) : (
        <>
          {/* Score Summary */}
          <div className="eval-summary">
            <div className="eval-score-hero">
              <div className="eval-score-ring">
                <div style={{ width: 80, height: 80 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} innerRadius={25} outerRadius={35} dataKey="value" strokeWidth={0}>
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="eval-score-center">
                  <span className="eval-pct">{scores.satisfaction.toFixed(0)}%</span>
                </div>
              </div>
              <span className="eval-score-label">Satisfaction</span>
            </div>

            <div className="eval-counts">
              <div className="eval-count-row">
                <ThumbsUp size={13} style={{ color: '#00E676' }} />
                <span className="eval-count-value">{scores.up}</span>
                <span className="eval-count-label">Positive</span>
              </div>
              <div className="eval-count-row">
                <ThumbsDown size={13} style={{ color: '#FF4444' }} />
                <span className="eval-count-value">{scores.down}</span>
                <span className="eval-count-label">Negative</span>
              </div>
              <div className="eval-count-row">
                <Tag size={13} style={{ color: 'var(--text-3)' }} />
                <span className="eval-count-value">{scores.tagged}</span>
                <span className="eval-count-label">Tagged</span>
              </div>
            </div>
          </div>

          {/* Top Tags */}
          {scores.topTags.length > 0 && (
            <div className="eval-tags-section">
              <span className="eval-section-label">Top Tags</span>
              <div className="eval-tag-list">
                {scores.topTags.map(([tag, count]) => (
                  <span key={tag} className="eval-tag-chip">
                    {tag} <span className="eval-tag-count">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Per-Model Scores */}
          {scores.modelList.length > 0 && (
            <div className="eval-model-section">
              <span className="eval-section-label">By Model</span>
              {scores.modelList.map(m => {
                const sat = m.up + m.down > 0 ? (m.up / (m.up + m.down)) * 100 : 0;
                return (
                  <div key={m.model} className="eval-model-row">
                    <span className="eval-model-name">{m.model}</span>
                    <div className="eval-model-bar-track">
                      <div className="eval-model-bar-up" style={{ width: `${m.total > 0 ? (m.up / m.total) * 100 : 0}%` }} />
                      <div className="eval-model-bar-down" style={{ width: `${m.total > 0 ? (m.down / m.total) * 100 : 0}%` }} />
                    </div>
                    <span className="eval-model-pct">{sat.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
