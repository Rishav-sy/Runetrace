"""
Tests for the Runetrace SDK — pricing and tracker.
"""
import pytest
import time
import json
from unittest.mock import patch, MagicMock

from runetrace.pricing import get_cost, PRICING
from runetrace.tracker import (
    _extract_info, _send_with_retry, _BatchQueue,
    _capture_prompt, _build_payload, configure, track_llm, track_llm_async, flush
)


# ── Pricing Tests ───────────────────────────────────

class TestPricing:
    def test_known_model_cost(self):
        cost = get_cost("gpt-4o", 1000, 500)
        assert cost == 0.0075

    def test_unknown_model_returns_zero(self):
        assert get_cost("totally-made-up-model", 1000, 500) == 0.0

    def test_zero_tokens(self):
        assert get_cost("gpt-4o", 0, 0) == 0.0

    def test_alias_model(self):
        assert get_cost("gpt-4o-2024-11-20", 1000, 500) > 0

    def test_fuzzy_match(self):
        assert get_cost("gpt-4o-2025-01-15", 1000, 500) > 0

    def test_all_models_have_input_output(self):
        for model, prices in PRICING.items():
            assert "input" in prices, f"{model} missing input price"
            assert "output" in prices, f"{model} missing output price"
            assert prices["input"] >= 0
            assert prices["output"] >= 0

    def test_claude_pricing(self):
        assert get_cost("claude-3.5-sonnet", 2000, 1000) == 0.021

    def test_gemini_pricing(self):
        assert get_cost("gemini-2.0-flash", 1000, 1000) == 0.0005


# ── Tracker Extraction Tests ───────────────────────

class TestExtraction:
    def test_extract_openai_response(self):
        mock = MagicMock()
        mock.usage.prompt_tokens = 100
        mock.usage.completion_tokens = 50
        mock.model = "gpt-4o"
        mock.usage.input_tokens = None  # ensure OpenAI path

        # Remove input_tokens attr to trigger OpenAI path
        del mock.usage.input_tokens

        info = _extract_info(mock, model_hint=None)
        assert info["model"] == "gpt-4o"
        assert info["prompt_tokens"] == 100
        assert info["completion_tokens"] == 50

    def test_extract_anthropic_response(self):
        mock = MagicMock()
        mock.usage.input_tokens = 200
        mock.usage.output_tokens = 100
        mock.model = "claude-3.5-sonnet"
        mock.content = [MagicMock(text="Hello world")]

        info = _extract_info(mock)
        assert info["model"] == "claude-3.5-sonnet"
        assert info["prompt_tokens"] == 200
        assert info["completion_tokens"] == 100

    def test_extract_dict_response(self):
        result = {
            "model": "gpt-4o",
            "usage": {"prompt_tokens": 50, "completion_tokens": 25},
            "choices": [{"message": {"content": "Test response"}}],
        }
        info = _extract_info(result)
        assert info["model"] == "gpt-4o"
        assert info["prompt_tokens"] == 50

    def test_extract_unknown_response(self):
        info = _extract_info("just a string", model_hint="fallback-model")
        assert info["model"] == "fallback-model"
        assert info["prompt_tokens"] == 0

    def test_model_hint_override(self):
        info = _extract_info({}, model_hint="my-model")
        assert info["model"] == "my-model"


# ── Prompt Capture Tests ────────────────────────────

class TestPromptCapture:
    def test_capture_string_arg(self):
        assert _capture_prompt(("Hello",), {}, True) == "Hello"

    def test_capture_prompt_kwarg(self):
        assert _capture_prompt((), {"prompt": "Test"}, True) == "Test"

    def test_capture_messages_kwarg(self):
        msgs = [{"role": "user", "content": "Hi there"}]
        assert _capture_prompt((), {"messages": msgs}, True) == "Hi there"

    def test_capture_disabled(self):
        assert _capture_prompt(("Hello",), {}, False) == ""

    def test_truncation(self):
        long_prompt = "x" * 500
        result = _capture_prompt((long_prompt,), {}, True)
        assert len(result) == 200


