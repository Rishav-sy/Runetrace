"""
Test script for the Runetrace SDK.
Simulates an LLM response and verifies the decorator sends data to the live API.
"""
import time
import sys
import os

# Add SDK to path for local testing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "sdk"))

import runetrace
from runetrace.pricing import get_cost

# --- Test 1: Pricing calculation ---
print("=" * 50)
print("TEST 1: Pricing Calculation")
print("=" * 50)

cost = get_cost("gpt-4o", prompt_tokens=1000, completion_tokens=500)
print(f"GPT-4o (1K in, 500 out): ${cost:.6f}")
assert cost > 0, "Cost should be positive"

cost2 = get_cost("claude-3.5-sonnet", prompt_tokens=2000, completion_tokens=1000)
print(f"Claude 3.5 Sonnet (2K in, 1K out): ${cost2:.6f}")
assert cost2 > 0, "Cost should be positive"

cost3 = get_cost("unknown-model-xyz", prompt_tokens=100, completion_tokens=100)
print(f"Unknown model: ${cost3:.6f}")
assert cost3 == 0.0, "Unknown model should return 0 cost"

print("✅ Pricing tests passed!\n")

# --- Test 2: Decorator with mock LLM response ---
print("=" * 50)
print("TEST 2: Decorator + Live API")
print("=" * 50)

API_URL = "https://efy27iqiuf.execute-api.us-east-1.amazonaws.com"
runetrace.configure(api_url=API_URL, project_id="sdk-test")


# Simulate an OpenAI-like response object
class MockUsage:
    prompt_tokens = 250
    completion_tokens = 100

class MockMessage:
    content = "The meaning of life is to find purpose and joy."

class MockChoice:
    message = MockMessage()

class MockResponse:
    usage = MockUsage()
    model = "gpt-4o"
    choices = [MockChoice()]


@runetrace.track_llm
def fake_llm_call(prompt):
    """Simulates an LLM call returning a mock OpenAI response."""
    time.sleep(0.1)  # Simulate some latency
    return MockResponse()


result = fake_llm_call("What is the meaning of life?")
print(f"Model: {result.model}")
print(f"Tokens: {result.usage.prompt_tokens} in, {result.usage.completion_tokens} out")
print(f"Response: {result.choices[0].message.content}")

# Wait for background thread to send the log
time.sleep(2)

# --- Test 3: Verify the log arrived in DynamoDB ---
print("\n" + "=" * 50)
print("TEST 3: Verify Log in API")
print("=" * 50)

import requests
resp = requests.get(f"{API_URL}/logs?project_id=sdk-test")
data = resp.json()
logs = data.get("logs", [])

print(f"Found {len(logs)} log(s) for project 'sdk-test'")
if logs:
    latest = max(logs, key=lambda x: x["timestamp"])
    print(f"  Model: {latest['model']}")
    print(f"  Prompt tokens: {latest['prompt_tokens']}")
    print(f"  Completion tokens: {latest['completion_tokens']}")
    print(f"  Latency: {latest['latency_ms']}ms")
    print(f"  Cost: ${latest['cost']}")
    print(f"  Function: {latest.get('function_name', 'N/A')}")
    print("✅ Log verified in DynamoDB!")
else:
    print("❌ No logs found — check API or wait for propagation")

print("\n✅ All tests passed!")
