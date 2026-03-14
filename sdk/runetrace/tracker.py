"""
Core decorator for tracking LLM calls — Production.
Features: retry with backoff, request batching, async support, API key auth, graceful shutdown.
"""

import functools
import json
import time
import threading
import logging
import os
import atexit
import asyncio
from typing import Optional, Callable, Any
import uuid
import contextlib

import requests

from .pricing import get_cost

logger = logging.getLogger("runetrace")

# ── Configuration ───────────────────────────────────

_config = {
    "api_url": os.environ.get("RUNETRACE_API_URL", ""),
    "project_id": os.environ.get("RUNETRACE_PROJECT_ID", "default"),
    "api_key": os.environ.get("RUNETRACE_API_KEY", ""),
    "batch_size": 10,
    "flush_interval": 5.0,  # seconds
    "max_retries": 3,
    "enabled": True,
    "user_id": os.environ.get("RUNETRACE_USER_ID", ""),
    "session_id": "",
    "tags": [],
    "metadata": {},
}

# Thread-local storage for trace context
_trace_context = threading.local()


def configure(
    api_url: str = None,
    project_id: str = None,
    api_key: str = None,
    batch_size: int = None,
    flush_interval: float = None,
    max_retries: int = None,
    enabled: bool = None,
    user_id: str = None,
    session_id: str = None,
    tags: list = None,
    metadata: dict = None,
):
    """
    Configure the Runetrace SDK.

    Args:
        api_url: Your Runetrace API Gateway URL
        project_id: Project identifier for grouping logs (default: "default")
        api_key: API key for authenticating with the ingest endpoint
        batch_size: Number of logs to batch before sending (default: 10)
        flush_interval: Seconds between automatic flushes (default: 5.0)
        max_retries: Max retry attempts on failure (default: 3)
        enabled: Whether tracking is enabled (default: True)
        user_id: Optional user ID for per-user analytics
        session_id: Optional session ID for grouping related calls
        tags: Optional list of string tags for categorization
        metadata: Optional dict of custom metadata
    """
    if api_url is not None:
        _config["api_url"] = api_url.rstrip("/")
    if project_id is not None:
        _config["project_id"] = project_id
    if api_key is not None:
        _config["api_key"] = api_key
    if batch_size is not None:
        _config["batch_size"] = max(1, batch_size)
    if flush_interval is not None:
        _config["flush_interval"] = max(1.0, flush_interval)
    if max_retries is not None:
        _config["max_retries"] = max(0, max_retries)
    if enabled is not None:
        _config["enabled"] = enabled
    if user_id is not None:
        _config["user_id"] = user_id
    if session_id is not None:
        _config["session_id"] = session_id
    if tags is not None:
        _config["tags"] = list(tags)
    if metadata is not None:
        _config["metadata"] = dict(metadata)

    # Start the flush timer if not already running
    _BatchQueue.instance().ensure_timer_running()


# ── Retry Logic ─────────────────────────────────────

def _send_with_retry(payload: dict, retries: int = None):
    """Send a single payload to the API with exponential backoff retry."""
    max_retries = retries if retries is not None else _config["max_retries"]
    url = f"{_config['api_url']}/ingest"
    headers = {"Content-Type": "application/json"}
    if _config["api_key"]:
        headers["x-api-key"] = _config["api_key"]

    for attempt in range(max_retries + 1):
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=5)
            if response.status_code == 200:
                return True
            if response.status_code < 500:
                # Client error — don't retry
                logger.warning(f"Runetrace: HTTP {response.status_code}: {response.text[:200]}")
                return False
            # Server error — retry
            logger.warning(f"Runetrace: HTTP {response.status_code}, attempt {attempt + 1}/{max_retries + 1}")
        except requests.exceptions.RequestException as e:
            logger.warning(f"Runetrace: Request failed (attempt {attempt + 1}): {e}")

        if attempt < max_retries:
            backoff = min(2 ** attempt * 0.5, 8.0)  # 0.5s, 1s, 2s, 4s, 8s max
            time.sleep(backoff)

    logger.error("Runetrace: Failed to send log after all retries")
    return False


