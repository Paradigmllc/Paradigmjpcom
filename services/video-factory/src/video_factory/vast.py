from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

from .runtime_config import load_runtime_config


class VastAPIError(RuntimeError):
    pass


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
