# Runetrace

> Because you shouldn't need a $500/month tool to know what your AI is doing.

**Free, serverless LLM observability.** Track cost, latency, and behavior of every LLM call with a single decorator.

## Quick Start

```bash
pip install runetrace
```

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
# Cost, latency, and tokens are automatically tracked!
```
