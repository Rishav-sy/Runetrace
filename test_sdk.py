"""
Runetrace SDK Test — Bulk Data Seeder
Pushes ~100 realistic LLM log entries across multiple models, users,
time ranges, and latencies so the Analytics dashboard looks populated.
"""
import time
import sys
import os
import random
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv("dashboard/.env.local")

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_ANON = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL:
    print("❌ VITE_SUPABASE_URL not found in dashboard/.env.local")
    sys.exit(1)

print("=" * 55)
print("  RUNETRACE — Analytics Data Seeder")
print("=" * 55)
print(f"\nTarget: {SUPABASE_URL}")
print("Go to your Runetrace Dashboard → Settings → Copy your 'rt_live...' API Key.")
api_key = input("Paste your API Key here: ").strip()

# ── Config ───────────────────────────────────────────
MODELS = [
    {"name": "gpt-4o",            "input_rate": 5.0,  "output_rate": 15.0,  "avg_latency": 1200},
    {"name": "gpt-4o-mini",       "input_rate": 0.15, "output_rate": 0.60,  "avg_latency": 400},
    {"name": "claude-3.5-sonnet", "input_rate": 3.0,  "output_rate": 15.0,  "avg_latency": 1800},
    {"name": "claude-3-haiku",    "input_rate": 0.25, "output_rate": 1.25,  "avg_latency": 300},
    {"name": "gemini-1.5-pro",    "input_rate": 3.5,  "output_rate": 10.5,  "avg_latency": 900},
]

FUNCTIONS = ["chat_completion", "summarize_doc", "translate_text", "extract_entities", "generate_code", "analyze_sentiment"]
USERS = ["user_alice", "user_bob", "user_carol", "user_dave", "anonymous"]
PROMPTS = [
    "What is the meaning of life?",
    "Summarize this quarterly report in 3 bullet points.",
    "Translate 'hello world' into Japanese.",
    "Extract all person names from this text.",
    "Write a Python function to merge two sorted arrays.",
    "Analyze the sentiment of this customer review.",
    "Explain quantum computing to a 10 year old.",
    "Debug this React useEffect hook.",
    "Generate a SQL query to find top customers by revenue.",
    "Write unit tests for this authentication module.",
]
RESPONSES = [
    "The meaning of life is to find purpose and joy.",
    "Here are 3 key takeaways from the report...",
    "こんにちは世界 (Konnichiwa Sekai)",
    "Found entities: John Smith, Jane Doe, Acme Corp.",
    "def merge_sorted(a, b): ...",
    "Sentiment: Positive (confidence: 0.92)",
    "Think of quantum computing like a magic coin that can be heads AND tails at the same time...",
    "The issue is a missing dependency array in your useEffect...",
    "SELECT customer_id, SUM(revenue) FROM orders GROUP BY customer_id ORDER BY 2 DESC LIMIT 10;",
    "Here are 5 test cases covering login, logout, token refresh, invalid credentials, and rate limiting.",
]

NUM_LOGS = 120
RPC_URL = f"{SUPABASE_URL.rstrip('/')}/rest/v1/rpc/ingest_log"

headers = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON,
    "Authorization": f"Bearer {SUPABASE_ANON}",
    "x-api-key": api_key,
}

now = datetime.utcnow()
success = 0
fail = 0

print(f"\nSending {NUM_LOGS} log entries spread across the last 7 days...\n")

for i in range(NUM_LOGS):
    model = random.choice(MODELS)

    # Spread timestamps across the last 7 days with some hour clustering
    hours_ago = random.uniform(0, 168)  # 7 days = 168 hours
    # Cluster more requests during business hours (9-17)
    if random.random() < 0.6:
        hour_of_day = random.randint(9, 17)
        day_offset = random.randint(0, 6)
        ts = now - timedelta(days=day_offset, hours=now.hour - hour_of_day, minutes=random.randint(0, 59))
    else:
        ts = now - timedelta(hours=hours_ago)

    timestamp_epoch = ts.timestamp()

    prompt_tokens = random.randint(50, 2000)
    completion_tokens = random.randint(20, 1500)
    latency_ms = max(80, model["avg_latency"] + random.gauss(0, model["avg_latency"] * 0.3))
    cost = (prompt_tokens / 1_000_000) * model["input_rate"] + (completion_tokens / 1_000_000) * model["output_rate"]

    # 5% error rate
    status = "error" if random.random() < 0.05 else "success"

    payload = {
        "project_id": "sdk-test",
        "model": model["name"],
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "latency_ms": round(latency_ms, 1),
        "cost": round(cost, 6),
        "prompt": random.choice(PROMPTS),
        "response": random.choice(RESPONSES) if status == "success" else "Error: rate limit exceeded",
        "function_name": random.choice(FUNCTIONS),
        "user_id": random.choice(USERS),
        "session_id": f"sess_{random.randint(1000, 9999)}",
        "trace_id": f"trace_{random.randint(10000, 99999)}",
    }

    try:
        r = requests.post(RPC_URL, json={"payload": payload}, headers=headers, timeout=5)
        if r.status_code == 200:
            success += 1
        else:
            fail += 1
            if fail <= 3:
                print(f"  ⚠ [{i+1}] HTTP {r.status_code}: {r.text[:120]}")
    except Exception as e:
        fail += 1
        if fail <= 3:
            print(f"  ⚠ [{i+1}] {e}")

    # Progress
    pct = int((i + 1) / NUM_LOGS * 40)
    bar = "█" * pct + "░" * (40 - pct)
    print(f"\r  [{bar}] {i+1}/{NUM_LOGS}  ✓{success} ✗{fail}", end="", flush=True)

print(f"\n\n{'=' * 55}")
print(f"  Done! {success} logs ingested, {fail} failed.")
print(f"{'=' * 55}")
print(f"\n  → Open http://localhost:5173")
print(f"  → Select project 'sdk-test' (top-right dropdown)")
print(f"  → Click the 'Analytics' tab")
print(f"  → You should see all charts fully populated!\n")
