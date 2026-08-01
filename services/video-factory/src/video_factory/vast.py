from __future__ import annotations

import json
import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx

from .runtime_config import load_runtime_config


class VastAPIError(RuntimeError):
    pass


@dataclass(frozen=True)
class VastInstanceConnection:
    instance_id: int
    base_url: str
    api_key: str
    template_hash: str | None

    def safe_dict(self) -> dict[str, object]:
        return {
            "instance_id": self.instance_id,
            "base_url": self.base_url,
            "api_key_configured": True,
            "template_hash": self.template_hash,
        }


def _mapped_port(instance: Mapping[str, Any], name: str) -> int | None:
    ports = instance.get("ports")
    if not isinstance(ports, Mapping):
        return None
    mappings = ports.get(name)
    mapping = (mappings[0] if mappings else None) if isinstance(mappings, list) else mappings
    if isinstance(mapping, Mapping):
        value = mapping.get("HostPort") or mapping.get("host_port")
    else:
        value = mapping
    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
        return None
    try:
        port = int(value)
    except (TypeError, ValueError):
        return None
    return port if 1 <= port <= 65535 else None


def _instance_environment(instance: Mapping[str, Any]) -> dict[str, str]:
    raw = instance.get("extra_env")
    if isinstance(raw, Mapping):
        return {
            str(key): str(value)
            for key, value in raw.items()
            if value is not None
        }
    if not isinstance(raw, list):
        return {}
    environment: dict[str, str] = {}
    for item in raw:
        if not isinstance(item, (list, tuple)) or len(item) != 2:
            continue
        key, value = item
        if value is not None:
            environment[str(key)] = str(value)
    return environment


def safe_vast_instance(instance: Mapping[str, Any]) -> dict[str, object]:
    """Return only fields the operator GUI needs; never forward marketplace secrets."""
    proxy_port = _mapped_port(instance, "18189/tcp")
    environment = _instance_environment(instance)
    allowed_fields = (
        "id",
        "instance_id",
        "label",
        "actual_status",
        "status",
        "cur_state",
        "intended_status",
        "gpu_name",
        "gpu_ram",
        "num_gpus",
        "dph_total",
        "public_ipaddr",
        "country_code",
        "geolocation",
        "reliability2",
        "template_hash_id",
        "start_date",
    )
    safe = {
        field: instance[field]
        for field in allowed_fields
        if field in instance and instance[field] is not None
    }
    safe["comfyui_proxy_port"] = proxy_port
    safe["ports"] = (
        {"18189/tcp": [{"HostPort": str(proxy_port)}]}
        if proxy_port is not None
        else {}
    )
    safe["managed_proxy_available"] = bool(
        proxy_port and environment.get("COMFY_PROXY_KEY")
    )
    return safe


def vast_instance_connection(instance: Mapping[str, Any]) -> VastInstanceConnection:
    label = str(instance.get("label") or "")
    if not label.startswith("paradigm-comfyui"):
        raise ValueError("Only Paradigm-managed ComfyUI instances can be adopted")
    status = str(
        instance.get("actual_status")
        or instance.get("status")
        or instance.get("cur_state")
        or "unknown"
    )
    if status != "running":
        raise ValueError(f"The Vast.ai instance must be running before adoption: {status}")
    instance_id_value = instance.get("id") or instance.get("instance_id")
    if isinstance(instance_id_value, bool) or not isinstance(
        instance_id_value, (str, int, float)
    ):
        raise ValueError("Vast.ai instance ID is invalid")
    try:
        instance_id = int(instance_id_value)
    except (TypeError, ValueError) as error:
        raise ValueError("Vast.ai instance ID is invalid") from error
    host = str(instance.get("public_ipaddr") or instance.get("public_ip") or "").strip()
    parsed_host = urlparse(f"//{host}")
    if not parsed_host.hostname or parsed_host.username or parsed_host.password:
        raise ValueError("Vast.ai instance has no safe public host")
    port = _mapped_port(instance, "18189/tcp")
    if port is None:
        raise ValueError("The authenticated ComfyUI proxy port is not available")
    api_key = _instance_environment(instance).get("COMFY_PROXY_KEY", "").strip()
    if len(api_key) < 32:
        raise ValueError("The managed ComfyUI proxy key is unavailable")
    host_for_url = f"[{parsed_host.hostname}]" if ":" in parsed_host.hostname else parsed_host.hostname
    template_hash = str(instance.get("template_hash_id") or "").strip() or None
    return VastInstanceConnection(
        instance_id=instance_id,
        base_url=f"https://{host_for_url}:{port}",
        api_key=api_key,
        template_hash=template_hash,
    )


