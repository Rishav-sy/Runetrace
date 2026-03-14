import { useState, useMemo, useCallback } from 'react';
import { Database, Plus, Save, Trash2, Play, ChevronRight, Check, X, Tag, FileText, Loader, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

export const DATASETS_STORAGE_KEY = 'rune_datasets';
export const SUITES_STORAGE_KEY = 'rune_test_suites';

// Helper to get judge models (matching AutoEval)
const JUDGE_MODELS = [
  { id: 'llama-3.3-70b-versatile', provider: 'groq', label: 'Llama 3.3 70B (Groq)' },
  { id: 'llama-3.1-8b-instant', provider: 'groq', label: 'Llama 3.1 8B (Groq)' },
  { id: 'gpt-4o-mini', provider: 'openai', label: 'GPT-4o Mini' },
  { id: 'gpt-4o', provider: 'openai', label: 'GPT-4o' },
];

export function loadDatasets() {
  try { return JSON.parse(localStorage.getItem(DATASETS_STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveDatasets(ds) { localStorage.setItem(DATASETS_STORAGE_KEY, JSON.stringify(ds)); }

function loadSuites() {
  try { return JSON.parse(localStorage.getItem(SUITES_STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveSuites(ss) { localStorage.setItem(SUITES_STORAGE_KEY, JSON.stringify(ss)); }

function loadPrompts() {
  try { return JSON.parse(localStorage.getItem('rune_prompt_templates')) || []; }
  catch { return []; }
}
function loadModels() {
  return [
    ...((JSON.parse(localStorage.getItem('rune_pg_models_groq')) || []).map(m => ({ id: m, provider: 'groq' }))),
    ...((JSON.parse(localStorage.getItem('rune_pg_models_openai')) || []).map(m => ({ id: m, provider: 'openai' })))
  ];
}

// Extract variables from {{var}} syntax 
function extractVariables(text) {
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}
function renderTemplate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] || `{{${name}}}`);
}

export default function DatasetsView() {
  const [datasets, setDatasets] = useState(loadDatasets);
  const [suites, setSuites] = useState(loadSuites);
  const [selectedDs, setSelectedDs] = useState(null);
  const [view, setView] = useState('data'); // 'data' or 'runs'
  const [runningSuite, setRunningSuite] = useState(null); // active run state

  const activeDataset = datasets.find(d => d.id === selectedDs);

  // Form states
  const [newRowInputs, setNewRowInputs] = useState('{"question": ""}');
  const [newRowOutput, setNewRowOutput] = useState('');

  // Runner states
  const [runPromptId, setRunPromptId] = useState('');
  const [runModel, setRunModel] = useState('');
  const [runJudge, setRunJudge] = useState(JUDGE_MODELS[0]);
  
  const prompts = loadPrompts();
  const models = loadModels();

  const createDataset = () => {
    const next = [{ id: `ds_${Date.now()}`, name: 'New Dataset', rows: [], createdAt: Date.now() }, ...datasets];
    setDatasets(next); saveDatasets(next);
    setSelectedDs(next[0].id);
  };

  const deleteDataset = (id) => {
    const next = datasets.filter(d => d.id !== id);
    setDatasets(next); saveDatasets(next);
    if (selectedDs === id) setSelectedDs(null);
  };

  const updateDsName = (name) => {
    if (!activeDataset) return;
    const next = datasets.map(d => d.id === activeDataset.id ? { ...d, name } : d);
    setDatasets(next); saveDatasets(next);
  };

  const addRow = () => {
    if (!activeDataset) return;
    try {
      const inputs = JSON.parse(newRowInputs);
      const row = { id: `row_${Date.now()}`, inputs, expected: newRowOutput };
      const next = datasets.map(d => d.id === activeDataset.id ? { ...d, rows: [...d.rows, row] } : d);
      setDatasets(next); saveDatasets(next);
      setNewRowInputs('{"question": ""}'); setNewRowOutput('');
    } catch (e) {
      alert('Inputs must be valid JSON');
    }
  };

  const deleteRow = (rowId) => {
    if (!activeDataset) return;
    const next = datasets.map(d => d.id === activeDataset.id ? { ...d, rows: d.rows.filter(r => r.id !== rowId) } : d);
    setDatasets(next); saveDatasets(next);
  };

  // ─── suite runner ───
  const runSuite = async () => {
    if (!activeDataset || activeDataset.rows.length === 0) return alert('Dataset is empty');
    if (!runPromptId) return alert('Select a prompt template');
    if (!runModel) return alert('Select a model to test');
    
    // Get keys
    const promptTemplate = prompts.find(p => p.id === runPromptId);
    if (!promptTemplate) return;

    const [tProv, tModId] = runModel.split(':');
    const testKey = localStorage.getItem(`pg_key_${tProv}`);
    if (!testKey) return alert(`No API key set for ${tProv} (go to Playground)`);

    const evalKey = localStorage.getItem(`pg_key_${runJudge.provider}`);
    if (!evalKey) return alert(`No API key set for judge ${runJudge.provider} (go to Playground)`);

    const suiteId = `suite_${Date.now()}`;
    setRunningSuite({ id: suiteId, done: 0, total: activeDataset.rows.length, results: [] });
    setView('runs'); // switch tab

    const newResults = [];
    const tUrl = tProv === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions';
    const evalUrl = runJudge.provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions';

    for (const row of activeDataset.rows) {
      const result = { rowId: row.id, inputs: row.inputs, expected: row.expected, actual: '', score: 0, error: null };
      try {
        // 1. Render prompt
        const sys = renderTemplate(promptTemplate.systemPrompt, row.inputs);
        const usr = renderTemplate(promptTemplate.userPrompt, row.inputs);
        
        // 2. Call target model
        const tCall = await fetch(tUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${testKey}` },
          body: JSON.stringify({ model: tModId, messages: [{role:'system',content:sys},{role:'user',content:usr}], temperature: 0 })
        });
        const tData = await tCall.json();
        const actual = tData.choices?.[0]?.message?.content?.trim() || '';
        result.actual = actual;

        // 3. Call judge model
        if (actual && row.expected) {
          const evalPrompt = `Compare the ACTUAL response to the EXPECTED golden answer.
Rate from 1-5 how accurate and faithful the actual response is. (5 = perfect match/better, 1 = completely wrong).
Return ONLY the number.
EXPECTED: ${row.expected}
ACTUAL: ${actual}`;

          const eCall = await fetch(evalUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${evalKey}` },
            body: JSON.stringify({ model: runJudge.id, messages: [{role:'user',content:evalPrompt}], temperature: 0, max_tokens:5 })
          });
          const eData = await eCall.json();
          const score = parseInt(eData.choices?.[0]?.message?.content?.trim() || '3');
          result.score = (score >=1 && score<=5) ? score : 3;
        }

      } catch (e) {
        result.error = e.message;
      }
      
      newResults.push(result);
      setRunningSuite(prev => ({ ...prev, done: newResults.length, results: [...newResults] }));
    }

    // Save final suite
    const avgScore = newResults.reduce((s, r) => s + (r.score || 0), 0) / (newResults.filter(r => r.score > 0).length || 1);
    const passRate = newResults.filter(r => r.score >= 4).length / (newResults.length || 1) * 100;
    
    const finalSuite = {
      id: suiteId,
      datasetId: activeDataset.id,
      promptId: promptTemplate.id,
      promptName: promptTemplate.name,
      promptVersion: promptTemplate.currentVersion,
      model: runModel,
      judge: runJudge.id,
      timestamp: Date.now(),
      results: newResults,
      avgScore,
      passRate
    };

    const nextSuites = [finalSuite, ...suites];
    setSuites(nextSuites);
    saveSuites(nextSuites);
    setRunningSuite(null);
  };

  const activeSuites = suites.filter(s => s.datasetId === selectedDs);

  return (
    <div className="prompt-tpl-layout">
      {/* Sidebar (reused classes) */}
      <div className="prompt-tpl-sidebar">
        <div className="prompt-tpl-sidebar-header">
          <span className="prompt-tpl-sidebar-title">Datasets</span>
          <button className="prompt-tpl-add-btn" onClick={createDataset}><Plus size={13} /></button>
        </div>
        <div className="prompt-tpl-list">
          {datasets.length === 0 && <div className="prompt-tpl-empty">No datasets yet.</div>}
          {datasets.map(d => (
            <button
              key={d.id} className={`prompt-tpl-item ${selectedDs === d.id ? 'active' : ''}`}
              onClick={() => { setSelectedDs(d.id); setView('data'); }}
            >
              <Database size={12} className="prompt-tpl-item-icon" />
              <div className="prompt-tpl-item-info">
                <span className="prompt-tpl-item-name">{d.name}</span>
                <span className="prompt-tpl-item-meta">{d.rows?.length || 0} rows</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="prompt-tpl-editor">
        {!activeDataset ? (
          <div className="prompt-tpl-placeholder">
            <Database size={32} style={{ color: 'var(--text-3)' }} />
            <p>Select or create a dataset to view golden test cases</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="prompt-tpl-editor-header">
              <input
                type="text" value={activeDataset.name} onChange={e => updateDsName(e.target.value)}
                className="prompt-tpl-name-input"
              />
              <div className="prompt-tpl-editor-actions">
                <button className="prompt-tpl-btn secondary" onClick={() => deleteDataset(activeDataset.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="ds-tabs">
              <button className={`ds-tab ${view === 'data' ? 'active' : ''}`} onClick={() => setView('data')}>
                Data Rows ({activeDataset.rows.length})
              </button>
              <button className={`ds-tab ${view === 'runs' ? 'active' : ''}`} onClick={() => setView('runs')}>
                Test Suites ({activeSuites.length})
              </button>
            </div>

            {view === 'data' ? (
              <div className="ds-data-view">
                <div className="ds-add-row-box">
                  <div className="ds-add-header">Add Golden Row</div>
                  <div className="ds-add-grid">
                    <div>
                      <div className="ds-add-label">Inputs (JSON variables)</div>
                      <textarea className="prompt-tpl-textarea" rows={3} value={newRowInputs} onChange={e => setNewRowInputs(e.target.value)} />
                    </div>
                    <div>
                      <div className="ds-add-label">Expected Output</div>
                      <textarea className="prompt-tpl-textarea" rows={3} value={newRowOutput} onChange={e => setNewRowOutput(e.target.value)} placeholder="The perfect answer..." />
                    </div>
                  </div>
                  <button className="prompt-tpl-btn primary" style={{ marginTop: 8 }} onClick={addRow}><Plus size={11} /> Add to Dataset</button>
                </div>

                <div className="ds-table-wrap" style={{ marginTop: 16 }}>
                  <table className="mc-table">
                    <thead><tr><th>Inputs</th><th>Expected Output</th><th width="40"></th></tr></thead>
                    <tbody>
                      {activeDataset.rows.map(r => (
                        <tr key={r.id}>
                          <td className="mc-mono"><pre style={{ margin: 0, fontSize: 10 }}>{JSON.stringify(r.inputs, null, 2)}</pre></td>
                          <td className="mc-mono" style={{ whiteSpace: 'pre-wrap' }}>{r.expected}</td>
                          <td><button className="ds-del-btn" onClick={() => deleteRow(r.id)}><Trash2 size={12} /></button></td>
                        </tr>
                      ))}
                      {activeDataset.rows.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-3)' }}>No rows added yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="ds-runs-view">
                {/* Runner Config */}
                <div className="ds-runner-box">
                  <div className="ds-runner-title"><Play size={12} /> Run Test Suite</div>
                  <div className="ds-runner-grid">
                    <div>
                      <label className="ds-add-label">Prompt Template</label>
                      <select className="pg-select" value={runPromptId} onChange={e => setRunPromptId(e.target.value)}>
                        <option value="">Select template...</option>
                        {prompts.map(p => <option key={p.id} value={p.id}>{p.name} (v{p.currentVersion})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ds-add-label">Target Model</label>
                      <select className="pg-select" value={runModel} onChange={e => setRunModel(e.target.value)}>
                        <option value="">Select model...</option>
                        {models.map(m => <option key={`${m.provider}:${m.id}`} value={`${m.provider}:${m.id}`}>{m.id} ({m.provider})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ds-add-label">Judge Model</label>
                      <select className="pg-select" value={`${runJudge.provider}:${runJudge.id}`} onChange={e => {
                        const [p, i] = e.target.value.split(':');
                        setRunJudge(JUDGE_MODELS.find(x => x.provider === p && x.id === i));
                      }}>
                        {JUDGE_MODELS.map(m => <option key={`${m.provider}:${m.id}`} value={`${m.provider}:${m.id}`}>{m.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <button className="prompt-tpl-btn accent" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={runSuite} disabled={!!runningSuite}>
                    {runningSuite ? <><Loader size={12} className="spin" /> Running ({runningSuite.done}/{runningSuite.total})</> : 'Start Suite Run'}
                  </button>
                  
                  {runningSuite && (
                    <div className="ds-progress-bar">
                      <div className="ds-progress-fill" style={{ width: `${(runningSuite.done / runningSuite.total) * 100}%` }} />
                    </div>
                  )}
                </div>

                {/* History */}
                <div className="ds-history-list">
                  {activeSuites.map(s => (
                    <div key={s.id} className="ds-suite-card">
                      <div className="ds-suite-header">
                        <div>
                          <div className="ds-suite-title">
                            {s.promptName} <span className="ds-suite-meta">v{s.promptVersion}</span> 
                            <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                            {s.model.split(':')[1]}
                          </div>
                          <div className="ds-suite-date">{new Date(s.timestamp).toLocaleString()}</div>
                        </div>
                        <div className="ds-suite-score">
                          <div className="ds-score-big" style={{ color: s.avgScore >= 4 ? 'var(--green)' : s.avgScore >= 3 ? 'var(--amber)' : 'var(--red)' }}>
                            {s.avgScore.toFixed(1)}
                          </div>
                          <div className="ds-score-lbl">Avg Score</div>
                        </div>
                      </div>
                      
                      {/* Results Table */}
                      <div className="ds-results-table">
                        <table className="mc-table">
                          <thead><tr><th>Variables</th><th>Output vs Expected</th><th width="40">Score</th></tr></thead>
                          <tbody>
                            {s.results.map((r, i) => (
                              <tr key={i}>
                                <td className="mc-mono" style={{ width: 140 }}><pre style={{ margin:0, fontSize:9, whiteSpace:'pre-wrap' }}>{JSON.stringify(r.inputs, null, 2)}</pre></td>
                                <td className="mc-mono">
                                  <div style={{ paddingBottom: 6, borderBottom: '1px solid var(--border-dim)' }}>
                                    <strong style={{ color: 'var(--lime)' }}>ACTUAL:</strong><br/>{r.actual || r.error}
                                  </div>
                                  <div style={{ paddingTop: 6, color: 'var(--text-3)' }}>
                                    <strong>EXPECTED:</strong><br/>{r.expected}
                                  </div>
                                </td>
                                <td className="mc-mono mc-right">
                                  <span style={{ padding: '2px 6px', borderRadius: 4, background: r.score >= 4 ? 'rgba(0,230,118,0.1)' : r.score >= 3 ? 'rgba(255,179,0,0.1)' : 'rgba(255,68,68,0.1)', color: r.score >= 4 ? 'var(--green)' : r.score >= 3 ? 'var(--amber)' : 'var(--red)' }}>
                                    {r.score}/5
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
