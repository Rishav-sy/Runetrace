/**
 * LLM pricing per 1K tokens (USD).
 * Ported from the Python SDK — kept in sync manually.
 */

export const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'o1': { input: 0.015, output: 0.06 },
  'o1-mini': { input: 0.003, output: 0.012 },
  'o3-mini': { input: 0.0011, output: 0.0044 },

  // Anthropic
  'claude-3.7-sonnet': { input: 0.003, output: 0.015 },
  'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3.5-haiku': { input: 0.0008, output: 0.004 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },

  // Google
  'gemini-2.5-flash': { input: 0.000075, output: 0.0003 },
  'gemini-2.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
  'gemini-2.0-pro': { input: 0.00125, output: 0.01 },

  // Meta
  'llama-3.3-70b-versatile': { input: 0.00015, output: 0.0006 },
  'llama-3.1-405b': { input: 0.003, output: 0.003 },
  'llama-3.1-70b': { input: 0.0008, output: 0.0008 },
  'llama-3.1-8b': { input: 0.0001, output: 0.0001 },

  // xAI Grok
  'grok-2-1212': { input: 0.002, output: 0.01 },
  'grok-2-vision-1212': { input: 0.002, output: 0.01 },

  // Mistral
  'mistral-large': { input: 0.002, output: 0.006 },
  'mistral-small': { input: 0.0002, output: 0.0006 },
  'mixtral-8x7b': { input: 0.0002, output: 0.0006 },

  // DeepSeek
  'deepseek-v3': { input: 0.00027, output: 0.0011 },
  'deepseek-r1': { input: 0.00055, output: 0.00219 },

  // Aliases
  'gpt-4o-2024-11-20': { input: 0.0025, output: 0.01 },
  'gpt-4o-2024-08-06': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini-2024-07-18': { input: 0.00015, output: 0.0006 },
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 },
  'gemini-1.5-pro-latest': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash-latest': { input: 0.000075, output: 0.0003 },
};

/**
 * Calculate the cost of an LLM call.
 * Uses exact match first, then fuzzy match for versioned model names.
 */
export function getCost(model: string, promptTokens: number, completionTokens: number): number {
  let pricing = PRICING[model];

  // Fuzzy match (e.g. "gpt-4o-2024-05-13" -> "gpt-4o")
  if (!pricing) {
    for (const key of Object.keys(PRICING)) {
      if (key.includes(model) || model.includes(key)) {
        pricing = PRICING[key];
        break;
      }
    }
  }

  if (!pricing) return 0;

  const inputCost = (promptTokens / 1000) * pricing.input;
  const outputCost = (completionTokens / 1000) * pricing.output;
  return Math.round((inputCost + outputCost) * 1e6) / 1e6;
}