@dataclass(frozen=True)
class VastConfig:
    api_key: str | None
    base_url: str
    default_template_hash: str | None
    max_hourly_price: float | None
    timeout_seconds: float

    @classmethod
    def from_workspace(cls, workspace: Path) -> VastConfig:
        runtime = load_runtime_config(workspace)
        raw_max = (os.getenv("VAST_MAX_HOURLY_PRICE") or "").strip()
        return cls(
            api_key=runtime.vast_api_key or os.getenv("VAST_API_KEY") or None,
            base_url=os.getenv(
                "VAST_API_BASE_URL", "https://console.vast.ai/api"
            ).rstrip("/"),
            default_template_hash=(
                runtime.vast_template_hash
                or os.getenv("VAST_DEFAULT_TEMPLATE_HASH")
                or None
            ),
            max_hourly_price=float(raw_max) if raw_max else None,
            timeout_seconds=float(os.getenv("VAST_API_TIMEOUT_SECONDS", "30")),
        )

    def safe_dict(self) -> dict[str, object]:
        return {
            "configured": bool(self.api_key),
            "base_url": self.base_url,
            "default_template_hash": self.default_template_hash,
            "max_hourly_price": self.max_hourly_price,
        }


class VastClient:
    def __init__(
        self,
        config: VastConfig,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.config = config
        self.transport = transport

    def _headers(self) -> dict[str, str]:
        if not self.config.api_key:
            raise VastAPIError("VAST_API_KEY is not configured")
        return {
            "Authorization": f"Bearer {self.config.api_key}",
            "Accept": "application/json",
        }

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        json_body: dict[str, Any] | None = None,
    ) -> Any:
        headers = self._headers()
        if json_body is not None:
            headers["Content-Type"] = "application/json"
        try:
            async with httpx.AsyncClient(
                base_url=self.config.base_url,
                headers=headers,
                timeout=self.config.timeout_seconds,
                transport=self.transport,
            ) as client:
                response = await client.request(
                    method,
                    path,
                    params=params,
                    json=json_body,
                )
                response.raise_for_status()
                if not response.content:
                    return {"success": True}
                return response.json()
        except httpx.HTTPStatusError as error:
            detail = error.response.text[:1000]
            raise VastAPIError(
                f"Vast.ai API returned HTTP {error.response.status_code}: {detail}"
            ) from error
        except (httpx.HTTPError, ValueError) as error:
            raise VastAPIError(f"Vast.ai API request failed: {error}") from error

    async def search_templates(
        self,
        *,
        recommended_only: bool = True,
        ssh_only: bool = True,
        query: str = "ComfyUI",
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        filters: dict[str, Any] = {}
        if recommended_only:
            filters["recommended"] = {"eq": True}
        if ssh_only:
            filters["use_ssh"] = {"eq": True}
        payload = await self._request(
            "GET",
            "/v0/template/",
            params={
                "select_filters": json.dumps(filters),
                "select_cols": json.dumps(["*"]),
                "order_by": "count_created",
            },
        )
        templates = payload.get("templates", []) if isinstance(payload, dict) else []
        if not isinstance(templates, list):
            return []
        needle = query.strip().lower()
        results = [item for item in templates if isinstance(item, dict)]
        if needle:
            results = [
                item
                for item in results
                if needle in str(item.get("name", "")).lower()
                or needle in str(item.get("image", "")).lower()
                or needle in str(item.get("desc", "")).lower()
            ]
        return results[: max(1, min(limit, 100))]

    async def search_offers(
        self,
        *,
        gpu_names: list[str],
        min_gpu_ram_mb: int,
        min_reliability: float,
        verified: bool,
        instance_type: str,
        max_hourly_price: float | None,
        limit: int,
    ) -> list[dict[str, Any]]:
        vast_instance_type = "ondemand" if instance_type == "on-demand" else instance_type
        if vast_instance_type not in {"ondemand", "bid"}:
            raise VastAPIError("Vast.ai instance type must be on-demand/ondemand or bid")
        body: dict[str, Any] = {
            "gpu_name": {"in": gpu_names},
            "num_gpus": {"gte": 1},
            "gpu_ram": {"gte": min_gpu_ram_mb},
            "reliability": {"gte": min_reliability},
            "rentable": {"eq": True},
            "rented": {"eq": False},
            "type": vast_instance_type,
            "limit": max(1, min(limit, 100)),
            "order": [["dph_total", "asc"]],
        }
        if verified:
            body["verified"] = {"eq": True}
        price_cap = max_hourly_price or self.config.max_hourly_price
        if price_cap is not None:
            body["dph_total"] = {"lte": price_cap}
        payload = await self._request("POST", "/v0/bundles/", json_body=body)
        if isinstance(payload, dict):
            offers = payload.get("offers", [])
            if isinstance(offers, dict):
                offers = [offers]
            if isinstance(offers, list):
                return [item for item in offers if isinstance(item, dict)]
        return []

    async def create_instance(
        self,
        offer_id: int,
        *,
        template_hash_id: str | None,
        label: str,
        disk_gb: float,
        target_state: str = "running",
        volume_id: int | None = None,
        mount_path: str = "/workspace",
        env: dict[str, str] | None = None,
        onstart: str | None = None,
        runtype: str | None = None,
    ) -> dict[str, Any]:
        template = template_hash_id or self.config.default_template_hash
        if not template:
            raise VastAPIError("A Vast.ai template hash is required")
        body: dict[str, Any] = {
            "template_hash_id": template,
            "label": label,
            "disk": disk_gb,
            "target_state": target_state,
            "cancel_unavail": True,
        }
        if env:
            body["env"] = dict(env)
        if onstart:
            body["onstart"] = onstart
        if runtype:
            body["runtype"] = runtype
        if volume_id is not None:
            body["volume_info"] = {
                "create_new": False,
                "volume_id": volume_id,
                "mount_path": mount_path,
            }
        payload = await self._request(
            "PUT",
            f"/v0/asks/{offer_id}/",
            json_body=body,
        )
        if not isinstance(payload, dict):
            raise VastAPIError("Vast.ai returned an unexpected create-instance response")
        return payload

    async def list_instances(self) -> list[dict[str, Any]]:
        payload = await self._request("GET", "/v1/instances/")
        if isinstance(payload, dict):
            instances = payload.get("instances", payload.get("results", []))
            if isinstance(instances, dict):
                instances = [instances]
            if isinstance(instances, list):
                return [item for item in instances if isinstance(item, dict)]
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        return []

    async def set_instance_state(
        self,
        instance_id: int,
        state: str,
    ) -> dict[str, Any]:
        if state not in {"running", "stopped"}:
            raise VastAPIError("Instance state must be running or stopped")
        payload = await self._request(
            "PUT",
            f"/v0/instances/{instance_id}/",
            json_body={"state": state},
        )
        return payload if isinstance(payload, dict) else {"success": True}

    async def destroy_instance(self, instance_id: int) -> dict[str, Any]:
        payload = await self._request("DELETE", f"/v0/instances/{instance_id}/")
        return payload if isinstance(payload, dict) else {"success": True}
