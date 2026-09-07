import asyncio
import hashlib
import json
import runpy
from dataclasses import replace
from unittest.mock import AsyncMock, Mock, patch

import pytest


def test_candidate_manifest_validates_before_paid_execution(service_root):
    probe = runpy.run_path(str(service_root / "tools/wan_quality_probe.py"))
    manifest = probe["make_manifest"]("wan-qa-fixture", 2, "reference50", "/tmp/fixture.json")
    assert manifest.primary_deliverable.height == 720
    assert manifest.duration_seconds == 121 / 24
    assert manifest.rights.claims_approved_by_client is False
    assert manifest.metadata["automatic_approval"] is False


def test_candidates_preserve_model_graph_and_seed_bindings(service_root):
    probe = runpy.run_path(str(service_root / "tools/wan_quality_probe.py"))
    baseline = {"2": {"inputs": {"shift": 8}}, "7": {"inputs": {"length": 49}},
                "8": {"inputs": {"steps": 20, "seed": "{{seed}}", "cfg": 5}},
                "1": {"inputs": {"unet_name": "exact-model.safetensors"}}}
    candidates = probe["make_candidates"](baseline)
    assert baseline["7"]["inputs"]["length"] == 49
    assert [graph["8"]["inputs"]["steps"] for _, graph in candidates] == [20, 50]
    assert [graph["2"]["inputs"]["shift"] for _, graph in candidates] == [8, 5]
    for _, graph in candidates:
        assert graph["1"] == baseline["1"]
        assert graph["8"]["inputs"]["seed"] == "{{seed}}"
        assert graph["7"]["inputs"]["length"] == 121


def test_offer_must_include_all_cost_and_bootstrap_evidence(service_root):
    probe = runpy.run_path(str(service_root / "tools/wan_quality_probe.py"))
    offer = {"num_gpus": 1, "dph_total": .15, "inet_down": 1200, "disk_bw": 2000,
             "disk_space": 110, "storage_cost": .20, "inet_down_cost": .003, "inet_up_cost": .003}
    assert probe["eligible"](offer)
    for key in offer:
        incomplete = {name: value for name, value in offer.items() if name != key}
        assert not probe["eligible"](incomplete)
    assert not probe["eligible"]({**offer, "inet_down": 400})
    assert not probe["eligible"]({**offer, "inet_up_cost": .02})
    for value in (-1, float('nan'), float('inf')):
        assert not probe["eligible"]({**offer, "dph_total": value})


def test_host_pin_resolves_fresh_offer_without_switching_host(service_root):
    probe = runpy.run_path(str(service_root / "tools/wan_quality_probe.py"))
    quote = {"num_gpus": 1, "dph_total": .15, "inet_down": 1200, "disk_bw": 2000,
             "disk_space": 110, "storage_cost": .20, "inet_down_cost": .003, "inet_up_cost": .003}
    offers = [{**quote, "id": 202, "machine_id": 10}, {**quote, "id": 203, "machine_id": 11}]
    assert probe["select_offer"](offers, 201, None) is None
    assert probe["select_offer"](offers, None, 10)["id"] == 202
    assert probe["select_offer"](offers, None, 12) is None


def test_bootstrap_diagnostics_never_return_provider_message(service_root):
    probe = runpy.run_path(str(service_root / "tools/wan_quality_probe.py"))
    classify = probe["bootstrap_phase"]
    assert classify({"status_msg": "Extracting layer sensitive-value"}) == "image_extracting"
    assert classify({"status_msg": "no space left on device sensitive-value"}) == "disk_full"
    assert classify({"status_msg": "manifest unknown secret-url"}) == "image_unavailable"
    assert classify({"status_msg": "arbitrary API_KEY=secret"}) == "unspecified"


