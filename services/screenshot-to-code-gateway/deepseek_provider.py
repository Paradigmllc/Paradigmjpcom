"""DeepSeek Chat Completions provider for the upstream screenshot-to-code agent.

The upstream project is kept as the generation engine (prompt construction,
agent loop, tool runtime, and websocket protocol). This adapter only supplies
an OpenAI-compatible Chat Completions session because the production stack is
configured with DeepSeek rather than an OpenAI Responses API key.
"""

from __future__ import annotations

import json
import os
from typing import Any, Awaitable, Callable, Dict, List, Optional

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from agent.providers.base import ExecutedToolCall, EventSink, ProviderSession, ProviderTurn, StreamEvent
from agent.tools.types import ToolCall
from llm import Llm, OPENAI_MODELS


def _message_for_chat(message: ChatCompletionMessageParam) -> Dict[str, Any]:
    role = str(message.get("role", "user"))
    content = message.get("content", "")
    if isinstance(content, str):
        return {"role": role, "content": content}

    parts: List[Dict[str, Any]] = []
    if isinstance(content, list):
        for part in content:
            if not isinstance(part, dict):
                continue
            if part.get("type") == "text":
                parts.append({"type": "text", "text": str(part.get("text", ""))})
            elif part.get("type") == "image_url":
                image_url = part.get("image_url")
                if isinstance(image_url, dict) and isinstance(image_url.get("url"), str):
                    parts.append({"type": "image_url", "image_url": {"url": image_url["url"]}})
    return {"role": role, "content": parts}


def _tool_for_chat(tool: Dict[str, Any]) -> Dict[str, Any]:
    if tool.get("type") != "function":
        return tool
    return {
        "type": "function",
        "function": {
            "name": tool.get("name", "tool"),
            "description": tool.get("description", ""),
            "parameters": tool.get("parameters", {"type": "object", "properties": {}}),
        },
    }


class DeepSeekProviderSession(ProviderSession):
    def __init__(
        self,
        client: AsyncOpenAI,
        model_name: str,
        prompt_messages: List[ChatCompletionMessageParam],
        tools: List[Dict[str, Any]],
    ) -> None:
        self._client = client
        self._model_name = model_name
        self._messages: List[Dict[str, Any]] = [_message_for_chat(message) for message in prompt_messages]
        self._tools = [_tool_for_chat(tool) for tool in tools]

    async def stream_turn(self, on_event: EventSink) -> ProviderTurn:
        kwargs: Dict[str, Any] = {
            "model": self._model_name,
            "messages": self._messages,
            "stream": True,
            "temperature": 0.2,
            "max_tokens": 50000,
        }
        if self._tools:
            kwargs["tools"] = self._tools
            kwargs["tool_choice"] = "auto"

        stream = await self._client.chat.completions.create(**kwargs)
        assistant_text = ""
        tool_buffers: Dict[int, Dict[str, str]] = {}

        async for chunk in stream:
            choices = getattr(chunk, "choices", []) or []
            if not choices:
                continue
            delta = getattr(choices[0], "delta", None)
            if delta is None:
                continue
            text = getattr(delta, "content", None)
            if isinstance(text, str) and text:
                assistant_text += text
                await on_event(StreamEvent(type="assistant_delta", text=text))

            for tool_delta in getattr(delta, "tool_calls", None) or []:
                index = int(getattr(tool_delta, "index", 0) or 0)
                buffer = tool_buffers.setdefault(index, {"id": "", "name": "", "arguments": ""})
                call_id = getattr(tool_delta, "id", None)
                if isinstance(call_id, str) and call_id:
                    buffer["id"] = call_id
                function = getattr(tool_delta, "function", None)
                name = getattr(function, "name", None) if function else None
                arguments = getattr(function, "arguments", None) if function else None
                if isinstance(name, str) and name:
                    buffer["name"] = name
                if isinstance(arguments, str) and arguments:
                    buffer["arguments"] += arguments
                await on_event(
                    StreamEvent(
                        type="tool_call_delta",
                        tool_call_id=buffer["id"] or f"deepseek-tool-{index}",
                        tool_name=buffer["name"] or None,
                        tool_arguments=buffer["arguments"],
                    )
                )

        tool_calls = [
            ToolCall(
                id=entry["id"] or f"deepseek-tool-{index}",
                name=entry["name"],
                arguments=_parse_arguments(entry["arguments"]),
            )
            for index, entry in sorted(tool_buffers.items())
            if entry["name"]
        ]
        assistant_turn: Dict[str, Any] = {
            "role": "assistant",
            "content": assistant_text or None,
        }
        if tool_calls:
            assistant_turn["tool_calls"] = [
                {
                    "id": call.id,
                    "type": "function",
                    "function": {"name": call.name, "arguments": json.dumps(call.arguments, ensure_ascii=False)},
                }
                for call in tool_calls
            ]
        return ProviderTurn(assistant_text=assistant_text, tool_calls=tool_calls, assistant_turn=assistant_turn)

    async def append_tool_results(
        self,
        turn: ProviderTurn,
        executed_tool_calls: List[ExecutedToolCall],
    ) -> None:
        if turn.assistant_turn:
            self._messages.append(turn.assistant_turn)
        for executed in executed_tool_calls:
            self._messages.append(
                {
                    "role": "tool",
                    "tool_call_id": executed.tool_call.id,
                    "content": json.dumps(executed.result.result, ensure_ascii=False),
                }
            )

    async def close(self) -> None:
        await self._client.close()


def _parse_arguments(raw: str) -> Dict[str, Any]:
    try:
        value = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}


def create_provider_session(
    model: Llm,
    prompt_messages: List[ChatCompletionMessageParam],
    should_generate_images: bool,
    openai_api_key: Optional[str],
    openai_base_url: Optional[str],
    anthropic_api_key: Optional[str],
    gemini_api_key: Optional[str],
    replicate_api_key: Optional[str],
    should_extract_assets: bool = True,
) -> ProviderSession:
    if model not in OPENAI_MODELS:
        raise ValueError(f"DeepSeek adapter received unsupported model: {model.value}")
    api_key = os.environ.get("DEEPSEEK_API_KEY") or openai_api_key
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY is missing")
    base_url = os.environ.get("DEEPSEEK_API_BASE", "https://api.deepseek.com/v1")
    model_name = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro")

    from agent.tools import canonical_tool_definitions

    tools = canonical_tool_definitions(
        image_generation_enabled=should_generate_images,
        image_editing_enabled=False,
        asset_extraction_enabled=False,
        screenshot_enabled=False,
    )
    serialized = [
        {
            "type": "function",
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.parameters,
        }
        for tool in tools
    ]
    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    return DeepSeekProviderSession(client, model_name, prompt_messages, serialized)
