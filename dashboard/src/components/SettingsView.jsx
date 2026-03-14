import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Folder, Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import './SettingsView.css';

export default function SettingsView({ currentProject, switchProject, recentProjects, removeProject }) {
  const [newProject, setNewProject] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Mock API Key generation for frontend showcase
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('rune_mock_api_key') || 'rt_test_e9b2a1...');

  const handleCreateProject = () => {
    if (newProject.trim()) {
      switchProject(newProject.trim());
      setNewProject('');
    }
  };

  const generateNewKey = () => {
    const key = 'rt_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setApiKey(key);
    localStorage.setItem('rune_mock_api_key', key);
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="settings-view">
      <div className="sv-header">
        <h2>Project & Settings</h2>
        <p>Manage your Runetrace workspaces, API keys, and deployment configurations.</p>
      </div>

      <div className="sv-grid">
        
        {/* Projects Panel */}
        <div className="sv-panel">
          <div className="sv-panel-head">
            <Folder size={18} className="hl-blue" />
            <h3>Your Projects</h3>
          </div>
          <div className="sv-panel-body">
            <p className="sv-desc">
              A Project in Runetrace is equivalent to an environment or an application. 
              To log to a specific project, simply pass its ID to the SDK during initialization. 
              There are no Terraform changes required to create a new one.
            </p>
            
            <div className="sv-code-block">
              <code>
                <span className="c-keyword">import</span> runetrace<br/>
                runetrace.configure(project_id=<span className="c-string">"{currentProject || 'my-app-prod'}"</span>)
              </code>
            </div>

            <div className="sv-projects-list">
              <h4>Active Projects</h4>
              {recentProjects.map(p => (
                <div key={p} className={`sv-project-row ${p === currentProject ? 'active' : ''}`} onClick={() => switchProject(p)}>
                  <span className="sv-dot" style={p === currentProject ? {background: 'var(--ln-lime)'} : {}} />
                  <span className="sv-p-name">{p}</span>
                  {p === currentProject && <span className="sv-badge">Current</span>}
                  {p !== currentProject && (
                    <button className="sv-p-remove" onClick={(e) => { e.stopPropagation(); removeProject(p, e); }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="sv-add-project">
              <input 
                type="text" 
                placeholder="Create new project ID..." 
                value={newProject}
                onChange={e => setNewProject(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                // These attributes attempt to prevent password managers from injecting popups
                autoComplete="new-password"
                name="runetrace-new-project"
                data-lpignore="true"
                spellCheck="false"
              />
              <button onClick={handleCreateProject} disabled={!newProject.trim()}>
                <Plus size={14} /> Create
              </button>
            </div>
          </div>
        </div>

        {/* API Keys Panel */}
        <div className="sv-panel">
          <div className="sv-panel-head">
            <Key size={18} className="hl-orange" />
            <h3>API Keys & Security</h3>
          </div>
          <div className="sv-panel-body">
            <p className="sv-desc">
              Your API key is used by the Runetrace Python SDK to authenticate with your self-hosted AWS API Gateway. 
              Keep this secret. If compromised, you can roll it instantly.
            </p>

            <div className="sv-api-box">
              <div className="sv-api-top">
                <span>Default Ingestion Key</span>
                <span className="sv-api-status"><span className="dot active"/> Active</span>
              </div>
              <div className="sv-api-key-display">
                <code>{apiKey}</code>
              </div>
              <div className="sv-api-actions">
                <button className="sv-btn-secondary" onClick={copyKey}>
                  {copied ? <CheckCircle2 size={14} className="hl-lime"/> : 'Copy Key'}
                </button>
                <button className="sv-btn-danger" onClick={generateNewKey}>
                  Roll Key
                </button>
              </div>
            </div>

            <div className="sv-alert">
              <Shield size={16} />
              <div>
                <strong>Self-Hosted Security</strong>
                <p>Because Runetrace is deployed in your AWS account, we never have access to this API Key or your prompt data.</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
