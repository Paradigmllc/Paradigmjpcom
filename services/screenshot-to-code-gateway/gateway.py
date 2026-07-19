"""Private HTTP gateway over the pinned screenshot-to-code websocket runtime."""

from __future__ import annotations

import asyncio
import base64
from io import BytesIO
import json
import os
import urllib.error
import urllib.request
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Dict, List, Optional

import websockets
from fastapi import FastAPI, Header, HTTPException
from PIL import Image, ImageStat
from pydantic import BaseModel, Field, field_validator


UPSTREAM_PORT = int(os.environ.get("SCREENSHOT_TO_CODE_UPSTREAM_PORT", "7001"))
PORT = int(os.environ.get("SCREENSHOT_TO_CODE_PORT", "7002"))
UPSTREAM_DIR = "/opt/screenshot-to-code/backend"
UPSTREAM_COMMIT = os.environ.get("SCREENSHOT_TO_CODE_UPSTREAM_COMMIT", "unknown")
SHARED_SECRET = os.environ.get("SCREENSHOT_TO_CODE_SHARED_SECRET", "").strip()
VISUAL_MODE = os.environ.get("SCREENSHOT_TO_CODE_VISUAL_MODE", "metadata-text").strip().lower()
GENERATED_CODE_CONFIG = os.environ.get("SCREENSHOT_TO_CODE_GENERATED_CODE_CONFIG", "html_tailwind").strip().lower()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
COMPATIBLE_VISION_API_KEY = os.environ.get("VISION_API_KEY", "").strip()
VISION_API_KEY = GEMINI_API_KEY or COMPATIBLE_VISION_API_KEY
VISION_PROVIDER = "gemini" if GEMINI_API_KEY else "openai-compatible" if COMPATIBLE_VISION_API_KEY else None
VISION_API_BASE = os.environ.get("VISION_API_BASE", "").strip().rstrip("/")
VISION_MODEL = os.environ.get("VISION_MODEL", "").strip() or os.environ.get("GEMINI_VISION_MODEL", "gemini-2.0-flash").strip()
VISION_READY = bool(VISION_API_KEY and (VISION_PROVIDER == "gemini" or VISION_API_BASE))
VISION_REQUIRED_BY_DEFAULT = os.environ.get("SCREENSHOT_TO_CODE_REQUIRE_VISION", "false").strip().lower() == "true"
upstream_process: asyncio.subprocess.Process | None = None
upstream_log_task: asyncio.Task[None] | None = None


class GenerateRequest(BaseModel):
    image_data_urls: List[str] = Field(min_length=1, max_length=3)
    prompt: str = Field(default="", max_length=6000)
    design_system: Optional[str] = Field(default=None, max_length=12000)
    require_vision: bool = False

    @field_validator("image_data_urls")
    @classmethod
    def validate_images(cls, values: List[str]) -> List[str]:
        for value in values:
            if len(value) > 8_000_000:
                raise ValueError("each image must be 8MB or smaller")
            if not (value.startswith("data:image/") or value.startswith("https://")):
                raise ValueError("images must be data URLs or HTTPS URLs")
        return values


