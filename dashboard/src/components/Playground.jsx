import { useState, useCallback, useEffect } from 'react';
import { Play, Columns, Copy, Check, Zap, Clock, Hash, RefreshCw, Globe, Settings } from 'lucide-react';

const DEFAULT_SYSTEM = 'You are a helpful assistant.';

const PROVIDERS = {
  groq: {
    name: 'Groq',
    base: 'https://api.groq.com/openai/v1',
    placeholder: 'gsk_...',
    fallbackModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it', 'mixtral-8x7b-32768'],
  },
  openai: {
    name: 'OpenAI',
    base: 'https://api.openai.com/v1',
    placeholder: 'sk-...',
    fallbackModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-mini', 'o3-mini'],
  },
  anthropic: {
    name: 'Anthropic',
    base: 'https://api.anthropic.com/v1',
    placeholder: 'sk-ant-...',
    isAnthropic: true,
    fallbackModels: ['claude-3.5-sonnet-20241022', 'claude-3.5-haiku-20241022', 'claude-3-opus-20240229'],
  },
  together: {
    name: 'Together AI',
    base: 'https://api.together.xyz/v1',
    placeholder: 'tok_...',
    fallbackModels: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1', 'deepseek-ai/DeepSeek-V3'],
  },
  fireworks: {
    name: 'Fireworks AI',
    base: 'https://api.fireworks.ai/inference/v1',
    placeholder: 'fw_...',
    fallbackModels: ['accounts/fireworks/models/llama-v3p3-70b-instruct', 'accounts/fireworks/models/mixtral-8x7b-instruct'],
  },
  deepseek: {
    name: 'DeepSeek',
    base: 'https://api.deepseek.com/v1',
    placeholder: 'sk-...',
    fallbackModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
  mistral: {
    name: 'Mistral AI',
    base: 'https://api.mistral.ai/v1',
    placeholder: 'mis_...',
    fallbackModels: ['mistral-large-latest', 'mistral-small-latest', 'open-mixtral-8x7b'],
  },
  openrouter: {
    name: 'OpenRouter',
    base: 'https://openrouter.ai/api/v1',
    placeholder: 'sk-or-...',
    fallbackModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.3-70b-instruct', 'google/gemini-2.0-flash-001'],
  },
  perplexity: {
    name: 'Perplexity',
    base: 'https://api.perplexity.ai',
    placeholder: 'pplx-...',
    fallbackModels: ['sonar-pro', 'sonar', 'sonar-reasoning'],
  },
  custom: {
    name: '✦ Custom API',
    base: '',
    placeholder: 'Bearer token...',
    fallbackModels: [],
  },
};

export default function Playground() {
  const [provider, setProvider] = useState(() => localStorage.getItem('pg_provider') || 'groq');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(`pg_key_${localStorage.getItem('pg_provider') || 'groq'}`) || '');
  const [customUrl, setCustomUrl] = useState(() => localStorage.getItem('pg_custom_url') || '');
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [model, setModel] = useState(() => localStorage.getItem('pg_model') || 'llama-3.3-70b-versatile');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM);
  const [userPrompt, setUserPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [topP, setTopP] = useState(1.0);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [copied, setCopied] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [model2, setModel2] = useState('gpt-4o');
  const [response2, setResponse2] = useState(null);
  const [metrics2, setMetrics2] = useState(null);
  const [loading2, setLoading2] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pg_history')) || []; }
    catch { return []; }
  });

  const prov = PROVIDERS[provider] || PROVIDERS.groq;
  const baseUrl = provider === 'custom' ? customUrl.replace(/\/+$/, '') : prov.base;

  // Persist provider + key
  const saveConfig = () => {
    localStorage.setItem('pg_provider', provider);
    localStorage.setItem(`pg_key_${provider}`, apiKey);
    if (provider === 'custom') localStorage.setItem('pg_custom_url', customUrl);
  };

  // Fetch models from /v1/models endpoint
  const fetchModels = useCallback(async () => {
    if (!apiKey || !baseUrl) {
      setModels(prov.fallbackModels || []);
      return;
    }
    setModelsLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${apiKey}` };
      // Anthropic uses x-api-key
      if (prov.isAnthropic) {
        delete headers.Authorization;
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
      }
      const res = await fetch(`${baseUrl}/models`, { headers });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const list = (data.data || data.models || [])
        .map(m => m.id || m.name || m)
        .filter(Boolean)
        .sort();
      if (list.length > 0) {
        setModels(list);
      } else {
        setModels(prov.fallbackModels || []);
      }
    } catch {
      setModels(prov.fallbackModels || []);
    } finally {
      setModelsLoading(false);
    }
  }, [apiKey, baseUrl, provider]);

  // Auto-fetch models when provider/key changes
  useEffect(() => {
    if (apiKey) {
      fetchModels();
    } else {
      setModels(prov.fallbackModels || []);
    }
  }, [provider, apiKey]);

  // Pick up test-prompt from Prompts tab (stored in localStorage before tab switch)
  const [autoRun, setAutoRun] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('rune_test_prompt');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.ts && Date.now() - data.ts < 3000) {
          if (data.systemPrompt) setSystemPrompt(data.systemPrompt);
          if (data.userPrompt) setUserPrompt(data.userPrompt);
          setAutoRun(true);
        }
        localStorage.removeItem('rune_test_prompt');
      }
    } catch {}
  }, []);

  // When provider changes, load saved key for that provider
  useEffect(() => {
    const savedKey = localStorage.getItem(`pg_key_${provider}`) || '';
    setApiKey(savedKey);
    if (prov.fallbackModels?.length) {
      setModel(prov.fallbackModels[0]);
    }
  }, [provider]);

  const callLLM = useCallback(async (modelId) => {
    if (!apiKey) { setShowKeyModal(true); return null; }

    const chatUrl = prov.isAnthropic
      ? `${baseUrl}/messages`
      : `${baseUrl}/chat/completions`;

    const headers = { 'Content-Type': 'application/json' };

    if (prov.isAnthropic) {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const body = prov.isAnthropic
      ? {
          model: modelId,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          temperature,
          max_tokens: maxTokens,
        }
      : {
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
        };

    const start = performance.now();
    const res = await fetch(chatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const elapsed = performance.now() - start;
    const data = await res.json();

    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    // Parse response — handle OpenAI format & Anthropic format
    const text = prov.isAnthropic
      ? (data.content?.[0]?.text || '(no response)')
      : (data.choices?.[0]?.message?.content || '(no response)');

    const usage = prov.isAnthropic
      ? { prompt_tokens: data.usage?.input_tokens || 0, completion_tokens: data.usage?.output_tokens || 0 }
      : data.usage || {};

    return {
      text,
      metrics: {
        latency: elapsed.toFixed(0),
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      }
    };
  }, [apiKey, provider, baseUrl, systemPrompt, userPrompt, temperature, maxTokens, topP]);

  const handleRun = useCallback(async () => {
    if (!userPrompt.trim()) return;
    if (!apiKey) { setShowKeyModal(true); return; }
    setLoading(true);
    setError(null);
    setResponse(null);
    setMetrics(null);
    setResponse2(null);
    setMetrics2(null);

    if (compareMode) {
      // Fire both calls in parallel so both spinners show at the same time
      setLoading2(true);
      const [r1, r2] = await Promise.allSettled([callLLM(model), callLLM(model2)]);

      if (r1.status === 'fulfilled' && r1.value) {
        setResponse(r1.value.text);
        setMetrics(r1.value.metrics);
      } else if (r1.status === 'rejected') {
        setError(r1.reason?.message || 'Model 1 failed');
      }

      if (r2.status === 'fulfilled' && r2.value) {
        setResponse2(r2.value.text);
        setMetrics2(r2.value.metrics);
      } else if (r2.status === 'rejected') {
        setResponse2(`Error: ${r2.reason?.message || 'Model 2 failed'}`);
      }

      setLoading(false);
      setLoading2(false);
    } else {
      // Single model
      try {
        const result = await callLLM(model);
        if (!result) { setLoading(false); return; }
        setResponse(result.text);
        setMetrics(result.metrics);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    // Save history
    const entry = { prompt: userPrompt.slice(0, 80), model, provider, timestamp: Date.now() };
    const newHistory = [entry, ...history].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('pg_history', JSON.stringify(newHistory));
    localStorage.setItem('pg_model', model);
  }, [userPrompt, apiKey, compareMode, model, model2, callLLM, provider, history]);

  // Auto-run if triggered from Prompts tab
  useEffect(() => {
    if (autoRun && userPrompt.trim() && apiKey) {
      setAutoRun(false);
      setTimeout(() => handleRun(), 50); 
    }
  }, [autoRun, userPrompt, apiKey, handleRun]);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const allModels = models.length > 0 ? models : (prov.fallbackModels || []);

  return (
    <div className="playground-layout">
      {/* API Key / Provider Modal */}
      {showKeyModal && (
        <div className="pg-modal-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="pg-modal" onClick={e => e.stopPropagation()}>
            <h3>Configure Provider</h3>
            <p>Select a provider and enter your API key. Keys are stored per-provider in your browser's localStorage.</p>

            <label className="pg-label" style={{ marginTop: 8 }}>Provider</label>
            <select value={provider} onChange={e => setProvider(e.target.value)} className="pg-select">
              {Object.entries(PROVIDERS).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>

            {provider === 'custom' && (
              <>
                <label className="pg-label" style={{ marginTop: 8 }}>Base URL (OpenAI-compatible)</label>
                <input
                  type="text"
                  placeholder="https://your-api.com/v1"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  className="pg-input"
                />
              </>
            )}

            <label className="pg-label" style={{ marginTop: 8 }}>API Key</label>
            <input
              type="password"
              placeholder={prov.placeholder || 'API Key'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="pg-input"
              autoFocus
            />

            <div className="pg-modal-actions">
              <button className="pg-btn-secondary" onClick={() => setShowKeyModal(false)}>Cancel</button>
              <button className="pg-btn-primary" onClick={() => { saveConfig(); setShowKeyModal(false); fetchModels(); }}>
                Save & Fetch Models
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Panel */}
      <div className="pg-input-panel">
        <div className="pg-panel-header">
          <span className="pg-panel-title">Input</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="pg-key-btn" onClick={() => setShowKeyModal(true)}>
              <Settings size={11} />
              {apiKey ? prov.name : '⚠ Configure'}
            </button>
          </div>
        </div>

        {/* Model selector with refresh */}
        <div className="pg-model-row" style={{ display: 'flex', gap: 6 }}>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="pg-select"
            style={{ flex: 1 }}
          >
            {allModels.map(m => <option key={m} value={m}>{m}</option>)}
            {allModels.length === 0 && <option value="">No models — set API key</option>}
          </select>
          <button
            className="pg-key-btn"
            onClick={fetchModels}
            disabled={modelsLoading}
            title="Refresh model list from API"
            style={{ padding: '6px 8px' }}
          >
            <RefreshCw size={12} className={modelsLoading ? 'spin' : ''} />
          </button>
        </div>
        {modelsLoading && <div className="pg-models-status">Fetching models...</div>}
        {!modelsLoading && models.length > 0 && (
          <div className="pg-models-status">{models.length} models loaded from API</div>
        )}

        <div className="pg-section">
          <label className="pg-label">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            className="pg-textarea small"
            rows={2}
          />
        </div>

        <div className="pg-section">
          <label className="pg-label">User Prompt</label>
          <textarea
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            className="pg-textarea"
            rows={8}
            placeholder="Enter your prompt here..."
          />
        </div>

        <div className="pg-settings">
          <div className="pg-setting">
            <label>Temperature: {temperature.toFixed(1)}</label>
            <input type="range" min="0" max="2" step="0.1" value={temperature}
              onChange={e => setTemperature(parseFloat(e.target.value))} />
          </div>
          <div className="pg-setting">
            <label>Max Tokens</label>
            <div className="rune-stepper">
              <button 
                className="rune-stepper-btn"
                onClick={() => setMaxTokens(Math.max(1, maxTokens - 256))}
              >−</button>
              <input
                type="number"
                value={maxTokens}
                onChange={e => setMaxTokens(parseInt(e.target.value) || 1024)}
                className="rune-stepper-input"
                style={{ width: '60px' }}
                min={1} max={131072}
              />
              <button 
                className="rune-stepper-btn"
                onClick={() => setMaxTokens(Math.min(131072, maxTokens + 256))}
              >+</button>
            </div>
          </div>
          <div className="pg-setting">
            <label>Top-P: {topP.toFixed(1)}</label>
            <input type="range" min="0" max="1" step="0.05" value={topP}
              onChange={e => setTopP(parseFloat(e.target.value))} />
          </div>
        </div>

        <div className="pg-actions">
          <button className="pg-run-btn" onClick={handleRun} disabled={loading || !userPrompt.trim()}>
            {loading ? <span className="pg-spinner" /> : <Play size={14} />}
            {loading ? 'Running...' : 'Run'}
          </button>
          <button className={`pg-compare-btn ${compareMode ? 'active' : ''}`}
            onClick={() => setCompareMode(!compareMode)}>
            <Columns size={14} /> Compare
          </button>
        </div>

        {compareMode && (
          <div className="pg-model-row" style={{ marginTop: 8 }}>
            <label className="pg-label" style={{ marginBottom: 4 }}>Compare with:</label>
            <select value={model2} onChange={e => setModel2(e.target.value)} className="pg-select">
              {allModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}

        {history.length > 0 && (
          <div className="pg-history">
            <span className="pg-label">Recent</span>
            {history.map((h, i) => (
              <div key={i} className="pg-history-item" onClick={() => { setUserPrompt(h.prompt); if (h.provider) setProvider(h.provider); }}>
                <span className="pg-history-text">{h.prompt}</span>
                <span className="pg-history-model">{h.model?.split('/').pop()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Panel — Output */}
      <div className="pg-output-panel">
        <div className="pg-panel-header">
          <span className="pg-panel-title">Output</span>
          {response && (
            <button className="copy-btn" onClick={() => copy(response, 'pg-resp')}>
              {copied === 'pg-resp' ? <Check size={12} /> : <Copy size={12} />}
              {copied === 'pg-resp' ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>

        {error && (
          <div className="pg-error"><span>Error: {error}</span></div>
        )}

        {!compareMode ? (
          <>
            <div className="pg-response-area">
              {loading ? (
                <div className="pg-loading"><span className="pg-spinner" /><span>Generating response...</span></div>
              ) : response ? (
                <div className="pg-response-text">{response}</div>
              ) : (
                <div className="pg-placeholder">Run a prompt to see the output here</div>
              )}
            </div>
            {metrics && (
              <div className="pg-metrics-bar">
                <span><Clock size={12} /> {metrics.latency}ms</span>
                <span><Hash size={12} /> {metrics.promptTokens} in / {metrics.completionTokens} out</span>
                <span><Zap size={12} /> {metrics.totalTokens} total</span>
              </div>
            )}
          </>
        ) : (
          <div className="pg-compare-grid">
            <div className="pg-compare-col">
              <div className="pg-compare-header">{model.split('/').pop()}</div>
              <div className="pg-response-area compact">
                {loading ? <div className="pg-loading"><span className="pg-spinner" /></div>
                  : response ? <div className="pg-response-text">{response}</div>
                  : <div className="pg-placeholder">—</div>}
              </div>
              {metrics && <div className="pg-metrics-bar compact"><span>{metrics.latency}ms</span><span>{metrics.totalTokens} tok</span></div>}
            </div>
            <div className="pg-compare-col">
              <div className="pg-compare-header">{model2.split('/').pop()}</div>
              <div className="pg-response-area compact">
                {loading2 ? <div className="pg-loading"><span className="pg-spinner" /></div>
                  : response2 ? <div className="pg-response-text">{response2}</div>
                  : <div className="pg-placeholder">—</div>}
              </div>
              {metrics2 && <div className="pg-metrics-bar compact"><span>{metrics2.latency}ms</span><span>{metrics2.totalTokens} tok</span></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
