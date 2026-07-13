#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import os
import stat
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

import yaml


HELPER_PATH = Path(__file__).with_name("refresh-traefik-origin-lock.py")
SPEC = importlib.util.spec_from_file_location("refresh_traefik_origin_lock", HELPER_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load origin lock helper")
ORIGIN_LOCK = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ORIGIN_LOCK)


def sample_ranges() -> tuple[list[str], list[str]]:
    ipv4 = [f"192.0.2.{index}/32" for index in range(1, 16)]
    ipv6 = [f"2001:db8::{index}/128" for index in range(1, 8)]
    return ipv4, ipv6


def route_document(upstream: str = "http://192.0.2.200:3000") -> str:
    config = {
        "http": {
            "middlewares": {
                "gzip": {"compress": {}},
                "redirect-to-https": {"redirectScheme": {"scheme": "https", "permanent": True}},
            },
            "routers": {
                "paradigmhp-http": {
                    "entryPoints": ["http"],
                    "middlewares": ["redirect-to-https"],
                    "rule": "Host(`paradigmjp.com`) || Host(`www.paradigmjp.com`) || Host(`keystatic.paradigmjp.com`)",
                    "service": "paradigmhp-svc",
                },
                "paradigmhp-https": {
                    "entryPoints": ["https"],
                    "middlewares": ["gzip"],
                    "rule": "Host(`paradigmjp.com`) || Host(`www.paradigmjp.com`) || Host(`keystatic.paradigmjp.com`)",
                    "service": "paradigmhp-svc",
                    "tls": {"certResolver": "letsencrypt"},
                },
            },
            "services": {
                "paradigmhp-svc": {
                    "loadBalancer": {"servers": [{"url": upstream}]},
                },
            },
        },
    }
    return yaml.safe_dump(config, sort_keys=False)


class OriginLockReleaseTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.route_file = self.root / "paradigmjp.yml"
        self.cache_file = self.root / ".origin-lock-cidrs.json"
        self.route_file.write_text(route_document(), encoding="utf-8")
        self.now = datetime(2026, 7, 10, 12, 0, tzinfo=timezone.utc)
        self.ipv4, self.ipv6 = sample_ranges()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def prepare(self) -> None:
        ORIGIN_LOCK.prepare_cloudflare_cache(
            self.route_file,
            self.cache_file,
            fetcher=lambda: (self.ipv4, self.ipv6),
            now=self.now,
        )

    def test_prepare_fetch_failure_keeps_the_live_route_unchanged(self) -> None:
        original = self.route_file.read_bytes()

        def fail_fetch() -> tuple[list[str], list[str]]:
            raise RuntimeError("simulated Cloudflare outage")

        with self.assertRaisesRegex(RuntimeError, "simulated Cloudflare outage"):
            ORIGIN_LOCK.prepare_cloudflare_cache(
                self.route_file,
                self.cache_file,
                fetcher=fail_fetch,
                now=self.now,
            )

        self.assertEqual(self.route_file.read_bytes(), original)
        self.assertFalse(self.cache_file.exists())

    def test_prepare_writes_a_valid_mode_0600_cache_without_touching_route(self) -> None:
        original = self.route_file.read_bytes()
        result = ORIGIN_LOCK.prepare_cloudflare_cache(
            self.route_file,
            self.cache_file,
            fetcher=lambda: (self.ipv4, self.ipv6),
            now=self.now,
        )

        self.assertTrue(result["origin_lock_prepared"])
        self.assertEqual(self.route_file.read_bytes(), original)
        self.assertEqual(stat.S_IMODE(self.cache_file.stat().st_mode), 0o600)
        self.assertEqual(
            ORIGIN_LOCK.load_cached_ranges(self.cache_file, now=self.now),
            (self.ipv4, self.ipv6),
        )

    def test_apply_uses_only_cache_and_atomically_updates_upstream_and_cidrs(self) -> None:
        self.prepare()
        replacement_ip = "192.0.2.201"

        with mock.patch.object(
            ORIGIN_LOCK.urllib.request,
            "urlopen",
            side_effect=AssertionError("post-deploy network access is forbidden"),
        ):
            result = ORIGIN_LOCK.apply_cached_origin_lock(
                self.route_file,
                self.cache_file,
                "app-uuid",
                "app-container",
                replacement_ip,
                alias_discoverer=lambda _container: ["generated.example.test"],
                now=self.now + timedelta(minutes=5),
            )

        config = yaml.safe_load(self.route_file.read_text(encoding="utf-8"))["http"]
        self.assertTrue(result["origin_lock_verified"])
        self.assertEqual(
            config["services"]["paradigmhp-svc"]["loadBalancer"]["servers"][0]["url"],
            f"http://{replacement_ip}:3000",
        )
        self.assertEqual(
            config["middlewares"][ORIGIN_LOCK.MIDDLEWARE_NAME]["ipAllowList"]["sourceRange"],
            [*self.ipv4, *self.ipv6],
        )
        self.assertEqual(
            config["routers"]["paradigmhp-origin-alias-https"]["middlewares"][0],
            ORIGIN_LOCK.MIDDLEWARE_NAME,
        )
        for router_name in ("paradigmhp-https", "keystatic-https"):
            self.assertEqual(config["routers"][router_name]["priority"], 1000)
        for router_name in ("paradigmhp-demo-http", "paradigmhp-demo-https"):
            router = config["routers"][router_name]
            self.assertEqual(router["rule"], "Host(`demo.paradigmjp.com`)")
            self.assertEqual(router["service"], "paradigmhp-svc")
            self.assertEqual(router["priority"], 1000)
            self.assertEqual(router["middlewares"][0], ORIGIN_LOCK.MIDDLEWARE_NAME)
        backups = list(self.root.glob("paradigmjp.yml.bak-release-*-origin-lock"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(stat.S_IMODE(backups[0].stat().st_mode), 0o600)

    def test_missing_route_and_stale_cache_are_fatal_without_mutation(self) -> None:
        original = self.route_file.read_bytes()
        missing_route = self.root / "missing.yml"
        with self.assertRaisesRegex(RuntimeError, "route file not found"):
            ORIGIN_LOCK.prepare_cloudflare_cache(
                missing_route,
                self.cache_file,
                fetcher=lambda: (_ for _ in ()).throw(AssertionError("fetch must not run")),
                now=self.now,
            )

        ORIGIN_LOCK.write_ranges_cache(
            self.cache_file,
            self.ipv4,
            self.ipv6,
            prepared_at=self.now - timedelta(seconds=ORIGIN_LOCK.CACHE_MAX_AGE_SECONDS + 1),
        )
        with self.assertRaisesRegex(RuntimeError, "cache is stale"):
            ORIGIN_LOCK.apply_cached_origin_lock(
                self.route_file,
                self.cache_file,
                "app-uuid",
                "app-container",
                "192.0.2.201",
                alias_discoverer=lambda _container: [],
                now=self.now,
            )
        self.assertEqual(self.route_file.read_bytes(), original)

    def test_apply_retires_the_legacy_astro_demo_route(self) -> None:
        config = yaml.safe_load(self.route_file.read_text(encoding="utf-8"))
        config["http"]["routers"]["astrodemo-http"] = {
            "entryPoints": ["http"],
            "rule": "Host(`demo.paradigmjp.com`)",
            "service": "astrodemo-svc",
        }
        config["http"]["routers"]["astrodemo-https"] = {
            "entryPoints": ["https"],
            "rule": "Host(`demo.paradigmjp.com`)",
            "service": "astrodemo-svc",
        }
        config["http"]["services"]["astrodemo-svc"] = {
            "loadBalancer": {"servers": [{"url": "http://astro-demo:4321"}]},
        }
        self.route_file.write_text(yaml.safe_dump(config, sort_keys=False), encoding="utf-8")
        self.prepare()

        ORIGIN_LOCK.apply_cached_origin_lock(
            self.route_file,
            self.cache_file,
            "app-uuid",
            "app-container",
            "192.0.2.201",
            alias_discoverer=lambda _container: [],
            now=self.now + timedelta(minutes=5),
        )

        updated = yaml.safe_load(self.route_file.read_text(encoding="utf-8"))["http"]
        self.assertNotIn("astrodemo-http", updated["routers"])
        self.assertNotIn("astrodemo-https", updated["routers"])
        self.assertNotIn("astrodemo-svc", updated["services"])


if __name__ == "__main__":
    unittest.main()
