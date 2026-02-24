<p align="center">
  <h1 align="center">⚡ Runetrace</h1>
  <p align="center"><strong>Free, serverless LLM observability — for exactly $0.00/month.</strong></p>
  <p align="center">
    <em>"Because you shouldn't need a $500/month tool to know what your AI is doing."</em>
  </p>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/install-2_lines-brightgreen?style=for-the-badge" alt="2-line install" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT License" /></a>
  <a href="https://pypi.org/project/runetrace/"><img src="https://img.shields.io/badge/pypi-v0.1.0-orange?style=for-the-badge" alt="PyPI" /></a>
</p>

---

Runetrace gives developers complete visibility into their AI application's **cost**, **latency**, and **behavior** — with a single Python decorator and a real-time React dashboard.

The entire backend runs on **AWS Free Tier** (Lambda + API Gateway + DynamoDB) and deploys with one Terraform command. No credit card risk. No vendor lock-in. Self-hostable by anyone.

## 🖥️ Dashboard

<!-- Replace with your own GIF using gifcap.dev -->
> The dashboard shows real-time metrics, cost breakdown by model, and a searchable request log.

## ✨ Features

| Feature | Description |
|---|---|
| 🎯 **One-line tracking** | Add `@track_llm` to any LLM call |
| 💰 **Auto cost calculation** | 30+ models (OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek) |
| ⚡ **Zero overhead** | Logs are sent in background threads |
| 📊 **Real-time dashboard** | React + Recharts with auto-refresh |
| 🔒 **Self-hosted** | Your data never leaves your AWS account |
| 🆓 **$0/month** | Runs entirely on AWS Free Tier |
| 🏗️ **Infrastructure as Code** | One `terraform apply` to deploy everything |

## 🚀 Quick Start

### 1. Install the SDK

```bash
pip install runetrace
```

### 2. Add the decorator

```python
import runetrace
from openai import OpenAI

runetrace.configure(
    api_url="https://your-api-gateway-url.amazonaws.com",
    project_id="my-app"
)

client = OpenAI()

@runetrace.track_llm
def ask(prompt):
    return client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )

response = ask("What is the meaning of life?")
# ✅ Cost, latency, and tokens are automatically tracked!
```

That's it. Every call is now logged, costed, and visible on the dashboard.

## 🏗️ Architecture

```
┌─────────────────┐     POST /ingest     ┌──────────────┐     ┌──────────────┐
│  Your Python    │ ──────────────────▶  │  API Gateway  │ ──▶ │   Lambda     │
│  App + SDK      │                      │  (HTTP API)   │     │  (Ingest)    │
└─────────────────┘                      └──────────────┘     └──────┬───────┘
                                                                      │
                                                                      ▼
┌─────────────────┐     GET /logs        ┌──────────────┐     ┌──────────────┐
│  React          │ ◀──────────────────  │  API Gateway  │ ◀── │  DynamoDB    │
│  Dashboard      │                      │  (HTTP API)   │     │  (LLMLogs)   │
└─────────────────┘                      └──────────────┘     └──────────────┘
```

## 🛠️ Deploy Your Own in 5 Minutes

### Prerequisites
- AWS account (free tier is fine)
- [Terraform](https://www.terraform.io/downloads) installed
- AWS CLI configured (`aws configure`)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/rishavsy/runetrace.git
cd runetrace

# 2. Deploy AWS infrastructure
cd terraform
terraform init
terraform apply -auto-approve
# → Copy the API Gateway URL from the output

# 3. Start the dashboard
cd ../dashboard
npm install
VITE_API_URL=https://your-api-url.amazonaws.com npm run dev
```

### GitHub Secrets (for CI/CD)

If using the included GitHub Actions workflow, add these secrets:

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_REGION` | e.g. `us-east-1` |
| `API_URL` | Your API Gateway URL |
| `VERCEL_TOKEN` | For dashboard deployment |
| `VERCEL_ORG_ID` | Vercel org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

## 📦 Supported Models

| Provider | Models |
|---|---|
| OpenAI | GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo, o1, o1-mini, o3-mini |
| Anthropic | Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus/Sonnet/Haiku |
| Google | Gemini 2.0 Pro/Flash, Gemini 1.5 Pro/Flash |
| Meta | Llama 3.1 (405B, 70B, 8B) |
| Mistral | Mistral Large, Mistral Small, Mixtral 8x7B |
| DeepSeek | DeepSeek V3, DeepSeek R1 |

## 💲 AWS Cost Breakdown

| Service | Free Tier Limit | Runetrace Usage |
|---|---|---|
| DynamoDB | 25 GB + 25 RCU/WCU | ~KBs per day |
| Lambda | 1M requests/month | < 1000/month typical |
| API Gateway | 1M calls/month (12 mo) | < 1000/month typical |
| CloudWatch | 5 GB logs | Minimal |
| **Total** | | **$0.00/month** |

## 🧪 Running Tests

```bash
cd sdk
python -m venv .venv && source .venv/bin/activate
pip install -e . && pip install pytest
python -m pytest tests/ -v
```

## 📂 Project Structure

```
runetrace/
├── terraform/          # AWS infrastructure (DynamoDB, Lambda, API Gateway)
│   └── main.tf
├── backend/            # Lambda function code
│   ├── ingest.py       # POST /ingest handler
│   └── get_logs.py     # GET /logs handler
├── sdk/                # Python SDK (pip installable)
│   └── runetrace/
│       ├── __init__.py
│       ├── tracker.py  # @track_llm decorator
│       └── pricing.py  # LLM pricing table
├── dashboard/          # React observability dashboard
│   └── src/
│       ├── App.jsx
│       ├── hooks/useLLMLogs.js
│       └── components/
├── .github/workflows/  # CI/CD pipeline
│   └── deploy.yml
├── LICENSE             # MIT
└── CONTRIBUTING.md
```

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

[MIT](LICENSE) — use it however you want.

---

<p align="center">
  <strong>Built by <a href="https://github.com/rishavsy">Rishav</a></strong> — Cloud + DevOps + MLOps
</p>