def _send_batch(payloads: list):
    """Send a batch of payloads individually (DynamoDB PutItem is per-item)."""
    for payload in payloads:
        _send_with_retry(payload)


# ── Batch Queue ─────────────────────────────────────

class _BatchQueue:
    """Thread-safe queue that batches logs and flushes periodically."""

    _instance = None
    _lock_cls = threading.Lock()

    @classmethod
    def instance(cls):
        if cls._instance is None:
            with cls._lock_cls:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def __init__(self):
        self._queue = []
        self._lock = threading.Lock()
        self._timer = None
        self._timer_running = False

    def add(self, payload: dict):
        """Add a payload to the batch queue."""
        flush_now = False
        with self._lock:
            self._queue.append(payload)
            if len(self._queue) >= _config["batch_size"]:
                flush_now = True

        if flush_now:
            self._flush_in_background()

        self.ensure_timer_running()

    def ensure_timer_running(self):
        """Start the periodic flush timer if not already running."""
        if not self._timer_running and _config["api_url"]:
            self._timer_running = True
            self._schedule_flush()

    def _schedule_flush(self):
        """Schedule the next flush."""
        self._timer = threading.Timer(_config["flush_interval"], self._timer_flush)
        self._timer.daemon = True
        self._timer.start()

    def _timer_flush(self):
        """Called by the periodic timer."""
        self._do_flush()
        if self._timer_running:
            self._schedule_flush()

    def _flush_in_background(self):
        """Flush the queue in a background thread."""
        thread = threading.Thread(target=self._do_flush, daemon=True)
        thread.start()

    def _do_flush(self):
        """Drain the queue and send all pending payloads."""
        with self._lock:
            if not self._queue:
                return
            batch = self._queue[:]
            self._queue.clear()

        _send_batch(batch)

    def flush_sync(self):
        """Synchronous flush — used for graceful shutdown."""
        self._do_flush()

    def shutdown(self):
        """Stop the timer and flush remaining logs."""
        self._timer_running = False
        if self._timer:
            self._timer.cancel()
        self.flush_sync()


def flush():
    """Manually flush all pending log batches. Blocks until complete."""
    _BatchQueue.instance().flush_sync()


def _shutdown_handler():
    """Called on interpreter exit to flush remaining logs."""
    try:
        _BatchQueue.instance().shutdown()
    except Exception:
        pass  # Best-effort on shutdown


atexit.register(_shutdown_handler)


# ── Response Extraction ─────────────────────────────

def _extract_openai_response(result) -> dict:
    info = {}
    if hasattr(result, 'usage'):
        usage = result.usage
        info["prompt_tokens"] = getattr(usage, 'prompt_tokens', 0) or 0
        info["completion_tokens"] = getattr(usage, 'completion_tokens', 0) or 0
    if hasattr(result, 'model'):
        info["model"] = result.model
    if hasattr(result, 'choices') and result.choices:
        choice = result.choices[0]
        if hasattr(choice, 'message') and hasattr(choice.message, 'content'):
            info["response"] = (choice.message.content or "")[:200]
    return info


def _extract_anthropic_response(result) -> dict:
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
    info = {"prompt_tokens": 0, "completion_tokens": 0, "model": model_hint or "unknown"}

    if isinstance(result, dict):
        extracted = _extract_dict_response(result)
    elif hasattr(result, 'usage'):
        usage = result.usage
        if hasattr(usage, 'input_tokens'):
            extracted = _extract_anthropic_response(result)
        else:
            extracted = _extract_openai_response(result)
    else:
        extracted = {}

    info.update({k: v for k, v in extracted.items() if v})
    return info


def _capture_prompt(args, kwargs, capture: bool) -> str:
    """Extract prompt text from function arguments."""
    if not capture:
        return ""
    if args:
        if isinstance(args[0], str):
            return args[0][:200]
        elif isinstance(args[0], list) and len(args[0]) > 0:
            last_msg = args[0][-1]
            if isinstance(last_msg, dict):
                return str(last_msg.get("content", ""))[:200]
    if "prompt" in kwargs:
        return str(kwargs["prompt"])[:200]
    if "messages" in kwargs:
        messages = kwargs["messages"]
        if isinstance(messages, list) and messages:
            last_msg = messages[-1]
            if isinstance(last_msg, dict):
                return str(last_msg.get("content", ""))[:200]
    return ""


