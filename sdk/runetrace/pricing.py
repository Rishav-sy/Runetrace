"""
Hardcoded LLM pricing per 1K tokens (USD).
Updated: February 2026

Format: {
    "model_name": {
        "input": cost_per_1k_input_tokens,
        "output": cost_per_1k_output_tokens
    }
}
"""

PRICING = {
    # OpenAI
    "gpt-4o": {"input": 0.0025, "output": 0.01},
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "gpt-4-turbo": {"input": 0.01, "output": 0.03},
    "gpt-4": {"input": 0.03, "output": 0.06},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
    "o1": {"input": 0.015, "output": 0.06},
    "o1-mini": {"input": 0.003, "output": 0.012},
    "o3-mini": {"input": 0.0011, "output": 0.0044},

    # Anthropic
    "claude-3.5-sonnet": {"input": 0.003, "output": 0.015},
    "claude-3.5-haiku": {"input": 0.0008, "output": 0.004},
    "claude-3-opus": {"input": 0.015, "output": 0.075},
    "claude-3-sonnet": {"input": 0.003, "output": 0.015},
    "claude-3-haiku": {"input": 0.00025, "output": 0.00125},

    # Google
    "gemini-1.5-pro": {"input": 0.00125, "output": 0.005},
    "gemini-1.5-flash": {"input": 0.000075, "output": 0.0003},
    "gemini-2.0-flash": {"input": 0.0001, "output": 0.0004},
    "gemini-2.0-pro": {"input": 0.00125, "output": 0.01},

    # Meta (via API providers)
    "llama-3.1-405b": {"input": 0.003, "output": 0.003},
    "llama-3.1-70b": {"input": 0.0008, "output": 0.0008},
    "llama-3.1-8b": {"input": 0.0001, "output": 0.0001},

    # Mistral
    "mistral-large": {"input": 0.002, "output": 0.006},
    "mistral-small": {"input": 0.0002, "output": 0.0006},
    "mixtral-8x7b": {"input": 0.0002, "output": 0.0006},

    # DeepSeek
    "deepseek-v3": {"input": 0.00027, "output": 0.0011},
    "deepseek-r1": {"input": 0.00055, "output": 0.00219},
}

# Common aliases
PRICING["gpt-4o-2024-11-20"] = PRICING["gpt-4o"]
PRICING["gpt-4o-2024-08-06"] = PRICING["gpt-4o"]
PRICING["gpt-4o-mini-2024-07-18"] = PRICING["gpt-4o-mini"]
PRICING["claude-3-5-sonnet-20241022"] = PRICING["claude-3.5-sonnet"]
PRICING["claude-3-5-haiku-20241022"] = PRICING["claude-3.5-haiku"]
PRICING["gemini-1.5-pro-latest"] = PRICING["gemini-1.5-pro"]
PRICING["gemini-1.5-flash-latest"] = PRICING["gemini-1.5-flash"]


def get_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """
    Calculate the cost of an LLM call.
    
    Args:
        model: The model name (e.g. "gpt-4o", "claude-3.5-sonnet")
        prompt_tokens: Number of input/prompt tokens
        completion_tokens: Number of output/completion tokens
        
    Returns:
        Cost in USD. Returns 0.0 if model is not found in pricing table.
    """
    # Try exact match first
    pricing = PRICING.get(model)
    
    # Try fuzzy match (e.g., "gpt-4o-2024-05-13" -> "gpt-4o")
    if not pricing:
        for key in PRICING:
            if key in model or model in key:
                pricing = PRICING[key]
                break
    
    if not pricing:
        return 0.0
    
    input_cost = (prompt_tokens / 1000) * pricing["input"]
    output_cost = (completion_tokens / 1000) * pricing["output"]
    return round(input_cost + output_cost, 6)
