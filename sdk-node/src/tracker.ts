/**
 * Runetrace Node.js SDK — Core Tracker
 * 
 * Features: auto-batching, retry with exponential backoff,
 * async flush, graceful shutdown, trackLLM wrapper.
 */

import type { RunetraceConfig, LogEntry, LLMCallResult } from './types';
import { getCost } from './pricing';

// ── Configuration ──────────────────────────────────

const config: Required<Omit<RunetraceConfig, 'anonKey' | 'userId' | 'sessionId' | 'tags' | 'metadata'>> & {
  anonKey: string;
  userId: string;
  sessionId: string;
  tags: string[];
  metadata: Record<string, unknown>;
} = {
  supabaseUrl: process.env.RUNETRACE_SUPABASE_URL || '',
  apiKey: process.env.RUNETRACE_API_KEY || '',
  anonKey: process.env.RUNETRACE_ANON_KEY || '',
  projectId: process.env.RUNETRACE_PROJECT_ID || 'default',
  batchSize: 10,
  flushInterval: 5,
  maxRetries: 3,
  enabled: true,
  userId: process.env.RUNETRACE_USER_ID || '',
  sessionId: '',
  tags: [],
  metadata: {},
};

/**
 * Configure the Runetrace SDK.
 */
export function configure(options: Partial<RunetraceConfig>): void {
  if (options.supabaseUrl !== undefined) config.supabaseUrl = options.supabaseUrl.replace(/\/$/, '');
  if (options.apiKey !== undefined) config.apiKey = options.apiKey;
  if (options.anonKey !== undefined) config.anonKey = options.anonKey;
  if (options.projectId !== undefined) config.projectId = options.projectId;
  if (options.batchSize !== undefined) config.batchSize = Math.max(1, options.batchSize);
  if (options.flushInterval !== undefined) config.flushInterval = Math.max(1, options.flushInterval);
  if (options.maxRetries !== undefined) config.maxRetries = Math.max(0, options.maxRetries);
  if (options.enabled !== undefined) config.enabled = options.enabled;
  if (options.userId !== undefined) config.userId = options.userId;
  if (options.sessionId !== undefined) config.sessionId = options.sessionId;
  if (options.tags !== undefined) config.tags = [...options.tags];
  if (options.metadata !== undefined) config.metadata = { ...options.metadata };

  ensureTimerRunning();
}

// ── Batch Queue ────────────────────────────────────

const queue: Record<string, unknown>[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let timerRunning = false;

function ensureTimerRunning(): void {
  if (!timerRunning && config.supabaseUrl) {
    timerRunning = true;
    scheduleFlush();
  }
}

function scheduleFlush(): void {
  flushTimer = setTimeout(() => {
    flushQueue();
    if (timerRunning) scheduleFlush();
  }, config.flushInterval * 1000);

  // Don't block process exit
  if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
    flushTimer.unref();
  }
}

function addToQueue(payload: Record<string, unknown>): void {
  queue.push(payload);
  if (queue.length >= config.batchSize) {
    flushQueue();
  }
  ensureTimerRunning();
}

function flushQueue(): void {
  if (queue.length === 0) return;
  const batch = queue.splice(0);
  // Fire-and-forget: send each log
  for (const payload of batch) {
    sendWithRetry(payload).catch((err) => {
      console.warn('[runetrace] Failed to send log:', err.message);
    });
  }
}

/**
 * Manually flush all pending logs. Call before process exit.
 */
export async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0);
  await Promise.allSettled(batch.map((p) => sendWithRetry(p)));
}

// ── HTTP Sender with Retry ─────────────────────────

async function sendWithRetry(payload: Record<string, unknown>): Promise<boolean> {
  const url = `${config.supabaseUrl}/rest/v1/rpc/ingest_log`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) headers['x-api-key'] = config.apiKey;
  if (config.anonKey) {
    headers['apikey'] = config.anonKey;
    headers['Authorization'] = `Bearer ${config.anonKey}`;
  }

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ payload }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) return true;
      if (res.status < 500) {
        // Client error — don't retry
        const text = await res.text().catch(() => '');
        console.warn(`[runetrace] HTTP ${res.status}: ${text.slice(0, 200)}`);
        return false;
      }
      console.warn(`[runetrace] HTTP ${res.status}, attempt ${attempt + 1}/${config.maxRetries + 1}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[runetrace] Request failed (attempt ${attempt + 1}): ${msg}`);
    }

    if (attempt < config.maxRetries) {
      const backoff = Math.min(2 ** attempt * 500, 8000);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  console.error('[runetrace] Failed to send log after all retries');
  return false;
}

