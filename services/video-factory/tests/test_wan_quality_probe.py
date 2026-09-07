import runpy


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


def test_host_pin_resolves_fresh_offer_without_switching_host(service_root):
    probe = runpy.run_path(str(service_root / "tools/wan_quality_probe.py"))
    quote = {"num_gpus": 1, "dph_total": .15, "inet_down": 1200, "disk_bw": 2000,
             "disk_space": 110, "storage_cost": .20, "inet_down_cost": .003, "inet_up_cost": .003}
    offers = [{**quote, "id": 202, "machine_id": 10}, {**quote, "id": 203, "machine_id": 11}]
    assert probe["select_offer"](offers, 201, None) is None
    assert probe["select_offer"](offers, None, 10)["id"] == 202
    assert probe["select_offer"](offers, None, 12) is None
