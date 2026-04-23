import { useState, useMemo, useCallback } from 'react';
import { useLLMLogs, TIME_RANGES } from './hooks/useLLMLogs';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorBoundary from './components/ErrorBoundary';
import MetricCards from './components/MetricCards';
import CostByModelChart from './components/CostByModelChart';
import LatencyByFunction from './components/LatencyByFunction';
import RequestsOverTime from './components/RequestsOverTime';
import TokenBreakdown from './components/TokenBreakdown';
import ModelRing from './components/ModelRing';
import LatencyHistogram from './components/LatencyHistogram';
import LatencyOverTime from './components/LatencyOverTime';
import FunctionFrequency from './components/FunctionFrequency';
import CostSparkline from './components/CostSparkline';
import LatencyPercentiles from './components/LatencyPercentiles';
import ErrorAnalysis from './components/ErrorAnalysis';
import CostForecast from './components/CostForecast';
import TraceView from './components/TraceView';
import Playground from './components/Playground';
import ModelComparison from './components/ModelComparison';
import UserAnalytics from './components/UserAnalytics';
import LatencyHeatmap from './components/LatencyHeatmap';
import ThroughputChart from './components/ThroughputChart';
import EvaluationScores from './components/EvaluationScores';
import AlertsPanel from './components/AlertsPanel';
import PromptTemplates from './components/PromptTemplates';
import AutoEval from './components/AutoEval';
import DatasetsView from './components/DatasetsView';
import PromptLogTable from './components/PromptLogTable';
import SettingsView from './components/SettingsView';
import { SkeletonCard, SkeletonChart, SkeletonTable } from './components/Skeleton';
import { RefreshCw, WifiOff, BarChart3, List, Filter as FilterIcon, GitBranch, Beaker, BarChart2, ChevronDown, FileText, Database, Settings } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from './components/AuthContext';
import './App.css';

const RANGES = [
  { key: '1h', label: '1H' },
  { key: '24h', label: '24H' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'all', label: 'ALL' },
];

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'analytics', label: 'Analytics', icon: BarChart2 },
  { key: 'logs', label: 'Logs', icon: List },
  { key: 'traces', label: 'Traces', icon: GitBranch },
  { key: 'prompts', label: 'Prompts', icon: FileText },
  { key: 'datasets', label: 'Datasets', icon: Database },
  { key: 'playground', label: 'Playground', icon: Beaker },
];

/* ── Fade animation ── */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] },
  }),
};