# ── Retry Tests ─────────────────────────────────────

class TestRetry:
    @patch("runetrace.tracker.requests.post")
    def test_success_no_retry(self, mock_post):
        mock_post.return_value = MagicMock(status_code=200)
        configure(api_url="http://test.com", api_key="key123")

        result = _send_with_retry({"test": True}, retries=3)
        assert result is True
        assert mock_post.call_count == 1

    @patch("runetrace.tracker.requests.post")
    def test_client_error_no_retry(self, mock_post):
        mock_post.return_value = MagicMock(status_code=400, text="Bad request")

        result = _send_with_retry({"test": True}, retries=3)
        assert result is False
        assert mock_post.call_count == 1  # No retries on 4xx

    @patch("runetrace.tracker.time.sleep")  # Don't actually sleep in tests
    @patch("runetrace.tracker.requests.post")
    def test_server_error_retries(self, mock_post, mock_sleep):
        mock_post.return_value = MagicMock(status_code=500, text="Server error")

        result = _send_with_retry({"test": True}, retries=2)
        assert result is False
        assert mock_post.call_count == 3  # 1 initial + 2 retries

    @patch("runetrace.tracker.requests.post")
    def test_api_key_header_sent(self, mock_post):
        mock_post.return_value = MagicMock(status_code=200)
        configure(api_url="http://test.com", api_key="secret-key")

        _send_with_retry({"test": True})
        call_kwargs = mock_post.call_args
        assert call_kwargs[1]["headers"]["x-api-key"] == "secret-key"


# ── Payload Tests ───────────────────────────────────

class TestPayload:
    def test_build_payload(self):
        info = {"model": "gpt-4o", "prompt_tokens": 100, "completion_tokens": 50, "response": "Hi"}
        configure(project_id="test-proj")

        payload = _build_payload("my_func", info, 123.45, "Hello", 0.005)
        assert payload["project_id"] == "test-proj"
        assert payload["function_name"] == "my_func"
        assert payload["latency_ms"] == 123.45
        assert payload["cost"] == 0.005

# ── Decorator Tests ─────────────────────────────────

import asyncio

class TestDecorators:
    def setup_method(self):
        configure(api_url="http://test.com", api_key="secret-key", project_id="test-proj")
        
        # Reset queue for clean tests
        from runetrace.tracker import _BatchQueue
        _BatchQueue.instance()._queue.clear()

    def test_track_llm_success(self):
        mock_response = MagicMock()
        mock_response.model = "gpt-4o"
        mock_response.usage.prompt_tokens = 10
        mock_response.usage.completion_tokens = 5
        # mimic OpenAI object
        del mock_response.usage.input_tokens
        
        mock_choice = MagicMock()
        mock_choice.message.content = "Sync test response"
        mock_response.choices = [mock_choice]

        @track_llm
        def dummy_call(prompt):
            return mock_response

        res = dummy_call("test")
        assert res == mock_response
        
        # flush to ensure it gets processed
        flush()

    def test_track_llm_exception(self):
        @track_llm
        def failing_call():
            raise ValueError("Something broke")

        try:
            failing_call()
        except ValueError:
            pass

        # Should log an error
        flush()

    @pytest.mark.asyncio
    async def test_track_llm_async_success(self):
        mock_response = MagicMock()
        mock_response.model = "claude-3-opus"
        mock_response.usage.input_tokens = 100
        mock_response.usage.output_tokens = 200
        
        mock_content = MagicMock()
        mock_content.text = "Async test response"
        mock_response.content = [mock_content]

        @track_llm_async
        async def dummy_async_call(prompt):
            await asyncio.sleep(0.01)
            return mock_response

        res = await dummy_async_call("test")
        assert res == mock_response
        
        flush()