def _build_payload(fn_name, info, latency_ms, prompt_text, cost):
    payload = {
        "project_id": _config["project_id"],
        "model": info["model"],
        "prompt_tokens": info["prompt_tokens"],
        "completion_tokens": info["completion_tokens"],
        "latency_ms": latency_ms,
        "cost": cost,
        "prompt": prompt_text,
        "response": info.get("response", ""),
        "function_name": fn_name,
    }
    # Add optional tracking fields
    if _config.get("user_id"):
        payload["user_id"] = _config["user_id"]
    if _config.get("session_id"):
        payload["session_id"] = _config["session_id"]
    if _config.get("tags"):
        payload["tags"] = _config["tags"]
    if _config.get("metadata"):
        payload["metadata"] = _config["metadata"]
    # Add trace_id from context manager if active
    trace_id = getattr(_trace_context, 'trace_id', None)
    if trace_id:
        payload["trace_id"] = trace_id
    return payload


@contextlib.contextmanager
def trace(name: str = None):
    """
    Context manager to group nested LLM calls into a single trace.

    Usage:
        with runetrace.trace("my-rag-pipeline"):
            result1 = call_embeddings(query)
            result2 = call_llm(query, result1)
            result3 = call_summarizer(result2)
    """
    trace_id = name or f"trace-{uuid.uuid4().hex[:12]}"
    prev_trace = getattr(_trace_context, 'trace_id', None)
    _trace_context.trace_id = trace_id
    try:
        yield trace_id
    finally:
        _trace_context.trace_id = prev_trace


# ── Sync Decorator ──────────────────────────────────

def track_llm(func: Callable = None, *, model: str = None, capture_prompt: bool = True):
    """
    Decorator to track LLM calls. Captures latency, token usage, cost,
    and sends data to Runetrace via batched background requests.

    Usage:
        @track_llm
        def call_openai(prompt):
            return client.chat.completions.create(model="gpt-4o", messages=[...])

        @track_llm(model="gpt-4o", capture_prompt=False)
        def call_openai(prompt):
            ...
    """
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            if not _config["enabled"] or not _config["api_url"]:
                if not _config["api_url"]:
                    logger.debug("Runetrace: No API URL configured.")
                return fn(*args, **kwargs)

            prompt_text = _capture_prompt(args, kwargs, capture_prompt)

            start = time.perf_counter()
            result = fn(*args, **kwargs)
            latency_ms = round((time.perf_counter() - start) * 1000, 2)

            info = _extract_info(result, model_hint=model)
            cost = get_cost(info["model"], info["prompt_tokens"], info["completion_tokens"])
            payload = _build_payload(fn.__name__, info, latency_ms, prompt_text, cost)

            _BatchQueue.instance().add(payload)
            return result

        return wrapper

    if func is not None:
        return decorator(func)
    return decorator


# ── Async Decorator ─────────────────────────────────

def track_llm_async(func: Callable = None, *, model: str = None, capture_prompt: bool = True):
    """
    Async version of @track_llm for use with async LLM calls.

    Usage:
        @track_llm_async
        async def call_openai(prompt):
            return await client.chat.completions.create(model="gpt-4o", messages=[...])
    """
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            if not _config["enabled"] or not _config["api_url"]:
                return await fn(*args, **kwargs)

            prompt_text = _capture_prompt(args, kwargs, capture_prompt)

            start = time.perf_counter()
            result = await fn(*args, **kwargs)
            latency_ms = round((time.perf_counter() - start) * 1000, 2)

            info = _extract_info(result, model_hint=model)
            cost = get_cost(info["model"], info["prompt_tokens"], info["completion_tokens"])
            payload = _build_payload(fn.__name__, info, latency_ms, prompt_text, cost)

            _BatchQueue.instance().add(payload)
            return result

        return wrapper

    if func is not None:
        return decorator(func)
    return decorator
