<div align="center">
  <h1>⚡ Runetrace</h1>
  <p><strong>Open-source LLM Observability — know exactly what your AI is doing.</strong></p>
  <p><em>Track cost, latency, and behavior across every LLM call with a single decorator.</em></p>

  <a href="#-quick-start"><img src="https://img.shields.io/badge/install-2_lines-brightgreen?style=for-the-badge" alt="2-line install" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT License" /></a>
  <a href="https://pypi.org/project/runetrace/"><img src="https://img.shields.io/badge/pypi-v0.1.0-orange?style=for-the-badge" alt="PyPI" /></a>
  <a href="https://www.npmjs.com/package/runetrace"><img src="https://img.shields.io/badge/npm-v0.1.0-red?style=for-the-badge" alt="npm" /></a>
</div>

<br />

Runetrace gives developers complete visibility into their AI application's **cost**, **latency**, and **behavior** — with a stunning, interactive real-time dashboard and SDKs for Python and Node.js.

---

## ✨ Features

- 🎯 **One-line tracking** — Add `@track_llm` (Python) or `trackLLM()` (Node.js) to instantly capture tokens, cost, latency, and errors.
- 💰 **Auto cost calculation** — Supports 30+ models across OpenAI, Anthropic, Google, Meta, Mistral, xAI, and DeepSeek.
- ⚡ **Zero overhead** — Logs are batched and sent asynchronously. Your AI calls aren't slowed down.
- 🔒 **Self-hosted & private** — Your prompts, responses, and API keys stay in your own infrastructure.
- 🔐 **Auth built-in** — Email/password + Google/GitHub SSO via Supabase Auth.
- 🧪 **LLM-as-a-Judge** — Built-in Auto-Eval: score your outputs on relevance, accuracy, helpfulness, tone, coherence, and safety using any judge model.
- 🛝 **Playground** — Test prompts against multiple models side-by-side directly in the dashboard.
- 📊 **30+ visualizations** — Cost forecasting, latency percentiles, model comparison, function heatmaps, throughput charts, and more.

---

## 🖥️ Dashboard

Runetrace ships with a premium, Grafana-inspired dark dashboard:

| Feature | Description |
|---|---|
| **Overview** | Metric cards (spend, requests, latency, error rate), call volume over time, cost by model, token consumption |
| **Analytics** | Model comparison table, latency heatmap, throughput, user analytics, evaluation scores, cost forecast |
| **Auto-Eval** | LLM-as-a-Judge evaluation with real-time streaming terminal, configurable criteria and judge models |
| **Logs** | Sortable, searchable request table with click-to-expand detail drawer, CSV/JSON export |
| **Traces** | Hierarchical trace view for multi-step LLM workflows |
| **Prompts** | Prompt template management with version history |
| **Playground** | Multi-model prompt testing with custom system prompts and token controls |

**Interactive features:** Click any chart element to filter logs. Click any log row to expand full prompt/response details. Everything cross-links.

---

## 🚀 Quick Start

### 1. Install the SDK

**Python:**
```bash
pip install runetrace
```

**Node.js:**
```bash
npm install runetrace
```

### 2. Track your LLM calls

**Python:**
```python
import runetrace
from openai import OpenAI

runetrace.configure(
    api_url="https://your-project.supabase.co",
    api_key="your-runetrace-api-key",
    project_id="my-ai-app"
)

client = OpenAI()

@runetrace.track_llm
def ask(prompt):
    return client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )

response = ask("What is the meaning of life?")
# ✅ Prompt, response, cost, latency, and tokens are automatically tracked!
```

**Node.js:**
```javascript
const runetrace = require('runetrace');
const OpenAI = require('openai');

runetrace.configure({
  supabaseUrl: 'https://your-project.supabase.co',
  apiKey: 'your-runetrace-api-key',
  projectId: 'my-ai-app',
});

const openai = new OpenAI();

const ask = runetrace.trackLLM(async (prompt) => {
  return openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });
});

await ask("What is the meaning of life?");
// ✅ Automatically tracked!
```

