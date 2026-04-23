export interface RunetraceConfig {
  /** Supabase project URL (e.g. https://xxx.supabase.co) */
  supabaseUrl: string;
  /** Runetrace API key (rt_live_xxx) */
  apiKey: string;
  /** Supabase anon key for REST API routing */
  anonKey?: string;
  /** Project identifier for grouping logs */
  projectId?: string;
  /** Number of logs to batch before sending */
  batchSize?: number;
  /** Seconds between automatic flushes */
  flushInterval?: number;
  /** Max retry attempts on failure */
  maxRetries?: number;
  /** Whether tracking is enabled */
  enabled?: boolean;
  /** Optional user ID for per-user analytics */
  userId?: string;
  /** Optional session ID for grouping related calls */
  sessionId?: string;
  /** Optional tags for categorization */
  tags?: string[];
  /** Optional custom metadata */
  metadata?: Record<string, unknown>;
}

export interface LogEntry {
  model: string;
  prompt?: string;
  response?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  latency_ms?: number;
  cost?: number;
  function_name?: string;
  user_id?: string;
  session_id?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  trace_id?: string;
  created_at?: string;
}

export interface LLMCallResult {
  /** The raw response from the LLM provider */
  choices?: Array<{ message?: { content?: string }; text?: string }>;
  /** OpenAI-style usage object */
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  /** The model used */
  model?: string;
  /** Catch-all for other response fields */
  [key: string]: unknown;
}
