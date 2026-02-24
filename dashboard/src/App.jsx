import { useState } from 'react';
import { useLLMLogs } from './hooks/useLLMLogs';
import MetricCards from './components/MetricCards';
import CostByModelChart from './components/CostByModelChart';
import PromptLogTable from './components/PromptLogTable';
import { RefreshCw, Radio } from 'lucide-react';
import './App.css';

function App() {
  const [projectId, setProjectId] = useState('sdk-test');
  const { logs, loading, error, refetch } = useLLMLogs(projectId);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <Radio className="logo-icon" size={24} />
            <h1 className="logo-text">runetrace</h1>
          </div>
          <span className="header-badge">Observability</span>
        </div>
        <div className="header-right">
          <div className="project-selector">
            <label className="project-label">Project:</label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="project-input"
              placeholder="project_id"
            />
          </div>
          <button onClick={refetch} className="refresh-btn" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          Failed to fetch logs: {error}
        </div>
      )}

      <main className="app-main">
        <MetricCards logs={logs} />

        <div className="charts-row">
          <CostByModelChart logs={logs} />
        </div>

        <PromptLogTable logs={logs} />
      </main>

      <footer className="app-footer">
        <span>runetrace v0.1.0 — $0/month LLM observability</span>
        <a href="https://github.com/rishavsy/runetrace" target="_blank" rel="noreferrer" className="footer-link">
          GitHub
        </a>
      </footer>
    </div>
  );
}

export default App;
