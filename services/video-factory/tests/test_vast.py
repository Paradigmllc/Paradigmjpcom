from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx

from video_factory.vast import VastClient, VastConfig


def _config() -> VastConfig:
    return VastConfig(
        api_key="test-key",
        base_url="https://console.vast.ai/api",
        default_template_hash="default-template",
        max_hourly_price=1.0,
        timeout_seconds=5,
    )


def test_vast_template_and_offer_search_request_shapes() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        assert request.headers["Authorization"] == "Bearer test-key"
        if request.url.path.endswith("/v0/template/"):
            return httpx.Response(
                200,
                json={
                    "success": True,
                    "templates_found": 2,
                    "templates": [
                        {
                            "name": "Recommended ComfyUI",
                            "hash_id": "template-1",
                            "image": "vastai/comfy",
                        },
                        {
                            "name": "Unrelated",
                            "hash_id": "template-2",
                            "image": "ubuntu",
                        },
                    ],
                },
            )
        if request.url.path.endswith("/v0/bundles/"):
            body = json.loads(request.content)
            assert body["gpu_name"] == {"in": ["RTX 4090"]}
            assert body["gpu_ram"] == {"gte": 24576}
            assert body["dph_total"] == {"lte": 0.8}
            assert body["type"] == "ondemand"
            return httpx.Response(
                200,
                json={
                    "offers": [
                        {
                            "id": 123,
                            "gpu_name": "RTX 4090",
                            "gpu_ram": 24576,
                            "dph_total": 0.55,
                        }
                    ]
                },
            )
        raise AssertionError(f"Unexpected Vast.ai route: {request.url}")

    client = VastClient(_config(), transport=httpx.MockTransport(handler))
    templates = asyncio.run(client.search_templates(query="ComfyUI"))
    offers = asyncio.run(
        client.search_offers(
            gpu_names=["RTX 4090"],
            min_gpu_ram_mb=24576,
            min_reliability=0.99,
            verified=True,
            instance_type="on-demand",
            max_hourly_price=0.8,
            limit=10,
        )
    )

    assert [item["hash_id"] for item in templates] == ["template-1"]
    assert offers[0]["id"] == 123
    assert len(requests) == 2


def test_vast_instance_lifecycle() -> None:
    methods_and_paths: list[tuple[str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        methods_and_paths.append((request.method, request.url.path))
        if request.method == "PUT" and request.url.path.endswith("/v0/asks/42/"):
            body = json.loads(request.content)
            assert body["template_hash_id"] == "template-hash"
            assert body["disk"] == 80
            assert body["env"] == {
                "PROVISIONING_SCRIPT": "https://example.test/provision.sh",
                "-p 18189:18189": "1",
            }
            assert body["onstart"] == "echo ready"
            assert body["runtype"] == "ssh_direct"
            return httpx.Response(200, json={"success": True, "new_contract": 9001})
        if request.method == "GET" and request.url.path.endswith("/v1/instances/"):
            return httpx.Response(
                200,
                json={"instances": [{"id": 9001, "actual_status": "running"}]},
            )
        if request.method == "PUT" and request.url.path.endswith("/v0/instances/9001/"):
            assert json.loads(request.content) == {"state": "stopped"}
            return httpx.Response(200, json={"success": True})
        if request.method == "DELETE" and request.url.path.endswith("/v0/instances/9001/"):
            return httpx.Response(200, json={"success": True})
        raise AssertionError(f"Unexpected Vast.ai route: {request.url}")

    client = VastClient(_config(), transport=httpx.MockTransport(handler))
    created = asyncio.run(
        client.create_instance(
            42,
            template_hash_id="template-hash",
            label="paradigm-comfyui",
            disk_gb=80,
            env={
                "PROVISIONING_SCRIPT": "https://example.test/provision.sh",
                "-p 18189:18189": "1",
            },
            onstart="echo ready",
            runtype="ssh_direct",
        )
    )
    instances = asyncio.run(client.list_instances())
    stopped = asyncio.run(client.set_instance_state(9001, "stopped"))
    destroyed = asyncio.run(client.destroy_instance(9001))

    assert created["new_contract"] == 9001
    assert instances[0]["actual_status"] == "running"
    assert stopped["success"] is True
    assert destroyed["success"] is True
    assert methods_and_paths == [
        ("PUT", "/api/v0/asks/42/"),
        ("GET", "/api/v1/instances/"),
        ("PUT", "/api/v0/instances/9001/"),
        ("DELETE", "/api/v0/instances/9001/"),
    ]


def test_vast_config_reads_gui_runtime(tmp_path: Path, monkeypatch) -> None:
    from video_factory.runtime_config import update_runtime_config

    workspace = tmp_path / "workspace"
    update_runtime_config(
        workspace,
        {"vast_api_key": "runtime-key", "vast_template_hash": "runtime-template"},
    )
    monkeypatch.setenv("VAST_API_KEY", "environment-key")

    config = VastConfig.from_workspace(workspace)

    assert config.api_key == "runtime-key"
    assert config.default_template_hash == "runtime-template"
    assert "runtime-key" not in str(config.safe_dict())