async def _start_upstream() -> None:
    global upstream_process, upstream_log_task
    env = os.environ.copy()
    env["IS_PROD"] = "true"
    env["NUM_VARIANTS"] = "1"
    upstream_process = await asyncio.create_subprocess_exec(
        "uvicorn",
        "main:app",
        "--host",
        "127.0.0.1",
        "--port",
        str(UPSTREAM_PORT),
        cwd=UPSTREAM_DIR,
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    upstream_log_task = asyncio.create_task(_drain_upstream_logs())
    for _ in range(90):
        if upstream_process.returncode is not None:
            raise RuntimeError(f"upstream exited during startup: {upstream_process.returncode}")
        try:
            reader, writer = await asyncio.open_connection("127.0.0.1", UPSTREAM_PORT)
            writer.close()
            await writer.wait_closed()
            return
        except OSError:
            await asyncio.sleep(1)
    raise RuntimeError("screenshot-to-code upstream did not become ready")


async def _stop_upstream() -> None:
    global upstream_log_task
    if upstream_process is not None and upstream_process.returncode is None:
        upstream_process.terminate()
        try:
            await asyncio.wait_for(upstream_process.wait(), timeout=15)
        except asyncio.TimeoutError:
            upstream_process.kill()
            await upstream_process.wait()
    if upstream_log_task is not None:
        upstream_log_task.cancel()
        try:
            await upstream_log_task
        except asyncio.CancelledError:
            pass
        upstream_log_task = None


async def _drain_upstream_logs() -> None:
    process = upstream_process
    if process is None or process.stdout is None:
        return
    async for line in process.stdout:
        message = line.decode("utf-8", errors="replace").rstrip()
        if message:
            print(f"[screenshot-to-code-upstream] {message}", flush=True)


def _image_metadata(data_url: str, index: int) -> str:
    if not data_url.startswith("data:image/"):
        return f"Screenshot {index}: HTTPS image URL supplied; dimensions are unavailable in text-only mode."
    try:
        encoded = data_url.split(",", 1)[1]
        image = Image.open(BytesIO(base64.b64decode(encoded))).convert("RGB")
        width, height = image.size
        mean = ImageStat.Stat(image).mean
        palette = ", ".join(f"rgb({round(channel)})" for channel in mean)
        orientation = "portrait" if height > width else "landscape" if width > height else "square"
        return f"Screenshot {index}: {width}x{height}px, {orientation}, average color {palette}."
    except Exception as error:
        print(f"[screenshot-to-code-gateway] image metadata skipped: {error}", flush=True)
        return f"Screenshot {index}: image bytes were supplied but metadata could not be decoded."


def _decode_data_url(value: str) -> tuple[str, str] | None:
    if not value.startswith("data:image/") or "," not in value:
        return None
    header, encoded = value.split(",", 1)
    mime = header[5:].split(";", 1)[0]
    try:
        base64.b64decode(encoded, validate=True)
    except Exception as error:
        print(f"[screenshot-to-code-gateway] invalid vision data URL: {error}", flush=True)
        return None
    return mime, encoded


def _vision_request_body(prompt: str, image_data_urls: List[str]) -> Dict[str, Any]:
    parts: List[Dict[str, Any]] = [{"text": prompt}]
    for value in image_data_urls:
        decoded = _decode_data_url(value)
        if decoded is None:
            continue
        mime, encoded = decoded
        parts.append({"inline_data": {"mime_type": mime, "data": encoded}})
    return {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 3500},
    }


def _compatible_vision_request_body(prompt: str, image_data_urls: List[str]) -> Dict[str, Any]:
    content: List[Dict[str, Any]] = [{"type": "text", "text": prompt}]
    content.extend({"type": "image_url", "image_url": {"url": value}} for value in image_data_urls)
    return {"model": VISION_MODEL, "messages": [{"role": "user", "content": content}], "temperature": 0.1, "max_tokens": 3500}


