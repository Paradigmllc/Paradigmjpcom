# GPT-5.6 sales writer for `/work`

Customer-facing outbound copy must not use DeepSeek or fixed slot-substitution templates.

## Provider selection

The runtime uses the first available provider in this order unless `SALES_WRITER_PROVIDER` is set:

1. Direct OpenAI when `OPENAI_API_KEY` is present.
2. OpenRouter when `OPENROUTER_API_KEY` is present.
3. Fail closed. There is no DeepSeek or deterministic-copy fallback.

## Direct OpenAI

```env
SALES_WRITER_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_SALES_WRITER_MODEL=gpt-5.6-terra
OPENAI_SALES_WRITER_CRITIC_MODEL=gpt-5.6-sol
```

## OpenRouter

```env
SALES_WRITER_PROVIDER=openrouter
OPENROUTER_API_KEY=
OPENROUTER_API_BASE=https://openrouter.ai/api/v1
OPENROUTER_SALES_WRITER_MODEL=openai/gpt-5.6-terra
OPENROUTER_SALES_WRITER_CRITIC_MODEL=openai/gpt-5.6-sol
```

## Editorial pipeline

1. The raw list remains homepage-only and deterministic.
2. The operator selects one company.
3. `/work` collects at most five same-origin public pages with bounded timeouts.
4. GPT-5.6 Terra develops the company thesis and three materially different candidates.
5. GPT-5.6 Sol rewrites and scores the best candidate.
6. Deterministic checks reject unsupported evidence IDs, stock phrases, excessive similarity, missing company anchors, and out-of-range length.
7. A score below 88 or thin evidence produces no message.
8. External sending remains manual.

The system must prefer no draft over shallow, reusable agency copy.
