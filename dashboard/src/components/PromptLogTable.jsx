import { useState, useMemo, useCallback, Fragment } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronsUpDown, CheckCircle, XCircle, Filter, X, Copy, Check, Clock, DollarSign, Cpu, Hash, ArrowRight, Download, ThumbsUp, ThumbsDown, Tag, Database } from 'lucide-react';
import { getModelColor } from './MetricCards';
import { DATASETS_STORAGE_KEY, loadDatasets } from './DatasetsView';

const PAGE_SIZE = 25;

/* ═══ Annotations Helper ═══ */
function getAnnotationKey(log) {
  return `rune_ann_${log.project_id || 'default'}_${log.timestamp}`;
}

function getAnnotation(log) {
  try {
    return JSON.parse(localStorage.getItem(getAnnotationKey(log))) || {};
  } catch { return {}; }
}

function saveAnnotation(log, data) {
  localStorage.setItem(getAnnotationKey(log), JSON.stringify(data));
}

/* ═══ Detail Drawer ═══ */
function DetailDrawer({ log, onClose }) {
  const [copied, setCopied] = useState(null);
  const [annotation, setAnnotation] = useState(() => getAnnotation(log));
  const [tagInput, setTagInput] = useState('');
  
  // Datasets
  const [showDsModal, setShowDsModal] = useState(false);
  const [datasets] = useState(loadDatasets);
  const [selectedDs, setSelectedDs] = useState('');

  if (!log) return null;

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const isError = log.status === 'error';
  const fmt = (ts) => new Date(ts * 1000).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">
            {isError
              ? <XCircle size={16} style={{ color: 'var(--red)' }} />
              : <CheckCircle size={16} style={{ color: 'var(--green)' }} />
            }
            <span>{log.function_name || 'Unknown function'}</span>
          </div>
          <button className="drawer-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Meta grid */}
          <div className="drawer-meta-grid">
            <div className="drawer-meta">
              <Clock size={12} />
              <span className="drawer-meta-label">Time</span>
              <span className="drawer-meta-value">{fmt(log.timestamp)}</span>
            </div>
            <div className="drawer-meta">
              <Cpu size={12} />
              <span className="drawer-meta-label">Model</span>
              <span className="drawer-meta-value" style={{ color: getModelColor(log.model) }}>{log.model}</span>
            </div>
            <div className="drawer-meta">
              <DollarSign size={12} />
              <span className="drawer-meta-label">Cost</span>
              <span className="drawer-meta-value">{isError ? '—' : `$${(log.cost || 0).toFixed(6)}`}</span>
            </div>
            <div className="drawer-meta">
              <Clock size={12} />
              <span className="drawer-meta-label">Latency</span>
              <span className="drawer-meta-value" style={{
                color: (log.latency_ms || 0) < 500 ? 'var(--green)' : (log.latency_ms || 0) < 1500 ? 'var(--amber)' : 'var(--red)'
              }}>{(log.latency_ms || 0).toFixed(0)}ms</span>
            </div>
            <div className="drawer-meta">
              <Hash size={12} />
              <span className="drawer-meta-label">Prompt tokens</span>
              <span className="drawer-meta-value">{(log.prompt_tokens || 0).toLocaleString()}</span>
            </div>
            <div className="drawer-meta">
              <Hash size={12} />
              <span className="drawer-meta-label">Completion tokens</span>
              <span className="drawer-meta-value">{(log.completion_tokens || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Status */}
          <div className={`drawer-status ${isError ? 'error' : 'success'}`}>
            {isError ? '✗ Error' : '✓ Success'}
          </div>

          {/* Error */}
          {isError && log.error_message && (
            <div className="drawer-section">
              <div className="drawer-section-header error">
                <span>Error Message</span>
              </div>
              <div className="drawer-code error">{log.error_message}</div>
            </div>
          )}

          {/* Prompt */}
          <div className="drawer-section">
            <div className="drawer-section-header">
              <span>Prompt</span>
              <button className="copy-btn" onClick={() => copy(log.prompt || '', 'prompt')}>
                {copied === 'prompt' ? <Check size={12} /> : <Copy size={12} />}
                {copied === 'prompt' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="drawer-code">{log.prompt || '(empty)'}</div>
          </div>

          {/* Response */}
          {!isError && (
            <div className="drawer-section">
              <div className="drawer-section-header">
                <span>Response</span>
                <button className="copy-btn" onClick={() => copy(log.response || '', 'response')}>
                  {copied === 'response' ? <Check size={12} /> : <Copy size={12} />}
                  {copied === 'response' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="drawer-code">{log.response || '(no response captured)'}</div>
            </div>
          )}

          {/* Annotations */}
          <div className="drawer-section">
            <div className="drawer-section-header">
              <span>Feedback & Testing</span>
            </div>
            <div className="annotation-controls" style={{ marginBottom: 12 }}>
              <button
                className={`ann-btn`}
                onClick={() => setShowDsModal(true)}
              >
                <Database size={14} /> Save to Dataset
              </button>
            </div>
            <div className="annotation-controls">
              <button
                className={`ann-btn ${annotation.rating === 'up' ? 'active-up' : ''}`}
                onClick={() => {
                  const next = { ...annotation, rating: annotation.rating === 'up' ? null : 'up' };
                  setAnnotation(next);
                  saveAnnotation(log, next);
                }}
              >
                <ThumbsUp size={14} /> Good
              </button>
              <button
                className={`ann-btn ${annotation.rating === 'down' ? 'active-down' : ''}`}
                onClick={() => {
                  const next = { ...annotation, rating: annotation.rating === 'down' ? null : 'down' };
                  setAnnotation(next);
                  saveAnnotation(log, next);
                }}
              >
                <ThumbsDown size={14} /> Bad
              </button>
            </div>
            <div className="annotation-tags">
              {(annotation.tags || []).map(tag => (
                <span key={tag} className="ann-tag">
                  {tag}
                  <button onClick={() => {
                    const next = { ...annotation, tags: annotation.tags.filter(t => t !== tag) };
                    setAnnotation(next);
                    saveAnnotation(log, next);
                  }}>×</button>
                </span>
              ))}
              <form className="ann-tag-form" onSubmit={e => {
                e.preventDefault();
                if (!tagInput.trim()) return;
                const tags = [...(annotation.tags || []), tagInput.trim()];
                const next = { ...annotation, tags: [...new Set(tags)] };
                setAnnotation(next);
                saveAnnotation(log, next);
                setTagInput('');
              }}>
                <Tag size={11} />
                <input
                  type="text"
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  className="ann-tag-input"
                />
              </form>
            </div>
          </div>
        </div>

        {/* Dataset Save Modal (layered above drawer) */}
        {showDsModal && (
          <div className="drawer-overlay" onClick={() => setShowDsModal(false)} style={{ zIndex: 1100 }}>
            <div className="pg-modal" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
              <h3>Save to Dataset</h3>
              <p>Add this log as a golden test case to a dataset.</p>
              
              <label className="pg-label" style={{ marginTop: 12 }}>Select Dataset</label>
              {datasets.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--amber)', margin: '8px 0' }}>No datasets exist yet. Go to the Datasets tab to create one.</div>
              ) : (
                <select className="pg-select" value={selectedDs} onChange={e => setSelectedDs(e.target.value)}>
                  <option value="">-- Choose Dataset --</option>
                  {datasets.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.rows?.length || 0} rows)</option>
                  ))}
                </select>
              )}

              <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="prompt-tpl-btn secondary" onClick={() => setShowDsModal(false)}>Cancel</button>
                <button 
                  className="prompt-tpl-btn primary" 
                  disabled={!selectedDs}
                  onClick={() => {
                    const dsList = loadDatasets();
                    const target = dsList.find(d => d.id === selectedDs);
                    if (target) {
                      // Attempt to extract JSON from the prompt if it looks like JSON strings, otherwise just pass the raw prompt as 'input_text'
                      let inputs = { input_text: log.prompt };
                      if (log.prompt?.startsWith('{') && log.prompt?.endsWith('}')) {
                        try { inputs = JSON.parse(log.prompt); } catch (e) {}
                      }
                      
                      const row = {
                        id: `row_${Date.now()}`,
                        inputs,
                        expected: log.response || ''
                      };
                      
                      target.rows = [...(target.rows || []), row];
                      localStorage.setItem(DATASETS_STORAGE_KEY, JSON.stringify(dsList));
                      setShowDsModal(false);
                      alert('Saved to dataset!');
                    }
                  }}
                >
                  <Save size={13} /> Save Row
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ Main Table ═══ */
export default function PromptLogTable({ logs, hasMore, onLoadMore, loading, initialFilters = {}, onFilterChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [sortCol, setSortCol] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);

  // Filters — can be set externally via initialFilters
  const [filterModel, setFilterModel] = useState(initialFilters.model || '');
  const [filterFn, setFilterFn] = useState(initialFilters.function || '');
  const [filterStatus, setFilterStatus] = useState(initialFilters.status || '');
  const [showFilters, setShowFilters] = useState(!!(initialFilters.model || initialFilters.function || initialFilters.status));

  // Sync external filter changes
  const prevKey = useState('')[0];
  const filterKey = `${initialFilters.model}|${initialFilters.function}|${initialFilters.status}`;
  if (filterKey !== prevKey && filterKey !== '||') {
    // Applied from external source (chart click)
  }

  // Unique values for filter dropdowns
  const models = useMemo(() => [...new Set(logs.map(l => l.model).filter(Boolean))].sort(), [logs]);
  const functions = useMemo(() => [...new Set(logs.map(l => l.function_name).filter(Boolean))].sort(), [logs]);

  // Reset filters when initialFilters change
  useMemo(() => {
    if (initialFilters.model !== undefined) setFilterModel(initialFilters.model || '');
    if (initialFilters.function !== undefined) setFilterFn(initialFilters.function || '');
    if (initialFilters.status !== undefined) setFilterStatus(initialFilters.status || '');
    if (initialFilters.model || initialFilters.function || initialFilters.status) setShowFilters(true);
    setPage(0);
  }, [initialFilters.model, initialFilters.function, initialFilters.status]);

  // Filter + Search
  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filterModel && l.model !== filterModel) return false;
      if (filterFn && l.function_name !== filterFn) return false;
      if (filterStatus === 'success' && l.status === 'error') return false;
      if (filterStatus === 'error' && l.status !== 'error') return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (l.prompt || '').toLowerCase().includes(q) ||
          (l.model || '').toLowerCase().includes(q) ||
          (l.function_name || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [logs, filterModel, filterFn, filterStatus, searchTerm]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortCol) {
        case 'timestamp': return (a.timestamp - b.timestamp) * dir;
        case 'model': return (a.model || '').localeCompare(b.model || '') * dir;
        case 'function': return (a.function_name || '').localeCompare(b.function_name || '') * dir;
        case 'tokens': return (((a.prompt_tokens||0) + (a.completion_tokens||0)) - ((b.prompt_tokens||0) + (b.completion_tokens||0))) * dir;
        case 'latency': return ((a.latency_ms || 0) - (b.latency_ms || 0)) * dir;
        case 'cost': return ((a.cost || 0) - (b.cost || 0)) * dir;
        case 'status': return (a.status || '').localeCompare(b.status || '') * dir;
        default: return 0;
      }
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir(col === 'timestamp' ? 'desc' : 'asc'); }
    setPage(0);
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronsUpDown size={10} style={{ opacity: 0.25 }} />;
    return sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  };

  const fmt = (ts) => {
    const d = new Date(ts * 1000);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const latColor = (ms) => ms < 500 ? 'var(--green)' : ms < 1500 ? 'var(--amber)' : 'var(--red)';
  const latPct = (ms) => Math.min(100, (ms / 4000) * 100);
  const activeFilterCount = [filterModel, filterFn, filterStatus].filter(Boolean).length;

  const clearFilters = () => {
    setFilterModel(''); setFilterFn(''); setFilterStatus(''); setSearchTerm('');
    setPage(0);
    if (onFilterChange) onFilterChange({});
  };

  return (
    <>
      <div className="table-panel">
        <div className="table-toolbar">
          <div className="table-title-group">
            <span className="table-title">Request Log</span>
            <span className="entry-badge">{filtered.length} / {logs.length}</span>
          </div>
          <div className="table-toolbar-right">
            <button
              className="export-btn"
              onClick={() => {
                const csvRows = ['timestamp,model,function,latency_ms,prompt_tokens,completion_tokens,cost,status,prompt,response'];
                filtered.forEach(l => {
                  csvRows.push([
                    new Date(l.timestamp * 1000).toISOString(),
                    l.model || '', l.function_name || '',
                    l.latency_ms || 0, l.prompt_tokens || 0, l.completion_tokens || 0,
                    l.cost || 0, l.status || 'success',
                    `"${(l.prompt || '').replace(/"/g, '""')}"`,
                    `"${(l.response || '').replace(/"/g, '""')}"`
                  ].join(','));
                });
                const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `runetrace_logs_${Date.now()}.csv`; a.click();
                URL.revokeObjectURL(url);
              }}
              title="Export CSV"
            >
              <Download size={12} /> CSV
            </button>
            <button
              className="export-btn"
              onClick={() => {
                const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `runetrace_logs_${Date.now()}.json`; a.click();
                URL.revokeObjectURL(url);
              }}
              title="Export JSON"
            >
              <Download size={12} /> JSON
            </button>
            <button
              className={`filter-toggle ${showFilters || activeFilterCount ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={12} />
              {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
            </button>
            <div className="search-wrap">
              <Search size={13} className="search-icon-el" />
              <input
                type="text"
                placeholder="Search prompts, models..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                className="search-input"
              />
            </div>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="filter-bar">
            <select value={filterModel} onChange={e => { setFilterModel(e.target.value); setPage(0); }} className="filter-select">
              <option value="">All models</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filterFn} onChange={e => { setFilterFn(e.target.value); setPage(0); }} className="filter-select">
              <option value="">All functions</option>
              {functions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }} className="filter-select">
              <option value="">All status</option>
              <option value="success">✓ Success</option>
              <option value="error">✗ Error</option>
            </select>
            {activeFilterCount > 0 && (
              <button className="filter-clear" onClick={clearFilters}>
                <X size={11} /> Clear all
              </button>
            )}
          </div>
        )}

        <div className="table-scroll">
          <table className="log-table">
            <thead>
              <tr>
                <th className="th-sort" style={{ width: 32 }} onClick={() => handleSort('status')}>
                  <SortIcon col="status" />
                </th>
                <th className="th-sort" style={{ width: 150 }} onClick={() => handleSort('timestamp')}>
                  Time <SortIcon col="timestamp" />
                </th>
                <th className="th-sort" style={{ width: 145 }} onClick={() => handleSort('model')}>
                  Model <SortIcon col="model" />
                </th>
                <th className="th-sort" style={{ width: 130 }} onClick={() => handleSort('function')}>
                  Function <SortIcon col="function" />
                </th>
                <th>Prompt</th>
                <th className="th-sort" style={{ width: 95 }} onClick={() => handleSort('tokens')}>
                  Tokens <SortIcon col="tokens" />
                </th>
                <th className="th-sort" style={{ width: 105 }} onClick={() => handleSort('latency')}>
                  Latency <SortIcon col="latency" />
                </th>
                <th className="th-sort" style={{ width: 85 }} onClick={() => handleSort('cost')}>
                  Cost <SortIcon col="cost" />
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-icon">⌁</div>
                      <div className="empty-title">{searchTerm || activeFilterCount ? 'No matches' : 'No logs yet'}</div>
                      <div className="empty-sub">{searchTerm || activeFilterCount ? 'Try different filters' : 'Add @track_llm to start'}</div>
                    </div>
                  </td>
                </tr>
              ) : paged.map((l, i) => {
                const isError = l.status === 'error';
                return (
                  <tr
                    key={`${l.timestamp}-${i}`}
                    onClick={() => setSelectedLog(l)}
                    className={`clickable-row ${isError ? 'row-error' : ''}`}
                  >
                    <td className="td-status">
                      {isError
                        ? <XCircle size={12} style={{ color: 'var(--red)' }} />
                        : <CheckCircle size={12} style={{ color: 'var(--green)', opacity: 0.35 }} />
                      }
                    </td>
                    <td className="td-time">{fmt(l.timestamp)}</td>
                    <td>
                      <div className="td-model">
                        <div className="model-dot" style={{ background: getModelColor(l.model) }} />
                        <span className="model-name">{l.model || 'unknown'}</span>
                      </div>
                    </td>
                    <td className="td-fn">{l.function_name || '—'}</td>
                    <td className="td-prompt" title={l.prompt}>
                      {(l.prompt || '').slice(0, 55)}{(l.prompt || '').length > 55 ? '…' : ''}
                    </td>
                    <td className="td-tokens">
                      <span className="tok-in">{Math.round(l.prompt_tokens || 0)}</span>
                      <span className="tok-sep">/</span>
                      <span className="tok-out">{Math.round(l.completion_tokens || 0)}</span>
                    </td>
                    <td>
                      <div className="td-latency">
                        <div className="latency-bar-inline">
                          <div className="latency-bar-inline-fill" style={{ width: `${latPct(l.latency_ms)}%`, background: latColor(l.latency_ms) }} />
                        </div>
                        <span style={{ color: latColor(l.latency_ms) }}>{(l.latency_ms || 0).toFixed(0)}ms</span>
                      </div>
                    </td>
                    <td className="td-cost">{isError ? '—' : `$${(l.cost || 0).toFixed(4)}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 0} onClick={() => setPage(0)}>«</button>
            <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
            <span className="page-info">Page {page + 1} of {totalPages}</span>
            <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
            <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</button>
            {hasMore && page >= totalPages - 1 && (
              <button className="load-more-btn" onClick={onLoadMore} disabled={loading}>
                {loading ? 'Loading...' : 'Load more from API'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedLog && <DetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </>
  );
}