async def _analyze_with_vision(request: GenerateRequest) -> str:
    required = request.require_vision or VISION_REQUIRED_BY_DEFAULT
    if not VISION_READY:
        if required:
            raise HTTPException(status_code=503, detail="vision provider is not configured")
        return ""
    data_urls = [value for value in request.image_data_urls if value.startswith("data:image/")]
    if not data_urls:
        if required:
            raise HTTPException(status_code=422, detail="vision analysis requires data URL screenshots")
        return ""
    analysis_prompt = "Analyze these website screenshots for faithful code reconstruction. Describe exact layout regions, typography scale and weights, colors, spacing, navigation, imagery composition, content hierarchy, responsive differences, visible interactions, and any page-specific details. Do not invent business facts. Return concise implementation notes only."
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{VISION_MODEL}:generateContent" if VISION_PROVIDER == "gemini" else f"{VISION_API_BASE}/chat/completions"
    body = json.dumps(_vision_request_body(analysis_prompt, data_urls) if VISION_PROVIDER == "gemini" else _compatible_vision_request_body(analysis_prompt, data_urls)).encode("utf-8")

    def request() -> str:
        req = urllib.request.Request(
            endpoint,
            data=body,
            headers={"Content-Type": "application/json", **({"x-goog-api-key": VISION_API_KEY} if VISION_PROVIDER == "gemini" else {"Authorization": f"Bearer {VISION_API_KEY}"})},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as error:
            raise RuntimeError(f"vision provider request failed: {error}") from error
        if VISION_PROVIDER == "gemini":
            candidates = payload.get("candidates", []) if isinstance(payload, dict) else []
            if not isinstance(candidates, list) or not candidates or not isinstance(candidates[0], dict): return ""
            content = candidates[0].get("content", {})
            parts = content.get("parts", []) if isinstance(content, dict) else []
            return "\n".join(part.get("text", "") for part in parts if isinstance(part, dict) and isinstance(part.get("text"), str)).strip()
        choices = payload.get("choices", []) if isinstance(payload, dict) else []
        message = choices[0].get("message", {}) if isinstance(choices, list) and choices and isinstance(choices[0], dict) else {}
        return str(message.get("content", "")).strip() if isinstance(message, dict) else ""

    try:
        analysis = await asyncio.to_thread(request)
    except Exception as error:
        print(f"[screenshot-to-code-gateway] vision analysis failed: {error}", flush=True)
        if required:
            raise HTTPException(status_code=502, detail="vision analysis failed") from error
        return ""
    if required and not analysis:
        raise HTTPException(status_code=502, detail="vision provider returned no analysis")
    return analysis


def _build_generation_input(request: GenerateRequest, visual_analysis: str = "") -> tuple[str, Dict[str, Any]]:
    if VISUAL_MODE == "image":
        return "image", {"text": request.prompt, "images": request.image_data_urls, "videos": []}
    metadata = "\n".join(_image_metadata(value, index + 1) for index, value in enumerate(request.image_data_urls))
    text = (
        f"{request.prompt}\n\n"
        "Visual source note: the code model is text-only. Use the verified visual analysis below "
        "and the design system, keep the requested industry terminology, and do not invent unrelated services.\n"
        f"{visual_analysis}\n{metadata}"
    ).strip()
    return "text", {"text": text, "images": [], "videos": []}


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await _start_upstream()
    try:
        yield
    finally:
        await _stop_upstream()


app = FastAPI(title="Paradigm screenshot-to-code gateway", lifespan=lifespan, docs_url=None, redoc_url=None)


def _authorize(header: str | None) -> None:
    if not SHARED_SECRET:
        raise HTTPException(status_code=503, detail="SCREENSHOT_TO_CODE_SHARED_SECRET is not configured")
    if header != SHARED_SECRET:
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "ok": upstream_process is not None and upstream_process.returncode is None,
        "service": "screenshot-to-code",
        "upstream_commit": UPSTREAM_COMMIT,
        "provider": "deepseek-chat-completions-adapter",
        "visual_mode": VISUAL_MODE,
        "generated_code_config": GENERATED_CODE_CONFIG,
        "vision_provider": VISION_PROVIDER,
        "vision_model": VISION_MODEL if VISION_READY else None,
        "vision_ready": VISION_READY,
    }


@app.post("/generate")
async def generate(request: GenerateRequest, x_screenshot_to_code_secret: str | None = Header(default=None)) -> Dict[str, Any]:
    _authorize(x_screenshot_to_code_secret)
    visual_analysis = await _analyze_with_vision(request)
    input_mode, prompt_content = _build_generation_input(request, visual_analysis)
    payload = {
        "generatedCodeConfig": GENERATED_CODE_CONFIG,
        "inputMode": input_mode,
        "generationType": "create",
        "isImageGenerationEnabled": False,
        "isAssetExtractionEnabled": False,
        "prompt": prompt_content,
        "history": [],
        "designSystem": request.design_system,
    }
    code = ""
    errors: List[str] = []
    completed = False
    uri = f"ws://127.0.0.1:{UPSTREAM_PORT}/generate-code"
    try:
        async with websockets.connect(uri, open_timeout=20, close_timeout=20, max_size=20_000_000) as websocket:
            await websocket.send(json.dumps(payload))
            async for raw in websocket:
                message = json.loads(raw)
                message_type = message.get("type")
                if message_type == "setCode" and isinstance(message.get("value"), str):
                    code = message["value"]
                elif message_type in {"error", "variantError"} and isinstance(message.get("value"), str):
                    errors.append(message["value"])
                elif message_type == "variantComplete":
                    completed = True
                    break
    except Exception as error:
        print(f"[screenshot-to-code-gateway] generation failed: {error}")
        if errors:
            raise HTTPException(status_code=422, detail=errors[0]) from error
        raise HTTPException(status_code=502, detail="screenshot-to-code generation failed") from error

    if not completed or not code.strip():
        detail = errors[0] if errors else "upstream returned no code"
        raise HTTPException(status_code=422, detail=detail)
    return {
        "ok": True,
        "code": code,
        "upstream_commit": UPSTREAM_COMMIT,
        "provider": "deepseek-chat-completions-adapter",
        "model": os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro"),
        "visual_mode": VISUAL_MODE,
        "generated_code_config": GENERATED_CODE_CONFIG,
        "vision_provider": VISION_PROVIDER,
        "vision_model": VISION_MODEL if VISION_READY else None,
        "vision_analyzed": bool(visual_analysis),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