---

## 🏗️ Architecture

```text
┌─────────────────┐                          ┌──────────────────────┐
│  Your App       │    POST /rpc/ingest_log   │                      │
│  + Python SDK   │ ────────────────────────▶ │   Supabase           │
│  + Node.js SDK  │    (Async Batching)       │   ┌──────────────┐   │
└─────────────────┘                           │   │  PostgreSQL   │   │
                                              │   │  (request_logs)│  │
┌─────────────────┐    Supabase JS Client     │   └──────────────┘   │
│  React (Vite)   │ ◀──────────────────────── │   ┌──────────────┐   │
│  Dashboard      │                           │   │  Auth (SSO)   │   │
└─────────────────┘                           │   └──────────────┘   │
                                              └──────────────────────┘
```

The SDK sends logs to a Supabase RPC function (`ingest_log`) that validates the API key and inserts into PostgreSQL. The dashboard reads directly from Supabase with Row-Level Security ensuring data isolation per organization.

---

## 🛠️ Self-Host in 5 Minutes

### Prerequisites
- A free [Supabase](https://supabase.com) project
- Node.js 18+ (for the dashboard)

### 1. Clone & Setup Database

```bash
git clone https://github.com/Rishav-sy/Runetrace.git
cd Runetrace
```

Run the SQL files in your Supabase SQL Editor (in order):
1. `dashboard/supabase_schema.sql` — Creates organizations, API keys, and auth trigger
2. `dashboard/supabase_requests.sql` — Creates the request_logs table and ingest RPC

### 2. Configure & Run Dashboard

```bash
cd dashboard
npm install

# Copy the example env and fill in your Supabase credentials
cp .env.example .env.local
# Edit .env.local with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm run dev
```

Navigate to `http://localhost:5173` — sign up, and you're ready to go!

### Docker (Alternative)

```bash
docker compose up -d
# Dashboard available at http://localhost:3000
```

> **Note:** You still need an external Supabase project for the database and auth. The Docker setup only containerizes the dashboard frontend.

---

## 📦 Supported Models

| Provider | Models |
|---|---|
| **OpenAI** | GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo, o1, o1-mini, o3-mini |
| **Anthropic** | Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus/Sonnet/Haiku |
| **Google** | Gemini 2.5 Pro/Flash, Gemini 2.0 Pro/Flash, Gemini 1.5 Pro/Flash |
| **Meta** | Llama 3.3 (70B), Llama 3.1 (405B, 70B, 8B) |
| **Mistral** | Mistral Large, Mistral Small, Mixtral 8x7B |
| **xAI** | Grok 2, Grok 2 Vision |
| **DeepSeek** | DeepSeek V3, DeepSeek R1 |

_Fuzzy matching ensures variants like `gpt-4o-2024-05-13` map correctly to `gpt-4o`._

---

<details>
<summary><strong>🗂️ Legacy: AWS Self-Host (Terraform)</strong></summary>

Runetrace was originally built on AWS Lambda + DynamoDB. This path still works if you prefer AWS:

```bash
cd terraform
terraform init
terraform apply -auto-approve
# Copy the api_url and api_key from outputs
```

See `backend/get_logs.py` for the Lambda handler and `terraform/main.tf` for the full infrastructure definition.

</details>

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Areas where help is needed:**
- 🧩 **SDK:** Support for more LLM providers (Cohere, AI21)
- 📊 **Dashboard:** Additional chart types and visualizations
- 🧪 **Testing:** Comprehensive test coverage
- 📖 **Docs:** Better documentation and examples
- 🌍 **i18n:** Internationalization support

## 📄 License

[MIT](LICENSE) — use it however you want.

---

<p align="center">
  <strong>Built for builders by <a href="https://github.com/Rishav-sy">Rishav</a></strong>
</p>
