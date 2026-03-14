import { useState, useMemo, useCallback } from 'react';
import { Plus, Save, Trash2, Play, History, Copy, Check, ChevronDown, ChevronRight, Variable, FileText, Tag } from 'lucide-react';

const STORAGE_KEY = 'rune_prompt_templates';

function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function extractVariables(text) {
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

function renderTemplate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] || `{{${name}}}`);
}

export default function PromptTemplates({ onTestInPlayground }) {
  const [templates, setTemplates] = useState(loadTemplates);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null); // draft state
  const [search, setSearch] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [testVars, setTestVars] = useState({});
  const [copied, setCopied] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return templates;
    const q = search.toLowerCase();
    return templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.tags?.some(tag => tag.toLowerCase().includes(q))
    );
  }, [templates, search]);

  const selectedTemplate = templates.find(t => t.id === selected);

  const createNew = () => {
    const id = `tpl_${Date.now()}`;
    const now = Date.now();
    const tpl = {
      id,
      name: 'Untitled Prompt',
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Hello {{name}}, please help me with {{task}}.',
      tags: [],
      model: '',
      versions: [{ v: 1, systemPrompt: 'You are a helpful assistant.', userPrompt: 'Hello {{name}}, please help me with {{task}}.', savedAt: now }],
      currentVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
    const next = [tpl, ...templates];
    setTemplates(next);
    saveTemplates(next);
    setSelected(id);
    setEditing({ ...tpl });
    setTestVars({});
  };

  const saveEdit = () => {
    if (!editing) return;
    const now = Date.now();
    const existing = templates.find(t => t.id === editing.id);

    const isChanged = existing.systemPrompt !== editing.systemPrompt || existing.userPrompt !== editing.userPrompt;
    let updated = { ...editing, updatedAt: now };

    if (isChanged) {
      const newV = (existing?.currentVersion || 1) + 1;
      const version = {
        v: newV,
        systemPrompt: editing.systemPrompt,
        userPrompt: editing.userPrompt,
        savedAt: now,
      };
      updated.currentVersion = newV;
      updated.versions = [...(existing?.versions || []), version].slice(-20);
    } else {
      updated.versions = existing?.versions || [];
    }

    const next = templates.map(t => t.id === updated.id ? updated : t);
    setTemplates(next);
    saveTemplates(next);
    
    // Keep editor open and updated with the latest save state
    setEditing(updated);
  };

  const deleteTemplate = (id) => {
    const next = templates.filter(t => t.id !== id);
    setTemplates(next);
    saveTemplates(next);
    if (selected === id) { setSelected(null); setEditing(null); }
  };

  const restoreVersion = (ver) => {
    if (!editing) return;
    setEditing({ ...editing, systemPrompt: ver.systemPrompt, userPrompt: ver.userPrompt });
  };

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const addTag = (tag) => {
    if (!editing || !tag.trim()) return;
    setEditing({ ...editing, tags: [...new Set([...(editing.tags || []), tag.trim()])] });
  };

  const removeTag = (tag) => {
    if (!editing) return;
    setEditing({ ...editing, tags: (editing.tags || []).filter(t => t !== tag) });
  };

  const variables = editing ? extractVariables(editing.systemPrompt + ' ' + editing.userPrompt) : [];
  const previewText = editing ? renderTemplate(editing.userPrompt, testVars) : '';

  return (
    <div className="prompt-tpl-layout">
      {/* Sidebar */}
      <div className="prompt-tpl-sidebar">
        <div className="prompt-tpl-sidebar-header">
          <span className="prompt-tpl-sidebar-title">Prompts</span>
          <button className="prompt-tpl-add-btn" onClick={createNew} title="New template">
            <Plus size={13} />
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search prompts..."
          className="prompt-tpl-search"
          autoComplete="off"
        />

        <div className="prompt-tpl-list">
          {filtered.length === 0 && (
            <div className="prompt-tpl-empty">
              No prompts yet. Click <strong>+</strong> to create one.
            </div>
          )}
          {filtered.map(t => (
            <button
              key={t.id}
              className={`prompt-tpl-item ${selected === t.id ? 'active' : ''}`}
              onClick={() => { setSelected(t.id); setEditing({ ...t }); setTestVars({}); setShowVersions(false); }}
            >
              <FileText size={12} className="prompt-tpl-item-icon" />
              <div className="prompt-tpl-item-info">
                <span className="prompt-tpl-item-name">{t.name}</span>
                <span className="prompt-tpl-item-meta">
                  v{t.currentVersion} · {extractVariables(t.systemPrompt + ' ' + t.userPrompt).length} vars
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="prompt-tpl-editor">
        {!editing ? (
          <div className="prompt-tpl-placeholder">
            <FileText size={32} style={{ color: 'var(--text-3)' }} />
            <p>Select a prompt template or create a new one</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="prompt-tpl-editor-header">
              <input
                type="text"
                value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })}
                className="prompt-tpl-name-input"
                placeholder="Prompt name..."
                autoComplete="off"
              />
              <div className="prompt-tpl-editor-actions">
                <button className="prompt-tpl-btn secondary" onClick={() => setShowVersions(!showVersions)}>
                  <History size={12} /> v{selectedTemplate?.currentVersion || 1}
                </button>
                <button className="prompt-tpl-btn secondary" onClick={() => deleteTemplate(editing.id)}>
                  <Trash2 size={12} />
                </button>
                <button className="prompt-tpl-btn primary" onClick={saveEdit}>
                  <Save size={12} /> Save
                </button>
                {onTestInPlayground && (
                  <button className="prompt-tpl-btn accent" onClick={() => onTestInPlayground(renderTemplate(editing.systemPrompt, testVars), renderTemplate(editing.userPrompt, testVars))}>
                    <Play size={12} /> Test
                  </button>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="prompt-tpl-tags-row">
              <Tag size={11} style={{ color: 'var(--text-3)' }} />
              {(editing.tags || []).map(tag => (
                <span key={tag} className="prompt-tpl-tag">
                  {tag}
                  <span className="prompt-tpl-tag-x" onClick={() => removeTag(tag)}>×</span>
                </span>
              ))}
              <input
                type="text"
                placeholder="add tag..."
                className="prompt-tpl-tag-input"
                onKeyDown={e => { if (e.key === 'Enter') { addTag(e.target.value); e.target.value = ''; } }}
                autoComplete="off"
              />
            </div>

            {/* Version History Panel */}
            {showVersions && selectedTemplate?.versions?.length > 0 && (
              <div className="prompt-tpl-versions">
                <div className="prompt-tpl-versions-title">Version History</div>
                {[...selectedTemplate.versions].reverse().map(ver => (
                  <div key={ver.v} className="prompt-tpl-version-row">
                    <span className="prompt-tpl-version-label">v{ver.v}</span>
                    <span className="prompt-tpl-version-date">
                      {new Date(ver.savedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button className="prompt-tpl-btn tiny" onClick={() => restoreVersion(ver)}>Restore</button>
                  </div>
                ))}
              </div>
            )}

            {/* Editor Fields */}
            <div className="prompt-tpl-fields">
              <div className="prompt-tpl-field">
                <label className="prompt-tpl-field-label">System Prompt</label>
                <textarea
                  value={editing.systemPrompt}
                  onChange={e => setEditing({ ...editing, systemPrompt: e.target.value })}
                  className="prompt-tpl-textarea"
                  rows={3}
                  placeholder="You are a {{role}} assistant..."
                />
              </div>
              <div className="prompt-tpl-field">
                <label className="prompt-tpl-field-label">
                  User Prompt Template
                  <span className="prompt-tpl-var-hint">Use {"{{variable}}"} for dynamic values</span>
                </label>
                <textarea
                  value={editing.userPrompt}
                  onChange={e => setEditing({ ...editing, userPrompt: e.target.value })}
                  className="prompt-tpl-textarea"
                  rows={6}
                  placeholder="Summarize this {{document_type}} for {{audience}}..."
                />
              </div>
            </div>

            {/* Variables Panel */}
            {variables.length > 0 && (
              <div className="prompt-tpl-vars-panel">
                <div className="prompt-tpl-vars-header">
                  <Variable size={13} />
                  <span>Variables ({variables.length})</span>
                  <button className="prompt-tpl-btn tiny" onClick={() => setShowPreview(!showPreview)}>
                    {showPreview ? 'Hide Preview' : 'Preview'}
                  </button>
                </div>
                <div className="prompt-tpl-vars-grid">
                  {variables.map(v => (
                    <div key={v} className="prompt-tpl-var-row">
                      <label className="prompt-tpl-var-name">{`{{${v}}}`}</label>
                      <input
                        type="text"
                        value={testVars[v] || ''}
                        onChange={e => setTestVars({ ...testVars, [v]: e.target.value })}
                        className="prompt-tpl-var-input"
                        placeholder={`Enter ${v}...`}
                        autoComplete="off"
                      />
                    </div>
                  ))}
                </div>

                {showPreview && (
                  <div className="prompt-tpl-preview">
                    <div className="prompt-tpl-preview-label">
                      Rendered Preview
                      <button className="copy-btn" onClick={() => copy(previewText, 'preview')}>
                        {copied === 'preview' ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </div>
                    <div className="prompt-tpl-preview-text">{previewText}</div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