def test_pinned_runtime_rejects_unknown_or_incompatible_driver(service_root):
    probe = runpy.run_path(str(service_root / "tools/wan_quality_probe.py"))
    assert "@sha256:" in probe["COMFY_IMAGE"]
    compatible = probe["compatible_cuda"]
    assert compatible({"cuda_max_good": 12.9})
    assert compatible({"cuda_max_good": 13.0})
    for value in (12.7, None, "", float("inf"), float("nan")):
        assert not compatible({"cuda_max_good": value})
    assert not compatible({})


def test_incompatible_host_blocks_before_paid_create(service_root, settings, tmp_path):
    probe = runpy.run_path(str(service_root / "tools/wan_quality_probe.py"))
    root = tmp_path / "workflows"
    (root / "api").mkdir(parents=True)
    content = json.dumps({"2": {"inputs": {}}, "7": {"inputs": {}}, "8": {"inputs": {}}}).encode()
    (root / "api/abstract-broll-t2v-v1.0.json").write_bytes(content)
    client = Mock()
    client.list_instances = AsyncMock(return_value=[])
    client.search_offers = AsyncMock(return_value=[{
        "id": 1, "machine_id": 42, "num_gpus": 1, "dph_total": .2, "inet_down": 900,
        "disk_bw": 2000, "disk_space": 200, "storage_cost": .2,
        "inet_down_cost": .003, "inet_up_cost": .003, "cuda_max_good": 12.7,
    }])
    client.create_instance = AsyncMock()
    client._request = AsyncMock()
    namespace = probe["run"].__globals__
    with (
        patch.dict(namespace, BASELINE_SHA=hashlib.sha256(content).hexdigest()),
        patch.object(probe["Settings"], "from_env", return_value=replace(settings, comfyui_workflow_root=root)),
        patch.dict(namespace, VastClient=Mock(return_value=client)),
        pytest.raises(ValueError, match="CUDA"),
    ):
        asyncio.run(probe["run"](1, "wan-qa-incompatible", True, runtime="comfy-pinned"))
    client.create_instance.assert_not_awaited()
    client._request.assert_not_awaited()
    assert not (settings.workspace / "projects/wan-qa-incompatible/probe-started.json").exists()


def test_genre_suite_uses_original_prompts_and_conditioned_continuations(service_root, tmp_path):
    probe = runpy.run_path(str(service_root / "tools/wan_quality_probe.py"))
    genre = runpy.run_path(str(service_root / "tools/genre_quality_cases.py"))
    baseline = {"1": {"inputs": {"unet_name": "reviewed.safetensors"}},
                "2": {"inputs": {}}, "7": {"inputs": {}}, "8": {"inputs": {}}, "11": {"inputs": {}}}
    cases = genre["candidates"](baseline, "wan-qa-genres-fixture", tmp_path, probe["make_manifest"])
    assert len(cases) == 10
    assert len({manifest.metadata["genre"] for _, _, manifest in cases}) == 5
    assert "start_image" not in baseline["7"]["inputs"]
    for index, (name, graph, manifest) in enumerate(cases):
        assert graph["1"] == baseline["1"]
        assert graph["8"]["inputs"]["steps"] == 50
        assert manifest.rights.claims_approved_by_client is False
        assert manifest.metadata["quality_accepted"] is False
        assert manifest.metadata["production_bound"] is False
        assert manifest.shots[0].id == f"shot-{index + 1:03d}"
        if name.endswith("-2"):
            assert graph["7"]["inputs"]["start_image"] == ["12", 0]
            assert graph["12"]["inputs"]["image"] == "{{source_image}}"
        else:
            assert "12" not in graph


@pytest.mark.parametrize("candidate", ["draft20", "reference50"])
def test_ambiguous_candidate_cannot_start_full_paid_genre_suite(service_root, candidate):
    probe = runpy.run_path(str(service_root / "tools/wan_quality_probe.py"))
    with patch.object(probe["Settings"], "from_env") as settings, pytest.raises(ValueError, match="cannot narrow"):
        asyncio.run(probe["run"](1, "wan-qa-invalid", True, candidate=candidate,
                                 runtime="comfy-pinned", suite="genres"))
    settings.assert_not_called()
