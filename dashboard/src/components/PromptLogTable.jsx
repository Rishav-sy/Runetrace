import { useState } from 'react';
import { Search } from 'lucide-react';
import './PromptLogTable.css';

export default function PromptLogTable({ logs }) {
  const [searchTerm, setSearchTerm] = useState('');

  const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
  const filtered = sorted.filter(log =>
    (log.prompt || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.function_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimestamp = (ts) => {
    const date = new Date(ts * 1000);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="table-container">
      <div className="table-header">
        <h3 className="table-title">Request Log</h3>
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search prompts, models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="table-scroll">
        <table className="log-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Model</th>
              <th>Prompt</th>
              <th>Tokens</th>
              <th>Latency</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-empty">
                  {searchTerm ? 'No matching logs found' : 'No logs yet — start tracking!'}
                </td>
              </tr>
            ) : (
              filtered.map((log, i) => (
                <tr key={`${log.timestamp}-${i}`} className="table-row">
                  <td className="td-timestamp">{formatTimestamp(log.timestamp)}</td>
                  <td>
                    <span className="model-badge">{log.model || 'unknown'}</span>
                  </td>
                  <td className="td-prompt" title={log.prompt}>
                    {(log.prompt || '').slice(0, 80)}{(log.prompt || '').length > 80 ? '…' : ''}
                  </td>
                  <td className="td-tokens">
                    <span className="token-in">{log.prompt_tokens || 0}</span>
                    <span className="token-divider">/</span>
                    <span className="token-out">{log.completion_tokens || 0}</span>
                  </td>
                  <td className="td-latency">{(log.latency_ms || 0).toFixed(0)}ms</td>
                  <td className="td-cost">${(log.cost || 0).toFixed(6)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