// ── Manual Log ─────────────────────────────────────

/**
 * Manually log an LLM call.
 */
export function log(entry: LogEntry): void {
  if (!config.enabled) return;

  const cost = entry.cost ?? getCost(
    entry.model,
    entry.prompt_tokens ?? 0,
    entry.completion_tokens ?? 0,
  );

  const payload: Record<string, unknown> = {
    project_id: config.projectId,
    model: entry.model,
    prompt: entry.prompt ?? '',
    response: entry.response ?? '',
    prompt_tokens: entry.prompt_tokens ?? 0,
    completion_tokens: entry.completion_tokens ?? 0,
    latency_ms: entry.latency_ms ?? 0,
    cost,
    function_name: entry.function_name ?? '',
    user_id: entry.user_id ?? config.userId,
    session_id: entry.session_id ?? config.sessionId,
    tags: entry.tags ?? config.tags,
    metadata: { ...config.metadata, ...entry.metadata },
    trace_id: entry.trace_id ?? '',
    created_at: entry.created_at ?? new Date().toISOString(),
  };

  addToQueue(payload);
}

// ── trackLLM Wrapper ───────────────────────────────

/**
 * Wrap an async function that calls an LLM to automatically track it.
 * 
 * The wrapped function should return an OpenAI-compatible response object
 * with `model`, `usage.prompt_tokens`, `usage.completion_tokens`, and
 * optionally `choices[0].message.content`.
 * 
 * @example
 * ```ts
 * const ask = runetrace.trackLLM(async (prompt: string) => {
 *   return openai.chat.completions.create({
 *     model: 'gpt-4o',
 *     messages: [{ role: 'user', content: prompt }],
 *   });
 * });
 * 
 * const result = await ask("Hello!");
 * ```
 */
export function trackLLM<TArgs extends unknown[], TResult extends LLMCallResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options?: { functionName?: string },
): (...args: TArgs) => Promise<TResult> {
  const functionName = options?.functionName ?? (fn.name || 'anonymous');

  return async (...args: TArgs): Promise<TResult> => {
    if (!config.enabled) return fn(...args);

    const start = performance.now();
    let result: TResult;

    try {
      result = await fn(...args);
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      // Log the error
      log({
        model: 'unknown',
        function_name: functionName,
        latency_ms: latency,
        prompt: typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]),
        metadata: { error: err instanceof Error ? err.message : String(err) },
      });
      throw err;
    }

    const latency = Math.round(performance.now() - start);

    // Extract data from OpenAI-compatible response
    const model = result.model ?? 'unknown';
    const promptTokens = result.usage?.prompt_tokens ?? 0;
    const completionTokens = result.usage?.completion_tokens ?? 0;

    // Extract the response text
    let responseText = '';
    if (result.choices?.[0]?.message?.content) {
      responseText = result.choices[0].message.content;
    } else if (result.choices?.[0]?.text) {
      responseText = result.choices[0].text;
    }

    // Extract the prompt from args (best-effort)
    let promptText = '';
    if (typeof args[0] === 'string') {
      promptText = args[0];
    } else if (typeof args[0] === 'object' && args[0] !== null) {
      const arg = args[0] as Record<string, unknown>;
      if (Array.isArray(arg.messages)) {
        const last = arg.messages[arg.messages.length - 1] as Record<string, unknown>;
        promptText = (last?.content as string) ?? '';
      }
    }

    log({
      model,
      prompt: promptText,
      response: responseText,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      latency_ms: latency,
      function_name: functionName,
    });

    return result;
  };
}

// ── Graceful Shutdown ──────────────────────────────

if (typeof process !== 'undefined') {
  const shutdown = () => {
    if (flushTimer) clearTimeout(flushTimer);
    timerRunning = false;
    // Synchronous best-effort flush
    flushQueue();
  };

  process.on('beforeExit', shutdown);
  process.on('SIGINT', () => { shutdown(); process.exit(0); });
  process.on('SIGTERM', () => { shutdown(); process.exit(0); });
}
