<div align="center">
  <h1>⚡ Runetrace</h1>
  <p><strong>Free, Serverless LLM Observability — for exactly $0.00/month.</strong></p>
  <p><em>"Because you shouldn't need a $500/month tool to know what your AI is doing."</em></p>

  <a href="#-quick-start"><img src="https://img.shields.io/badge/install-2_lines-brightgreen?style=for-the-badge" alt="2-line install" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT License" /></a>
  <a href="https://pypi.org/project/runetrace/"><img src="https://img.shields.io/badge/pypi-v0.1.0-orange?style=for-the-badge" alt="PyPI" /></a>
</div>

<br />

Runetrace gives developers complete visibility into their AI application's **cost**, **latency**, and **behavior** — using just a single Python decorator and a stunning, interactive real-time React dashboard.

The entire backend runs entirely on the **AWS Free Tier** (Lambda + API Gateway + DynamoDB) and deploys with one simple Terraform command. No credit card risk. No vendor lock-in. 100% self-hosted and private.

---

## ✨ Features

- 🎯 **One-line tracking** — Add `@track_llm` to any function to instantly track tokens, cost, latency, and errors.
- 💰 **Auto Cost Calculation** — Supports 30+ of the latest models (OpenAI, Anthropic Claude 3.7, Google Gemini 2.5, Meta, Mistral, xAI Grok).
- ⚡ **Zero Overhead** — Your AI calls aren't slowed down; logs are batched and sent asynchronously by background threads.
- 🔒 **100% Data Privacy** — Self-hosted. Your prompts, responses, and API keys never leave your AWS account.
- 🆓 **$0/month** — Designed to run entirely within the AWS Free Tier.
- 🏗️ **Infrastructure as Code** — One `terraform apply` stands up the entire serverless ingestion pipeline.

## 🖥️ The Interactive Dashboard

Runetrace ships with a Grafana-style, highly interactive React dashboard:
- **Click-to-Filter Interactivity:** Click any model, function, or error rate on the charts to instantly filter your request logs.
- **Deep Detail Drawer:** Click any log row to slide out a Drawer containing full prompt text, responses, token breakdowns, and exact error messages with one-click copy functionality.
- **Advanced Metrics:** See Latency over Time, Cost by Model, Function Frequency, and Token Consumption across different dynamic time ranges (1H to 30D).
- **Sortable & Searchable:** Find exactly which prompt triggered a failure or which model is eating your budget.

---

## 🚀 Quick Start

### 1. Install the SDK

```bash
pip install runetrace
```

### 2. Add the decorator

```python
import runetrace
from openai import OpenAI

# Point the SDK to your deployed Runetrace API Gateway
runetrace.configure(
    api_url="https://your-api-gateway-url.amazonaws.com/prod",
    api_key="your-api-key",
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
# ✅ Prompt, Response, Cost, Latency, and Tokens are automatically tracked and sent to DynamoDB!
```

That's it. Every call is now logged, costed, and beautifully visualized on your dashboard. Supports both synchronous (`@track_llm`) and asynchronous (`@track_llm_async`) operations.

---

## 🛠️ Deploy Your Own in 5 Minutes

### Prerequisites
- AWS account (free tier is fine)
- [Terraform](https://www.terraform.io/downloads) installed
- AWS CLI configured (`aws configure`)
- Node.js (for the dashboard)

### 1. Clone & Deploy Infrastructure

```bash
# Clone the repo
git clone https://github.com/rishav-sy/runetrace.git
cd runetrace/terraform

# Deploy AWS infrastructure (Lambda, API Gateway, DynamoDB)
terraform init
terraform apply -auto-approve

# ⚠️ Copy the "api_url" and "api_key" from the Terraform outputs!
```

### 2. Start the Dashboard

```bash
cd ../dashboard
npm install

# Create a .env file locally with your Terraform outputs
echo "VITE_API_URL=https://your-api-url.amazonaws.com/prod" > .env
echo "VITE_API_KEY=your-api-key" >> .env

# Run the dev server
npm run dev
```
Navigate to `http://localhost:5173/dashboard` to see your logs!

---

## 🏗️ Serverless Architecture

```text
┌─────────────────┐     POST /ingest     ┌──────────────┐     ┌──────────────┐
│  Your Python    │ ──────────────────▶  │  API Gateway  │ ──▶ │   Lambda     │
│  App + SDK      │   (Async Batching)   │  (HTTP API)   │     │  (Ingest)    │
└─────────────────┘                      └──────────────┘     └──────┬───────┘
                                                                     │
                                                                     ▼
┌─────────────────┐     GET /logs        ┌──────────────┐     ┌──────────────┐
│  React (Vite)   │ ◀──────────────────  │  API Gateway  │ ◀── │  DynamoDB    │
│  Dashboard      │                      │  (HTTP API)   │     │  (runetrace) │
└─────────────────┘                      └──────────────┘     └──────────────┘
```

## 📦 Supported Models (Continuously Updated)

| Provider | Models |
|---|---|
| **OpenAI** | GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo, o1, o1-mini, o3-mini |
| **Anthropic** | Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus/Sonnet/Haiku |
| **Google** | Gemini 2.5 Pro/Flash, Gemini 2.0 Pro/Flash, Gemini 1.5 Pro/Flash |
| **Meta** | Llama 3.3 (70B), Llama 3.1 (405B, 70B, 8B) |
| **Mistral** | Mistral Large, Mistral Small, Mixtral 8x7B |
| **xAI** | Grok 2, Grok 2 Vision |
| **DeepSeek** | DeepSeek V3, DeepSeek R1 |

_If a model isn't found exactly, Runetrace uses fuzzy matching (e.g., `gpt-4o-2024-05-13` maps to `gpt-4o`) to ensure accurate costing._

## 💲 AWS Cost Breakdown

This infrastructure was carefully designed to stay well within the AWS Free Tier.

| Service | Free Tier Limit | Runetrace Typical Usage | Cost |
|---|---|---|---|
| **DynamoDB** | 25 GB Storage, 25 WCU/RCU | ~MBs per day, bursts handled natively | $0.00 |
| **Lambda** | 1,000,000 requests/month | < 5,000 requests/month | $0.00 |
| **API Gateway** | 1,000,000 calls/month | < 5,000 requests/month | $0.00 |
| **CloudWatch** | 5 GB logs | Minimal text logs | $0.00 |
| **Total** | | | **$0.00/month** |

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
To run SDK tests locally:
```bash
cd sdk
pip install -e .[test]
pytest tests/ -v
```

## 📄 License

[MIT](LICENSE) — use it however you want.

---

<p align="center">
  <strong>Built for builders by <a href="https://github.com/rishav-sy">Rishav</a></strong>
</p>
