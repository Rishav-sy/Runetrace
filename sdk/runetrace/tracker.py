"""
Core decorator for tracking LLM calls.
Captures model, tokens, latency, cost, and sends data to the Runetrace API.
"""

import functools
import json
import time
import threading
import logging
import os
from typing import Optional, Callable, Any

import requests

from .pricing import get_cost

logger = logging.getLogger("runetrace")

# Configuration
_config = {
    "api_url": os.environ.get("RUNETRACE_API_URL", ""),
    "project_id": os.environ.get("RUNETRACE_PROJECT_ID", "default"),
}


def configure(api_url: str = None, project_id: str = None):
    """
    Configure the Runetrace SDK.
    
    Args:
        api_url: Your Runetrace API Gateway URL (e.g. "https://xxx.execute-api.us-east-1.amazonaws.com")
        project_id: A project identifier to group your logs (default: "default")
    """
    if api_url:
        _config["api_url"] = api_url.rstrip("/")
    if project_id:
        _config["project_id"] = project_id


def _send_log(payload: dict):
    """Send the log payload to the API in a background thread (fire-and-forget)."""
    try:
        url = f"{_config['api_url']}/ingest"
        response = requests.post(url, json=payload, timeout=3)
        if response.status_code != 200:
            logger.warning(f"Runetrace: Failed to send log (HTTP {response.status_code})")
    except Exception as e:
        logger.warning(f"Runetrace: Failed to send log: {e}")


def _extract_openai_response(result) -> dict:
    """Extract token usage from an OpenAI-style response."""
    info = {}
    
    # OpenAI ChatCompletion response object
    if hasattr(result, 'usage'):
        usage = result.usage
        info["prompt_tokens"] = getattr(usage, 'prompt_tokens', 0) or 0
        info["completion_tokens"] = getattr(usage, 'completion_tokens', 0) or 0
    
    if hasattr(result, 'model'):
        info["model"] = result.model
    
    # Try to get response text
    if hasattr(result, 'choices') and result.choices:
        choice = result.choices[0]
        if hasattr(choice, 'message') and hasattr(choice.message, 'content'):
            info["response"] = (choice.message.content or "")[:200]
    
    return info


def _extract_anthropic_response(result) -> dict:
    """Extract token usage from an Anthropic-style response."""
    info = {}
    
    if hasattr(result, 'usage'):
        usage = result.usage
        info["prompt_tokens"] = getattr(usage, 'input_tokens', 0) or 0
        info["completion_tokens"] = getattr(usage, 'output_tokens', 0) or 0
    
    if hasattr(result, 'model'):
        info["model"] = result.model
    
    if hasattr(result, 'content') and result.content:
        if hasattr(result.content[0], 'text'):
            info["response"] = result.content[0].text[:200]
    
    return info


def _extract_dict_response(result: dict) -> dict:
    """Extract token usage from a dict-style response (e.g., raw API responses)."""
    info = {}
    
    usage = result.get("usage", {})
    if usage:
        info["prompt_tokens"] = usage.get("prompt_tokens", 0) or usage.get("input_tokens", 0) or 0
        info["completion_tokens"] = usage.get("completion_tokens", 0) or usage.get("output_tokens", 0) or 0
    
    info["model"] = result.get("model", "")
    
    choices = result.get("choices", [])
    if choices:
        message = choices[0].get("message", {})
        info["response"] = (message.get("content", "") or "")[:200]
    
    return info


def _extract_info(result, model_hint: str = None) -> dict:
    """Auto-detect response format and extract info."""
    info = {"prompt_tokens": 0, "completion_tokens": 0, "model": model_hint or "unknown"}
    
    if isinstance(result, dict):
        extracted = _extract_dict_response(result)
    elif hasattr(result, 'usage'):
        # Check if it's Anthropic (has input_tokens) or OpenAI (has prompt_tokens)
        usage = result.usage
        if hasattr(usage, 'input_tokens'):
            extracted = _extract_anthropic_response(result)
        else:
            extracted = _extract_openai_response(result)
    else:
        extracted = {}
    
    info.update({k: v for k, v in extracted.items() if v})
    return info


def track_llm(func: Callable = None, *, model: str = None, capture_prompt: bool = True):
    """
    Decorator to track LLM calls. Captures latency, token usage, cost, and 
    sends the data to the Runetrace backend in a background thread.
    
    Usage:
        @track_llm
        def call_openai(prompt):
            return client.chat.completions.create(model="gpt-4o", messages=[...])
        
        @track_llm(model="gpt-4o", capture_prompt=False)
        def call_openai(prompt):
            return client.chat.completions.create(model="gpt-4o", messages=[...])
    
    Args:
        func: The function to decorate (auto-passed when used without parentheses)
        model: Override the model name (otherwise auto-detected from response)
        capture_prompt: Whether to capture the prompt text in logs (default: True)
    """
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            if not _config["api_url"]:
                logger.warning("Runetrace: No API URL configured. Set RUNETRACE_API_URL or call runetrace.configure().")
                return fn(*args, **kwargs)
            
            # Capture prompt from args/kwargs
            prompt_text = ""
            if capture_prompt:
                # Try common patterns: first string arg, 'prompt' kwarg, 'messages' kwarg
                if args and isinstance(args[0], str):
                    prompt_text = args[0][:200]
                elif "prompt" in kwargs:
                    prompt_text = str(kwargs["prompt"])[:200]
                elif "messages" in kwargs:
                    messages = kwargs["messages"]
                    if isinstance(messages, list) and messages:
                        last_msg = messages[-1]
                        if isinstance(last_msg, dict):
                            prompt_text = str(last_msg.get("content", ""))[:200]
            
            # Time the call
            start = time.perf_counter()
            result = fn(*args, **kwargs)
            latency_ms = round((time.perf_counter() - start) * 1000, 2)
            
            # Extract info from response
            info = _extract_info(result, model_hint=model)
            
            # Calculate cost
            cost = get_cost(info["model"], info["prompt_tokens"], info["completion_tokens"])
            
            # Build payload
            payload = {
                "project_id": _config["project_id"],
                "model": info["model"],
                "prompt_tokens": info["prompt_tokens"],
                "completion_tokens": info["completion_tokens"],
                "latency_ms": latency_ms,
                "cost": cost,
                "prompt": prompt_text,
                "response": info.get("response", ""),
                "function_name": fn.__name__,
            }
            
            # Send in background thread (non-blocking)
            thread = threading.Thread(target=_send_log, args=(payload,), daemon=True)
            thread.start()
            
            return result
        
        return wrapper
    
    # Support both @track_llm and @track_llm(...)
    if func is not None:
        return decorator(func)
    return decorator
