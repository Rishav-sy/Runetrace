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
import PromptLogTable from './components/PromptLogTable';
import { SkeletonCard, SkeletonChart, SkeletonTable } from './components/Skeleton';
import { RefreshCw, WifiOff, BarChart3, List, Filter as FilterIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  { key: 'logs', label: 'Logs', icon: List },
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
  const [projectId, setProjectId] = useState('sdk-test');
  const [timeRange, setTimeRange] = useState('all');
  const [tab, setTab] = useState('overview');
  const { logs, loading, error, hasMore, refetch, loadMore } = useLLMLogs(projectId, timeRange);

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

  const clearFilters = useCallback(() => {
    setLogFilters({});
  }, []);

  const isConnected = !error;
  const isLoading = loading && logs.length === 0;

  // Active filter indicator
  const activeFilterLabel = logFilters.model || logFilters.function || (logFilters.status === 'error' ? 'Errors' : '');

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
            <input
              type="text"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="project-input"
              placeholder="project_id"
            />
            <button onClick={refetch} className="btn-ghost" disabled={loading} title="Refresh">
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
            </button>
            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="dot" />
              <span>{isConnected ? 'LIVE' : 'OFF'}</span>
            </div>
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
          {isLoading ? (
            <div className="loading-state">
              <div className="metrics-grid">
                {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
              <div className="panel-grid-2"><SkeletonChart /><SkeletonChart /></div>
              <SkeletonTable />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {tab === 'overview' ? (
                <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
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

                  {/* Row 3: 4 small panels */}
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
              ) : (
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
              )}
            </AnimatePresence>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
