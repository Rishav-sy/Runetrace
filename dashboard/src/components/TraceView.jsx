import { useState, useMemo } from 'react';
import { Search, ChevronRight, Clock, DollarSign, Hash, Cpu, CheckCircle, XCircle, Copy, Check } from 'lucide-react';
import { getModelColor } from './MetricCards';

const MODEL_COLORS = {
  'gpt-4o': '#C8FF00',
  'gpt-4o-mini': '#448AFF',
  'claude-3.5-sonnet': '#FF6B35',
  'claude-3.5-haiku': '#00E676',
  'gemini-2.0-flash': '#B388FF',
  'deepseek-v3': '#FFB300',
  'llama-3.3-70b-versatile': '#00BCD4',
};

function getColor(model) {
  return MODEL_COLORS[model] || getModelColor(model) || '#888';
}

function fmt(ts) {
  return new Date(ts * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

/* Group logs into traces by function_name proximity in time (session simulation) */
function groupIntoTraces(logs) {
  if (!logs.length) return [];

  const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
  const traces = [];
  let current = null;

  sorted.forEach(log => {
    // Group logs within 10 seconds of each other as a "trace"
    const sessionKey = log.session_id || log.trace_id || null;

    if (sessionKey) {
      // If the log has a session/trace ID, group by that
      const existing = traces.find(t => t.id === sessionKey);
      if (existing) {
        existing.steps.push(log);
        existing.totalCost += (log.cost || 0);
        existing.totalTokens += (log.prompt_tokens || 0) + (log.completion_tokens || 0);
        existing.totalLatency += (log.latency_ms || 0);
        existing.hasError = existing.hasError || log.status === 'error';
        existing.startTime = Math.min(existing.startTime, log.timestamp);
        existing.endTime = Math.max(existing.endTime, log.timestamp + (log.latency_ms || 0) / 1000);
      } else {
        traces.push({
          id: sessionKey,
          name: sessionKey.slice(0, 16),
          steps: [log],
          totalCost: log.cost || 0,
          totalTokens: (log.prompt_tokens || 0) + (log.completion_tokens || 0),
          totalLatency: log.latency_ms || 0,
          hasError: log.status === 'error',
          startTime: log.timestamp,
          endTime: log.timestamp + (log.latency_ms || 0) / 1000,
          timestamp: log.timestamp,
        });
      }
    } else {
      // Auto-group by time proximity (within 60 seconds)
      if (current && Math.abs(log.timestamp - current.timestamp) < 60) {
        current.steps.push(log);
        current.totalCost += (log.cost || 0);
        current.totalTokens += (log.prompt_tokens || 0) + (log.completion_tokens || 0);
        current.totalLatency += (log.latency_ms || 0);
        current.hasError = current.hasError || log.status === 'error';
        current.startTime = Math.min(current.startTime, log.timestamp);
        current.endTime = Math.max(current.endTime, log.timestamp + (log.latency_ms || 0) / 1000);
      } else {
        current = {
          id: `auto-${log.timestamp}`,
          name: log.function_name || 'trace',
          steps: [log],
          totalCost: log.cost || 0,
          totalTokens: (log.prompt_tokens || 0) + (log.completion_tokens || 0),
          totalLatency: log.latency_ms || 0,
          hasError: log.status === 'error',
          startTime: log.timestamp,
          endTime: log.timestamp + (log.latency_ms || 0) / 1000,
          timestamp: log.timestamp,
        };
        traces.push(current);
      }
    }
  });

  // Sort steps within each trace by timestamp
  traces.forEach(t => {
    t.steps.sort((a, b) => a.timestamp - b.timestamp);
    t.duration = ((t.endTime - t.startTime) * 1000) || t.totalLatency;
  });

  return traces;
}


export default function TraceView({ logs }) {
  const [search, setSearch] = useState('');
  const [selectedTraceId, setSelectedTraceId] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});
  const [copied, setCopied] = useState(null);

  const traces = useMemo(() => groupIntoTraces(logs), [logs]);

  const filtered = useMemo(() => {
    if (!search) return traces;
    const q = search.toLowerCase();
    return traces.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.steps.some(s => (s.function_name || '').toLowerCase().includes(q) || (s.model || '').toLowerCase().includes(q))
    );
  }, [traces, search]);

  const selectedTrace = useMemo(() =>
    filtered.find(t => t.id === selectedTraceId) || filtered[0] || null,
    [filtered, selectedTraceId]
  );

  const toggleStep = (idx) => {
    setExpandedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const maxLatency = selectedTrace
    ? Math.max(...selectedTrace.steps.map(s => s.latency_ms || 0), 1)
    : 1;

  return (
    <div className="trace-layout">
      {/* Sidebar */}
      <div className="trace-sidebar">
        <div className="trace-sidebar-header">
          <span className="trace-sidebar-title">Traces</span>
          <span className="trace-sidebar-count">{filtered.length}</span>
        </div>
        <div className="trace-search-wrap">
          <Search size={12} />
          <input
            type="text"
            placeholder="Search traces..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="trace-search-input"
          />
        </div>
        <div className="trace-list">
          {filtered.map(t => (
            <div
              key={t.id}
              className={`trace-item ${selectedTrace?.id === t.id ? 'active' : ''}`}
              onClick={() => setSelectedTraceId(t.id)}
            >
              <div className="trace-item-top">
                <div className={`trace-status-dot ${t.hasError ? 'error' : 'success'}`} />
                <span className="trace-item-name">{t.name}</span>
                <ChevronRight size={12} className="trace-item-arrow" />
              </div>
              <div className="trace-item-meta">
                <span>{t.steps.length} call{t.steps.length !== 1 ? 's' : ''}</span>
                <span>{t.duration.toFixed(0)}ms</span>
                <span>${(t.totalCost || 0).toFixed(5)}</span>
              </div>
              <div className="trace-item-time">{fmt(t.timestamp)}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="trace-empty">No traces found</div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="trace-main">
        {selectedTrace ? (
          <>
            {/* Trace header */}
            <div className="trace-header">
              <div className="trace-header-title">
                <div className={`trace-status-dot ${selectedTrace.hasError ? 'error' : 'success'}`} />
                <span>{selectedTrace.name}</span>
                <span className="trace-header-id">{selectedTrace.id.slice(0, 24)}</span>
              </div>
              <div className="trace-header-stats">
                <div className="trace-stat">
                  <Clock size={12} />
                  <span>{selectedTrace.duration.toFixed(0)}ms</span>
                </div>
                <div className="trace-stat">
                  <DollarSign size={12} />
                  <span>${(selectedTrace.totalCost || 0).toFixed(6)}</span>
                </div>
                <div className="trace-stat">
                  <Hash size={12} />
                  <span>{selectedTrace.totalTokens.toLocaleString()} tokens</span>
                </div>
                <div className="trace-stat">
                  <Cpu size={12} />
                  <span>{selectedTrace.steps.length} calls</span>
                </div>
              </div>
            </div>

            {/* Waterfall */}
            <div className="trace-waterfall">
              <div className="waterfall-header">
                <span className="waterfall-col-name">Function</span>
                <span className="waterfall-col-model">Model</span>
                <span className="waterfall-col-bar">Latency</span>
                <span className="waterfall-col-cost">Cost</span>
              </div>
              {selectedTrace.steps.map((step, idx) => {
                const barWidth = Math.max(4, ((step.latency_ms || 0) / maxLatency) * 100);
                const isError = step.status === 'error';
                const expanded = expandedSteps[idx];
                const color = isError ? 'var(--red)' : getColor(step.model);

                return (
                  <div key={idx} className="waterfall-row-group">
                    <div
                      className={`waterfall-row ${expanded ? 'expanded' : ''}`}
                      onClick={() => toggleStep(idx)}
                    >
                      <span className="waterfall-col-name">
                        <ChevronRight size={11} className={`waterfall-chevron ${expanded ? 'open' : ''}`} />
                        {step.function_name || 'unknown'}
                      </span>
                      <span className="waterfall-col-model" style={{ color }}>
                        {step.model || '—'}
                      </span>
                      <span className="waterfall-col-bar">
                        <div className="waterfall-bar-track">
                          <div
                            className="waterfall-bar-fill"
                            style={{ width: `${barWidth}%`, background: color }}
                          />
                        </div>
                        <span className="waterfall-bar-label">{(step.latency_ms || 0).toFixed(0)}ms</span>
                      </span>
                      <span className="waterfall-col-cost">
                        {isError ? (
                          <XCircle size={12} style={{ color: 'var(--red)' }} />
                        ) : (
                          `$${(step.cost || 0).toFixed(5)}`
                        )}
                      </span>
                    </div>

                    {/* Expanded detail */}
                    {expanded && (
                      <div className="waterfall-detail">
                        <div className="waterfall-detail-meta">
                          <span>Tokens: {(step.prompt_tokens || 0)} in / {(step.completion_tokens || 0)} out</span>
                          <span>{fmt(step.timestamp)}</span>
                        </div>
                        {step.prompt && (
                          <div className="waterfall-detail-section">
                            <div className="waterfall-detail-label">
                              Prompt
                              <button className="copy-btn" onClick={() => copy(step.prompt, `prompt-${idx}`)}>
                                {copied === `prompt-${idx}` ? <Check size={10} /> : <Copy size={10} />}
                              </button>
                            </div>
                            <div className="waterfall-detail-code">{step.prompt}</div>
                          </div>
                        )}
                        {step.response && (
                          <div className="waterfall-detail-section">
                            <div className="waterfall-detail-label">
                              Response
                              <button className="copy-btn" onClick={() => copy(step.response, `resp-${idx}`)}>
                                {copied === `resp-${idx}` ? <Check size={10} /> : <Copy size={10} />}
                              </button>
                            </div>
                            <div className="waterfall-detail-code">{step.response}</div>
                          </div>
                        )}
                        {isError && step.error_message && (
                          <div className="waterfall-detail-section">
                            <div className="waterfall-detail-label error">Error</div>
                            <div className="waterfall-detail-code error">{step.error_message}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="trace-empty-main">
            <span>Select a trace to inspect</span>
          </div>
        )}
      </div>
    </div>
  );
}
