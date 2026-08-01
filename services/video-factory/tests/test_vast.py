from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx

from video_factory.vast import (
    VastClient,
    VastConfig,
    safe_vast_instance,
    vast_instance_connection,
)


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


def test_vast_instance_projection_never_exposes_marketplace_secrets() -> None:
    proxy_key = "proxy-secret-" + "x" * 40
    raw = {
        "id": 9001,
        "label": "paradigm-comfyui-wan22-test",
        "actual_status": "running",
        "gpu_name": "RTX 4090",
        "gpu_ram": 24576,
        "dph_total": 0.45,
        "public_ipaddr": "203.0.113.10",
        "template_hash_id": "template-hash",
        "jupyter_token": "jupyter-secret",
        "ssh_key": "ssh-secret",
        "extra_env": [
            ["COMFY_PROXY_KEY", proxy_key],
            ["PROVISIONING_SCRIPT", "https://example.test/provision.sh"],
        ],
        "ports": {"18189/tcp": [{"HostPort": "48189"}]},
    }

    safe = safe_vast_instance(raw)
    serialized = json.dumps(safe)

    assert safe["id"] == 9001
    assert safe["comfyui_proxy_port"] == 48189
    assert safe["managed_proxy_available"] is True
    assert proxy_key not in serialized
    assert "jupyter-secret" not in serialized
    assert "ssh-secret" not in serialized
    assert "extra_env" not in safe
    assert safe["ports"] == {"18189/tcp": [{"HostPort": "48189"}]}
    assert "8188/tcp" not in serialized


def test_vast_instance_connection_recovers_only_managed_authenticated_proxy() -> None:
    proxy_key = "p" * 64
    raw = {
        "id": 9001,
        "label": "paradigm-comfyui-wan22-test",
        "actual_status": "running",
        "public_ipaddr": "203.0.113.10",
        "template_hash_id": "template-hash",
        "extra_env": [["COMFY_PROXY_KEY", proxy_key]],
        "ports": {"18189/tcp": [{"HostPort": "48189"}]},
    }

    connection = vast_instance_connection(raw)

    assert connection.instance_id == 9001
    assert connection.base_url == "https://203.0.113.10:48189"
    assert connection.api_key == proxy_key
    assert proxy_key not in json.dumps(connection.safe_dict())


def test_vast_instance_connection_rejects_unmanaged_instance() -> None:
    raw = {
        "id": 9001,
        "label": "personal-notebook",
        "actual_status": "running",
        "public_ipaddr": "203.0.113.10",
        "extra_env": [["COMFY_PROXY_KEY", "p" * 64]],
        "ports": {"18189/tcp": [{"HostPort": "48189"}]},
    }

    try:
        vast_instance_connection(raw)
    except ValueError as error:
        assert "Paradigm-managed" in str(error)
    else:
        raise AssertionError("unmanaged Vast instance was accepted")
