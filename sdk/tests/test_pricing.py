"""
Basic tests for the Runetrace SDK.
"""
import pytest
from runetrace.pricing import get_cost, PRICING


class TestPricing:
    def test_known_model_cost(self):
        cost = get_cost("gpt-4o", 1000, 500)
        assert cost > 0
        # 1000/1000 * 0.0025 + 500/1000 * 0.01 = 0.0025 + 0.005 = 0.0075
        assert cost == 0.0075

    def test_unknown_model_returns_zero(self):
        cost = get_cost("totally-made-up-model", 1000, 500)
        assert cost == 0.0

    def test_zero_tokens(self):
        cost = get_cost("gpt-4o", 0, 0)
        assert cost == 0.0

    def test_alias_model(self):
        cost = get_cost("gpt-4o-2024-11-20", 1000, 500)
        assert cost > 0

    def test_fuzzy_match(self):
        cost = get_cost("gpt-4o-2025-01-15", 1000, 500)
        assert cost > 0  # Should fuzzy-match to gpt-4o

    def test_all_models_have_input_output(self):
        for model, prices in PRICING.items():
            assert "input" in prices, f"{model} missing input price"
            assert "output" in prices, f"{model} missing output price"
            assert prices["input"] >= 0, f"{model} has negative input price"
            assert prices["output"] >= 0, f"{model} has negative output price"

    def test_claude_pricing(self):
        cost = get_cost("claude-3.5-sonnet", 2000, 1000)
        # 2000/1000 * 0.003 + 1000/1000 * 0.015 = 0.006 + 0.015 = 0.021
        assert cost == 0.021

    def test_gemini_pricing(self):
        cost = get_cost("gemini-2.0-flash", 1000, 1000)
        # 1000/1000 * 0.0001 + 1000/1000 * 0.0004 = 0.0005
        assert cost == 0.0005
