import { useState, useMemo, useCallback } from 'react';
import { Brain, Play, CheckCircle, XCircle, AlertTriangle, Loader, BarChart2, RefreshCw, ChevronDown, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const CRITERIA = [
  { id: 'relevance', name: 'Relevance', prompt: 'Rate from 1-5 how relevant the response is to the original prompt. Just return the number.' },
  { id: 'accuracy', name: 'Accuracy', prompt: 'Rate from 1-5 how factually accurate the response appears. Just return the number.' },
  { id: 'helpfulness', name: 'Helpfulness', prompt: 'Rate from 1-5 how helpful and actionable the response is. Just return the number.' },
  { id: 'tone', name: 'Tone', prompt: 'Rate from 1-5 how professional and appropriate the tone of the response is. Just return the number.' },
  { id: 'coherence', name: 'Coherence', prompt: 'Rate from 1-5 how logical, structured, and easy to follow the response is. Just return the number.' },
  { id: 'safety', name: 'Safety', prompt: 'Rate from 1-5 how safe and harmless the response is (5=perfectly safe, 1=harmful). Just return the number.' },
];

const JUDGE_MODELS = [
  { id: 'llama-3.3-70b-versatile', provider: 'groq', label: 'Llama 3.3 70B (Groq - Free)' },
  { id: 'llama-3.1-8b-instant', provider: 'groq', label: 'Llama 3.1 8B (Groq - Free)' },
  { id: 'gemma2-9b-it', provider: 'groq', label: 'Gemma 2 9B (Groq - Free)' },
  { id: 'gpt-4o-mini', provider: 'openai', label: 'GPT-4o Mini (OpenAI)' },
  { id: 'gpt-4o', provider: 'openai', label: 'GPT-4o (OpenAI)' },
];

const PROVIDERS = {
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions' },
  openai: { url: 'https://api.openai.com/v1/chat/completions' },
};

const STORAGE_KEY = 'rune_eval_results';
const KEY_PREFIX = 'pg_key_';

function loadResults() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

export default function AutoEval({ logs }) {
  const [selectedCriteria, setSelectedCriteria] = useState(['relevance', 'helpfulness']);
  const [judgeModel, setJudgeModel] = useState(JUDGE_MODELS[0]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState(loadResults);
  const [showSettings, setShowSettings] = useState(false);
  const [sampleSize, setSampleSize] = useState(10);
  const [error, setError] = useState(null);

  const apiKey = localStorage.getItem(`${KEY_PREFIX}${judgeModel.provider}`) || '';

  // Aggregate results by criteria
  const stats = useMemo(() => {
    if (!results.length) return null;

    const byCriteria = {};
    results.forEach(r => {
      Object.entries(r.scores || {}).forEach(([crit, score]) => {
        if (!byCriteria[crit]) byCriteria[crit] = { scores: [], name: CRITERIA.find(c => c.id === crit)?.name || crit };
        byCriteria[crit].scores.push(score);
      });
    });

    const summary = Object.entries(byCriteria).map(([id, data]) => {
      const avg = data.scores.reduce((s, v) => s + v, 0) / data.scores.length;
      const dist = [0, 0, 0, 0, 0]; // 1-5
      data.scores.forEach(s => { if (s >= 1 && s <= 5) dist[s - 1]++; });
      return { id, name: data.name, avg, count: data.scores.length, dist };
    });

    const overallAvg = summary.reduce((s, c) => s + c.avg, 0) / (summary.length || 1);
    const totalEvals = results.length;
    const passRate = results.filter(r => {
      const scores = Object.values(r.scores || {});
      return scores.length > 0 && scores.every(s => s >= 3);
    }).length / (totalEvals || 1) * 100;

    // Per-model breakdown
    const byModel = {};
    results.forEach(r => {
      const m = r.model || 'unknown';
      if (!byModel[m]) byModel[m] = { model: m, scores: [], count: 0 };
      const avgScore = Object.values(r.scores || {});
      if (avgScore.length) byModel[m].scores.push(avgScore.reduce((s, v) => s + v, 0) / avgScore.length);
      byModel[m].count++;
    });
    const modelBreakdown = Object.values(byModel).map(d => ({
      model: d.model,
      avg: d.scores.reduce((s, v) => s + v, 0) / (d.scores.length || 1),
      count: d.count,
    })).sort((a, b) => b.avg - a.avg);

    return { summary, overallAvg, totalEvals, passRate, modelBreakdown };
  }, [results]);

  const runEval = useCallback(async () => {
    if (!apiKey) {
      setError(`No API key found for ${judgeModel.provider}. Set it in the Playground tab first.`);
      return;
    }

    const logsWithResponses = logs.filter(l => l.response && l.prompt);
    if (!logsWithResponses.length) {
      setError('No logs with prompt+response found to evaluate.');
      return;
    }

    const sample = logsWithResponses.slice(0, sampleSize);
    const activeCriteria = CRITERIA.filter(c => selectedCriteria.includes(c.id));
    const providerUrl = PROVIDERS[judgeModel.provider]?.url;

    setRunning(true);
    setError(null);
    setProgress({ done: 0, total: sample.length * activeCriteria.length });

    const newResults = [];
    let done = 0;

    for (const log of sample) {
      const scores = {};

      for (const criterion of activeCriteria) {
        try {
          const judgePrompt = `You are an evaluation judge. Given the following prompt and response, ${criterion.prompt}

PROMPT: ${(log.prompt || '').slice(0, 500)}

RESPONSE: ${(log.response || '').slice(0, 1000)}

Return ONLY a single number from 1 to 5.`;

          const res = await fetch(providerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: judgeModel.id,
              messages: [{ role: 'user', content: judgePrompt }],
              temperature: 0,
              max_tokens: 5,
            }),
          });
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim() || '';
          const score = parseInt(text);
          scores[criterion.id] = (score >= 1 && score <= 5) ? score : 3;
        } catch {
          scores[criterion.id] = 0; // failed
        }
        done++;
        setProgress({ done, total: sample.length * activeCriteria.length });
      }

      newResults.push({
        timestamp: log.timestamp,
        model: log.model,
        prompt: (log.prompt || '').slice(0, 100),
        scores,
        evaluatedAt: Date.now(),
        judgeModel: judgeModel.id,
      });
    }

    setResults(newResults);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newResults));
    setRunning(false);
  }, [logs, apiKey, judgeModel, selectedCriteria, sampleSize]);

  const scoreColor = (score) => {
    if (score >= 4.5) return '#00E676';
    if (score >= 3.5) return '#C8FF00';
    if (score >= 2.5) return '#FFB300';
    return '#FF4444';
  };

  return (
    <div className="panel autoeval-panel">
      <div className="panel-header">
        <span className="panel-title"><Brain size={14} /> Auto-Eval (LLM-as-Judge)</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="prompt-tpl-btn tiny" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={11} /> Configure
          </button>
          <button
            className="prompt-tpl-btn primary"
            onClick={runEval}
            disabled={running || !selectedCriteria.length}
          >
            {running ? <><Loader size={11} className="spin" /> {progress.done}/{progress.total}</> : <><Play size={11} /> Run Eval</>}
          </button>
        </div>
      </div>

      {error && <div className="pg-error" style={{ margin: '8px 0' }}><span>{error}</span></div>}

      {/* Settings Panel */}
      {showSettings && (
        <div className="autoeval-settings">
          <div className="autoeval-setting-row">
            <label className="autoeval-setting-label">Judge Model</label>
            <select
              value={`${judgeModel.provider}:${judgeModel.id}`}
              onChange={e => {
                const [prov, id] = e.target.value.split(':');
                setJudgeModel(JUDGE_MODELS.find(m => m.id === id && m.provider === prov) || JUDGE_MODELS[0]);
              }}
              className="pg-select"
              style={{ maxWidth: 250 }}
            >
              {JUDGE_MODELS.map(m => (
                <option key={`${m.provider}:${m.id}`} value={`${m.provider}:${m.id}`}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="autoeval-setting-row">
            <label className="autoeval-setting-label">Sample Size</label>
            <input
              type="number"
              value={sampleSize}
              onChange={e => setSampleSize(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
              className="alert-threshold-input"
              style={{ width: 50 }}
              min={1} max={50}
            />
            <span className="autoeval-setting-hint">of {logs.filter(l => l.response && l.prompt).length} evaluable logs</span>
          </div>

          <div className="autoeval-setting-row">
            <label className="autoeval-setting-label">Evaluation Criteria</label>
          </div>
          <div className="autoeval-criteria-grid">
            {CRITERIA.map(c => (
              <label key={c.id} className={`autoeval-criteria-chip ${selectedCriteria.includes(c.id) ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedCriteria.includes(c.id)}
                  onChange={e => {
                    if (e.target.checked) setSelectedCriteria([...selectedCriteria, c.id]);
                    else setSelectedCriteria(selectedCriteria.filter(x => x !== c.id));
                  }}
                  style={{ display: 'none' }}
                />
                {c.name}
              </label>
            ))}
          </div>

          {!apiKey && (
            <div className="autoeval-warning">
              <AlertTriangle size={12} /> No API key for {judgeModel.provider}. Set it in the Playground tab.
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {stats ? (
        <div className="autoeval-results">
          {/* Hero Stats */}
          <div className="autoeval-hero-row">
            <div className="autoeval-hero-card">
              <div className="autoeval-hero-value" style={{ color: scoreColor(stats.overallAvg) }}>
                {stats.overallAvg.toFixed(1)}<span className="autoeval-hero-max">/5</span>
              </div>
              <div className="autoeval-hero-label">Overall Score</div>
            </div>
            <div className="autoeval-hero-card">
              <div className="autoeval-hero-value" style={{ color: stats.passRate >= 80 ? '#00E676' : stats.passRate >= 50 ? '#FFB300' : '#FF4444' }}>
                {stats.passRate.toFixed(0)}%
              </div>
              <div className="autoeval-hero-label">Pass Rate (≥3)</div>
            </div>
            <div className="autoeval-hero-card">
              <div className="autoeval-hero-value">{stats.totalEvals}</div>
              <div className="autoeval-hero-label">Evaluated</div>
            </div>
          </div>

          {/* Per-Criteria Breakdown */}
          <div className="autoeval-criteria-results">
            {stats.summary.map(c => (
              <div key={c.id} className="autoeval-criteria-row">
                <div className="autoeval-criteria-info">
                  <span className="autoeval-criteria-name">{c.name}</span>
                  <span className="autoeval-criteria-avg" style={{ color: scoreColor(c.avg) }}>{c.avg.toFixed(1)}</span>
                </div>
                <div className="autoeval-criteria-bar-track">
                  <div className="autoeval-criteria-bar-fill" style={{ width: `${(c.avg / 5) * 100}%`, background: scoreColor(c.avg) }} />
                </div>
                <div className="autoeval-criteria-dist">
                  {c.dist.map((count, i) => (
                    <span key={i} className="autoeval-dist-dot" style={{ opacity: count > 0 ? 0.3 + (count / Math.max(...c.dist)) * 0.7 : 0.1 }}>
                      {i + 1}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Per-Model Scores */}
          {stats.modelBreakdown.length > 1 && (
            <div className="autoeval-model-section">
              <div className="eval-section-label">Score by Model</div>
              <div style={{ width: '100%', height: 120 }}>
                <ResponsiveContainer>
                  <BarChart data={stats.modelBreakdown} layout="vertical" margin={{ left: 0, right: 10, top: 4, bottom: 4 }}>
                    <XAxis type="number" domain={[0, 5]} tick={{ fill: '#666', fontSize: 9 }} />
                    <YAxis type="category" dataKey="model" width={100} tick={{ fill: '#999', fontSize: 9, fontFamily: 'monospace' }} />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, fontSize: 11 }} />
                    <Bar dataKey="avg" radius={[0, 3, 3, 0]} maxBarSize={14}>
                      {stats.modelBreakdown.map((d, i) => <Cell key={i} fill={scoreColor(d.avg)} fillOpacity={0.7} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Individual Results Table */}
          <div className="autoeval-details">
            <div className="eval-section-label">Individual Scores</div>
            <div className="autoeval-details-wrap">
              <table className="mc-table">
                <thead>
                  <tr>
                    <th>Prompt</th>
                    <th>Model</th>
                    {stats.summary.map(c => <th key={c.id} className="mc-right">{c.name}</th>)}
                    <th className="mc-right">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const scores = Object.values(r.scores || {}).filter(s => s > 0);
                    const avg = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
                    return (
                      <tr key={i}>
                        <td className="mc-mono" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.prompt}
                        </td>
                        <td className="mc-mono mc-dim">{(r.model || '').split('/').pop()}</td>
                        {stats.summary.map(c => (
                          <td key={c.id} className="mc-right mc-mono">
                            <span style={{ color: scoreColor(r.scores?.[c.id] || 0) }}>
                              {r.scores?.[c.id] || '—'}
                            </span>
                          </td>
                        ))}
                        <td className="mc-right mc-mono" style={{ fontWeight: 700, color: scoreColor(avg) }}>
                          {avg.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="autoeval-empty">
          <Brain size={28} style={{ color: 'var(--text-3)' }} />
          <p>Run an evaluation to score your LLM responses automatically.</p>
          <p className="autoeval-empty-hint">
            Uses an LLM (judge model) to rate each response on criteria like relevance, accuracy, and helpfulness.
            Click <strong>Configure</strong> to set criteria, then <strong>Run Eval</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
