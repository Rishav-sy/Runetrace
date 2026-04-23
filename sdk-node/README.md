# runetrace — Node.js SDK

Open-source LLM observability for Node.js. Track cost, latency, and behavior of every LLM call.

## Install

```bash
npm install runetrace
```

## Quick Start

```javascript
const runetrace = require('runetrace');
const OpenAI = require('openai');

// Configure with your Supabase project
runetrace.configure({
  supabaseUrl: 'https://your-project.supabase.co',
  anonKey: 'your-supabase-anon-key',
  apiKey: 'your-runetrace-api-key',  // rt_live_xxx
  projectId: 'my-app',
});

const openai = new OpenAI();

// Wrap any async LLM function
const ask = runetrace.trackLLM(async (prompt) => {
  return openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });
});

const result = await ask('What is the meaning of life?');
// ✅ Prompt, response, cost, latency, tokens — all tracked automatically
```

## Manual Logging

```javascript
runetrace.log({
  model: 'gpt-4o',
  prompt: 'Hello',
  response: 'Hi there!',
  prompt_tokens: 5,
  completion_tokens: 3,
  latency_ms: 230,
  function_name: 'greet',
});
```

## Configuration

```javascript
runetrace.configure({
  supabaseUrl: 'https://xxx.supabase.co',  // Required
  apiKey: 'rt_live_xxx',                     // Required
  anonKey: 'eyJxxx',                         // Supabase anon key
  projectId: 'my-app',                       // Default: 'default'
  batchSize: 10,                             // Logs batched before send
  flushInterval: 5,                          // Seconds between auto-flush
  maxRetries: 3,                             // Retry on failure
  userId: 'user-123',                        // Per-user tracking
  sessionId: 'session-abc',                  // Group related calls
  tags: ['production', 'v2'],                // Categorization
  metadata: { env: 'prod' },                 // Custom metadata
});
```

## Environment Variables

All config options can also be set via environment variables:

| Variable | Description |
|---|---|
| `RUNETRACE_SUPABASE_URL` | Supabase project URL |
| `RUNETRACE_API_KEY` | Runetrace API key |
| `RUNETRACE_ANON_KEY` | Supabase anon key |
| `RUNETRACE_PROJECT_ID` | Project ID |
| `RUNETRACE_USER_ID` | Default user ID |

## Flush on Exit

The SDK automatically flushes pending logs on process exit. For manual control:

```javascript
await runetrace.flush();
```

## License

MIT
