from __future__ import annotations

import hmac
import os
from collections.abc import AsyncIterator
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from starlette.background import BackgroundTask
from starlette.responses import JSONResponse, StreamingResponse

_PROXY_METHODS = {
    ("GET", "system_stats"),
    ("GET", "object_info"),
    ("GET", "queue"),
    ("GET", "history"),
    ("GET", "view"),
    ("POST", "prompt"),
    ("POST", "interrupt"),
    ("POST", "queue"),
}
_HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}


@dataclass(frozen=True)
class ProxyConfig:
    upstream_url: str
    api_key: str
    timeout_seconds: float
    max_body_bytes: int

    @classmethod
    def from_env(cls) -> ProxyConfig:
        upstream = os.getenv("COMFYUI_UPSTREAM_URL", "").rstrip("/")
        key = os.getenv("COMFYUI_PROXY_API_KEY") or os.getenv("COMFYUI_API_KEY") or ""
        parsed = urlparse(upstream)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("COMFYUI_UPSTREAM_URL must be an absolute http(s) URL")
        if parsed.username or parsed.password:
            raise ValueError("COMFYUI_UPSTREAM_URL must not contain credentials")
        if len(key) < 24:
            raise ValueError("COMFYUI_PROXY_API_KEY must contain at least 24 characters")
        return cls(
            upstream_url=upstream,
            api_key=key,
            timeout_seconds=float(os.getenv("COMFYUI_PROXY_TIMEOUT_SECONDS", "1800")),
            max_body_bytes=int(os.getenv("COMFYUI_PROXY_MAX_BODY_BYTES", "10485760")),
        )


app = FastAPI(
    title="Paradigm ComfyUI Auth Proxy",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


def _provided_key(
    authorization: str | None,
    x_api_key: str | None,
) -> str:
    if x_api_key:
        return x_api_key
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return ""


def _authorize(
    config: ProxyConfig,
    authorization: str | None,
    x_api_key: str | None,
) -> None:
    provided = _provided_key(authorization, x_api_key)
    if not provided or not hmac.compare_digest(provided, config.api_key):
        raise HTTPException(status_code=401, detail="Invalid ComfyUI proxy API key")


def _route_allowed(method: str, path: str) -> bool:
    normalized = path.strip("/")
    root = normalized.split("/", 1)[0]
    return (method.upper(), root) in _PROXY_METHODS


async def _close_stream(response: httpx.Response, client: httpx.AsyncClient) -> None:
    await response.aclose()
    await client.aclose()


@app.get("/proxy/health")
async def health(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> JSONResponse:
    try:
        config = ProxyConfig.from_env()
    except ValueError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    _authorize(config, authorization, x_api_key)
    try:
        async with httpx.AsyncClient(
            base_url=config.upstream_url,
            timeout=10.0,
        ) as client:
            response = await client.get("/system_stats")
            response.raise_for_status()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail=f"ComfyUI upstream unavailable: {error}") from error
    return JSONResponse({"status": "ok", "upstream_reachable": True})


@app.api_route(
    "/{path:path}",
    methods=["GET", "POST"],
)
async def proxy(
    path: str,
    request: Request,
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> StreamingResponse:
    try:
        config = ProxyConfig.from_env()
    except ValueError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    _authorize(config, authorization, x_api_key)
    if not _route_allowed(request.method, path):
        raise HTTPException(status_code=404, detail="ComfyUI route is not exposed")

    body = await request.body()
    if len(body) > config.max_body_bytes:
        raise HTTPException(status_code=413, detail="ComfyUI request body is too large")

    forwarded_headers: dict[str, str] = {}
    for name in ("accept", "content-type", "range"):
        value = request.headers.get(name)
        if value:
            forwarded_headers[name] = value

    client = httpx.AsyncClient(
        base_url=config.upstream_url,
        timeout=httpx.Timeout(config.timeout_seconds, connect=15.0),
    )
    upstream_request = client.build_request(
        request.method,
        f"/{path.strip('/')}",
        params=request.query_params,
        content=body or None,
        headers=forwarded_headers,
    )
    try:
        upstream = await client.send(upstream_request, stream=True)
    except httpx.HTTPError as error:
        await client.aclose()
        raise HTTPException(status_code=502, detail=f"ComfyUI upstream request failed: {error}") from error

    response_headers = {
        name: value
        for name, value in upstream.headers.items()
        if name.lower() not in _HOP_BY_HOP_HEADERS
        and name.lower() in {"content-type", "content-length", "content-disposition", "etag"}
    }

    async def body_iterator() -> AsyncIterator[bytes]:
        async for chunk in upstream.aiter_raw():
            yield chunk

    return StreamingResponse(
        body_iterator(),
        status_code=upstream.status_code,
        headers=response_headers,
        background=BackgroundTask(_close_stream, upstream, client),
    )