function App() {
  const [projectId, setProjectId] = useState(() => localStorage.getItem('last_project') || 'default');
  const [recentProjects, setRecentProjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recent_projects')) || ['default']; }
    catch { return ['default']; }
  });
  const [timeRange, setTimeRange] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const setTab = (newTab) => {
    setSearchParams(prev => {
      prev.set('tab', newTab);
      return prev;
    });
  };
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Open access to whichever project string is set
  const { logs, loading, error, hasMore, refetch, loadMore } = useLLMLogs(projectId, timeRange);

  const switchProject = (p) => {
    const trimmed = p.trim();
    if (!trimmed) return;
    setProjectId(trimmed);
    localStorage.setItem('last_project', trimmed);
    setRecentProjects(prev => {
      const next = Array.from(new Set([trimmed, ...prev])).slice(0, 12);
      localStorage.setItem('recent_projects', JSON.stringify(next));
      return next;
    });
    setShowProjectMenu(false);
  };

  const removeProject = (p, e) => {
    e.stopPropagation();
    setRecentProjects(prev => {
      const next = prev.filter(x => x !== p);
      localStorage.setItem('recent_projects', JSON.stringify(next));
      return next;
    });
  };

  // ── Shared filter state (chart click → log filter) ──
  const [logFilters, setLogFilters] = useState({});

  const filterToModel = useCallback((model) => {
    setLogFilters({ model });
    setTab('logs');
  }, []);

  const filterToFunction = useCallback((fn) => {
    setLogFilters({ function: fn });
    setTab('logs');
  }, []);

  const filterToStatus = useCallback((status) => {
    setLogFilters({ status });
    setTab('logs');
  }, []);

  const filterToTimeWindow = useCallback((day, hour, label) => {
    setLogFilters({ timeWindow: { day, hour, label } });
    setTab('logs');
  }, []);

  const clearFilters = useCallback(() => {
    setLogFilters({});
  }, []);

  const isConnected = !error;
  const isLoading = loading && logs.length === 0;

  // Active filter indicator
  const activeFilterLabel = logFilters.model || logFilters.function || (logFilters.status === 'error' ? 'Errors' : logFilters.timeWindow ? logFilters.timeWindow.label : '');

  return (
    <ErrorBoundary>
      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <Link to="/" className="logo">
              <div className="logo-mark">R</div>
              <div className="logo-text">rune<span>trace</span></div>
            </Link>
            <div className="header-sep" />
            <div className="tab-nav">
              {TABS.map(t => (
                <button
                  key={t.key}
                  className={`tab-btn ${tab === t.key ? 'active' : ''}`}
                  onClick={() => { setTab(t.key); if (t.key === 'overview') clearFilters(); }}
                >
                  <t.icon size={13} />
                  {t.label}
                  {t.key === 'logs' && activeFilterLabel && (
                    <span className="tab-filter-badge">
                      <FilterIcon size={9} /> {activeFilterLabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="header-center">
            <div className="time-picker">
              {RANGES.map(r => (
                <button
                  key={r.key}
                  className={`time-btn ${timeRange === r.key ? 'active' : ''}`}
                  onClick={() => setTimeRange(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="header-right">
            <div className="project-selector-wrap">
              <button 
                className="project-selector-btn" 
                onClick={() => setShowProjectMenu(!showProjectMenu)}
              >
                <span className="project-dot" />
                <span className="project-selector-name">{projectId}</span>
                <ChevronDown size={12} />
              </button>

              {showProjectMenu && (
                <>
                  <div className="project-menu-overlay" onClick={() => setShowProjectMenu(false)} />
                  <div className="project-menu">
                    <div className="project-menu-header">Projects</div>
                    <div className="project-menu-hint">
                      A project is just a string ID you set in the SDK via <code>runetrace.configure(project_id="...")</code>. Any logs with the same ID are grouped here.
                    </div>

                    {/* List of recent projects */}
                    <div className="project-menu-list">
                      {recentProjects.map(p => (
                        <button
                          key={p}
                          className={`project-menu-item ${p === projectId ? 'active' : ''}`}
                          onClick={() => switchProject(p)}
                        >
                          <span className="project-dot" style={p === projectId ? { background: 'var(--lime)' } : {}} />
                          <span className="project-menu-item-name">{p}</span>
                          {p !== projectId && (
                            <span className="project-menu-remove" onClick={(e) => removeProject(p, e)} title="Remove">×</span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Add new project */}
                    <div className="project-menu-add" style={{ padding: '8px 12px 12px', borderTop: '1px solid var(--border-dim)', marginTop: '4px' }}>
                      <button
                        className="project-add-btn"
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, background: 'var(--bg-hover)', color: 'var(--text-2)', padding: '8px 0', borderRadius: '6px' }}
                        onClick={() => { setTab('settings'); setShowProjectMenu(false); }}
                      >
                        <Settings size={13} /> Manage Projects
                      </button>
                    </div>

                    {!isAuthenticated && (
                      <div className="project-menu-tip" style={{ padding: '8px 12px', background: 'rgba(200,255,0,0.05)', borderTop: '1px solid var(--border-dim)', fontSize: '10px', color: 'var(--text-3)', lineHeight: 1.4 }}>
                        <span style={{ color: 'var(--lime)', fontWeight: 600 }}>TIP:</span> Sign in to secure your project data with Enterprise Role-Based Access Control.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setTab('settings')} className="btn-ghost" title="Settings">
              <Settings size={13} style={{ color: tab === 'settings' ? 'var(--lime)' : 'inherit' }} />
            </button>
            <button onClick={refetch} className="btn-ghost" disabled={loading} title="Refresh">
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
            </button>
            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="dot" />
              <span>{isConnected ? 'LIVE' : 'OFF'}</span>
            </div>
            
            {!isAuthenticated ? (
              <div className="auth-buttons-nav">
                <button className="btn-ghost" onClick={() => navigate('/login')} style={{ fontSize: 11, letterSpacing: '0.04em', fontWeight: 600 }}>SIGN IN</button>
              </div>
            ) : (
              <button className="btn-ghost" onClick={logout} style={{ color: 'var(--r-text-dim)', fontSize: 12 }}>
                Log Out
              </button>
            )}
          </div>
        </header>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div className="error-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <WifiOff size={14} /> Failed to connect: {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main */}
        <main className="main-content">
          <AnimatePresence mode="wait">
            {isLoading && ['overview', 'analytics', 'logs', 'traces'].includes(tab) ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="loading-state">
                  <div className="metrics-grid">
                    {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                  <div className="panel-grid-2"><SkeletonChart /><SkeletonChart /></div>
                  <SkeletonTable />
                </div>
              </motion.div>
            ) : tab === 'overview' ? (
              <motion.div key={`overview-${projectId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {/* Metrics */}
                  <MetricCards
                    logs={logs}
                    timeRange={timeRange}
                    onFilterStatus={filterToStatus}
                    onFilterModel={filterToModel}
                  />

                  {/* Row 1: Call Volume + Cost */}
                  <div className="panel-grid-2">
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                      <RequestsOverTime logs={logs} timeRange={timeRange} />
                    </motion.div>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
                      <CostByModelChart logs={logs} onFilterModel={filterToModel} />
                    </motion.div>
                  </div>

                  {/* Row 2: Tokens + Latency Over Time */}
                  <div className="panel-grid-2">
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                      <TokenBreakdown logs={logs} timeRange={timeRange} />
                    </motion.div>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
                      <LatencyOverTime logs={logs} timeRange={timeRange} />
                    </motion.div>
                  </div>

                  {/* Row 3: Error Analysis + Latency Percentiles + Cost Forecast */}
                  <div className="panel-grid-3">
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                      <ErrorAnalysis logs={logs} onFilterStatus={filterToStatus} />
                    </motion.div>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
                      <LatencyPercentiles logs={logs} />
                    </motion.div>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
                      <CostForecast logs={logs} />
                    </motion.div>
                  </div>

                  {/* Row 4: 4 small panels */}
                  <div className="panel-grid-4">
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                      <ModelRing logs={logs} onFilterModel={filterToModel} />
                    </motion.div>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
                      <LatencyByFunction logs={logs} onFilterFunction={filterToFunction} />
                    </motion.div>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
                      <CostSparkline logs={logs} />
                    </motion.div>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
                      <FunctionFrequency logs={logs} onFilterFunction={filterToFunction} />
                    </motion.div>
                  </div>

                  {/* Recent logs */}
                  <div className="section-label"><span>RECENT REQUESTS</span></div>
                  <PromptLogTable logs={logs.slice(0, 50)} hasMore={false} onLoadMore={() => {}} loading={false} />
                  <div className="view-all-wrap">
                    <button className="btn-link" onClick={() => setTab('logs')}>
                      View all {logs.length} logs →
                    </button>
                  </div>
                </motion.div>
              ) : tab === 'analytics' ? (
                /* ── Analytics Tab ── */
                <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  {/* Model Comparison */}
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                    <ModelComparison logs={logs} />
                  </motion.div>

                  {/* Throughput + Heatmap */}
                  <div className="panel-grid-2" style={{ marginTop: 12 }}>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                      <ThroughputChart logs={logs} timeRange={timeRange} />
                    </motion.div>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
                      <LatencyHeatmap logs={logs} onFilterTime={filterToTimeWindow} />
                    </motion.div>
                  </div>

                  {/* User Analytics + Evaluations + Alerts */}
                  <div className="panel-grid-3" style={{ marginTop: 12 }}>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                      <UserAnalytics logs={logs} />
                    </motion.div>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
                      <EvaluationScores logs={logs} />
                    </motion.div>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
                      <AlertsPanel logs={logs} />
                    </motion.div>
                  </div>

                  {/* Auto-Eval Section */}
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} style={{ marginTop: 12 }}>
                    <AutoEval logs={logs} />
                  </motion.div>
                </motion.div>
              ) : tab === 'logs' ? (
                /* ── Logs Tab ── */
                <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  {/* Active filter banner */}
                  {activeFilterLabel && (
                    <div className="active-filter-banner">
                      <FilterIcon size={13} />
                      <span>Filtered by: <strong>{activeFilterLabel}</strong></span>
                      <button onClick={clearFilters} className="filter-clear-inline">Clear filter ×</button>
                    </div>
                  )}
                  <PromptLogTable
                    logs={logs}
                    hasMore={hasMore}
                    onLoadMore={loadMore}
                    loading={loading}
                    initialFilters={logFilters}
                    onFilterChange={setLogFilters}
                  />
                </motion.div>
              ) : tab === 'traces' ? (
                /* ── Traces Tab ── */
                <motion.div key="traces" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <TraceView logs={logs} />
                </motion.div>
              ) : tab === 'prompts' ? (
                /* ── Prompts Tab ── */
                <motion.div key="prompts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <PromptTemplates onTestInPlayground={(sys, user) => {
                    localStorage.setItem('rune_test_prompt', JSON.stringify({ systemPrompt: sys, userPrompt: user, ts: Date.now() }));
                    setTab('playground');
                  }} />
                </motion.div>
              ) : tab === 'datasets' ? (
                /* ── Datasets Tab ── */
                <motion.div key="datasets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <DatasetsView />
                </motion.div>
              ) : tab === 'playground' ? (
                /* ── Playground Tab ── */
                <motion.div key="playground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Playground />
                </motion.div>
              ) : tab === 'settings' ? (
                /* ── Settings Tab ── */
                <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <SettingsView 
                    currentProject={projectId} 
                    switchProject={switchProject} 
                    recentProjects={recentProjects} 
                    removeProject={removeProject}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
