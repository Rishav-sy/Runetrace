import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Folder, Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/auth';
import './SettingsView.css';

export default function SettingsView({ currentProject, switchProject, recentProjects, removeProject }) {
  const [newProject, setNewProject] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Real API Key generation from Supabase
  const [apiKeys, setApiKeys] = useState([]);
  const [orgId, setOrgId] = useState(null);
  const [loadingKeys, setLoadingKeys] = useState(true);

  useEffect(() => {
    async function loadData() {
      // 1. Get current user's organization
      const { data: orgData } = await supabase.from('organizations').select('id').limit(1);
      if (orgData && orgData.length > 0) {
        const organizationId = orgData[0].id;
        setOrgId(organizationId);

        // 2. Load API keys for org
        const { data: keyData } = await supabase
          .from('api_keys')
          .select('*')
          .eq('org_id', organizationId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (keyData) setApiKeys(keyData);
      }
      setLoadingKeys(false);
    }
    loadData();
  }, []);

  const handleCreateProject = () => {
    if (newProject.trim()) {
      switchProject(newProject.trim());
      setNewProject('');
    }
  };

  const generateNewKey = async () => {
    if (!orgId) return;
    
    // Create new secure random key using browser crypto
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const newKeyValue = `rt_live_${randomHex}`;

    // Insert into Supabase
    const { data, error } = await supabase
      .from('api_keys')
      .insert([{ org_id: orgId, key_value: newKeyValue }])
      .select()
      .single();

    if (!error && data) {
      setApiKeys([data, ...apiKeys]);
    }
  };

  const revokeKey = async (keyId) => {
    const { error } = await supabase
      .from('api_keys')
      .update({ status: 'revoked' })
      .eq('id', keyId);

    if (!error) {
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
    }
  };

  const copyKey = (val) => {
    navigator.clipboard.writeText(val);
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
            </p>
            
            <div className="sv-code-block">
              <code>
                <span className="c-keyword">import</span> runetrace<br/>
                <br/>
                runetrace.configure(<br/>
                &nbsp;&nbsp;api_url=<span className="c-string">"{import.meta.env.VITE_SUPABASE_URL}"</span>,<br/>
                &nbsp;&nbsp;anon_key=<span className="c-string">"{import.meta.env.VITE_SUPABASE_ANON_KEY}"</span>,<br/>
                &nbsp;&nbsp;api_key=<span className="c-string">"{apiKeys[0]?.key_value || 'rt_live_...'}"</span>,<br/>
                &nbsp;&nbsp;project_id=<span className="c-string">"{currentProject || 'my-app-prod'}"</span><br/>
                )
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
                autoComplete="new-password"
                name="runetrace-new-project"
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
              Your API key is used by the Runetrace Python SDK to authenticate with your self-hosted Supabase database. 
              Keep this secret. If compromised, you can roll it instantly.
            </p>

            {loadingKeys ? (
              <div style={{ opacity: 0.5, padding: '20px 0', fontSize: 13 }}>Loading API Keys...</div>
            ) : (
              <div className="sv-api-keys-list" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {apiKeys.length === 0 ? (
                  <div style={{ opacity: 0.7, fontSize: 13 }}>No active API Keys found.</div>
                ) : apiKeys.map((keyObj, i) => (
                  <div className="sv-api-box" key={keyObj.id}>
                    <div className="sv-api-top">
                      <span>{i === 0 ? 'Primary Ingestion Key' : 'Additional Key'}</span>
                      <span className="sv-api-status"><span className="dot active"/> Active</span>
                    </div>
                    <div className="sv-api-key-display" style={{ fontFamily: 'monospace' }}>
                      <code>{keyObj.key_value}</code>
                    </div>
                    <div className="sv-api-actions">
                      <button className="sv-btn-secondary" onClick={() => copyKey(keyObj.key_value)}>
                        {copied ? <CheckCircle2 size={14} className="hl-lime"/> : 'Copy Key'}
                      </button>
                      <button className="sv-btn-danger" onClick={() => revokeKey(keyObj.id)}>
                        Revoke Key
                      </button>
                    </div>
                  </div>
                ))}

                <button 
                  className="sv-btn-secondary" 
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                  onClick={generateNewKey}
                >
                  <Plus size={14} style={{ marginRight: 6 }}/> Create New Secret Key
                </button>
              </div>
            )}

            <div className="sv-alert" style={{ marginTop: 24 }}>
              <Shield size={16} />
              <div>
                <strong>Self-Hosted Security</strong>
                <p>Because Runetrace logs to your own database, these keys ensure strictly your apps can write to your table.</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
