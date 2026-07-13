#!/usr/bin/env python3
"""Prepare and atomically apply the production Cloudflare origin lock.

The release flow invokes ``--prepare`` before deployment, while the old app
container is still serving traffic. This validates the route file and fetches
Cloudflare's official CIDRs into a short-lived, mode-0600 cache. After the new
container is healthy, ``--apply`` uses only that cache and atomically writes the
new upstream together with the validated CIDRs. No post-deploy network lookup
can therefore leave Traefik pointing at the retired container.

Only counts and state are emitted. Origin addresses, CIDRs, and aliases are
never written to release logs.
"""

from __future__ import annotations

import copy
import hashlib
import hmac
import ipaddress
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Optional

import yaml


CF_IPS_URL = "https://api.cloudflare.com/client/v4/ips"
CACHE_SCHEMA_VERSION = 1
CACHE_MAX_AGE_SECONDS = 6 * 60 * 60
MIDDLEWARE_NAME = "paradigm-cloudflare-only"
MAIN_HOSTS = {"paradigmjp.com", "www.paradigmjp.com"}
KEYSTATIC_HOST = "keystatic.paradigmjp.com"
DEMO_HOST = "demo.paradigmjp.com"


def validate_cloudflare_ranges(ipv4: object, ipv6: object) -> tuple[list[str], list[str]]:
    if not isinstance(ipv4, list) or not isinstance(ipv6, list):
        raise RuntimeError("Cloudflare IP range cache has an invalid shape")
    if len(ipv4) < 10 or len(ipv6) < 5:
        raise RuntimeError("Cloudflare IP range set is unexpectedly incomplete")
    if any(not isinstance(value, str) for value in [*ipv4, *ipv6]):
        raise RuntimeError("Cloudflare IP range set contains a non-string value")
    normalized_ipv4 = [value.strip() for value in ipv4]
    normalized_ipv6 = [value.strip() for value in ipv6]
    combined = [*normalized_ipv4, *normalized_ipv6]
    if any(not value for value in combined) or len(combined) != len(set(combined)):
        raise RuntimeError("Cloudflare IP range set is empty or contains duplicates")
    try:
        networks_v4 = [ipaddress.ip_network(value, strict=True) for value in normalized_ipv4]
        networks_v6 = [ipaddress.ip_network(value, strict=True) for value in normalized_ipv6]
    except ValueError as error:
        raise RuntimeError("Cloudflare IP range set contains an invalid network") from error
    if any(network.version != 4 for network in networks_v4):
        raise RuntimeError("Cloudflare IPv4 range set contains a non-IPv4 network")
    if any(network.version != 6 for network in networks_v6):
        raise RuntimeError("Cloudflare IPv6 range set contains a non-IPv6 network")
    return normalized_ipv4, normalized_ipv6


def fetch_cloudflare_ranges() -> tuple[list[str], list[str]]:
    request = urllib.request.Request(CF_IPS_URL, headers={"User-Agent": "Paradigm-origin-lock/2.0"})
    with urllib.request.urlopen(request, timeout=15) as response:
        payload = json.load(response)
    if payload.get("success") is not True:
        raise RuntimeError("Cloudflare IP API returned unsuccessful status")
    result = payload.get("result") or {}
    return validate_cloudflare_ranges(result.get("ipv4_cidrs"), result.get("ipv6_cidrs"))


def ranges_digest(ipv4: list[str], ipv6: list[str]) -> str:
    canonical = json.dumps(
        {"ipv4_cidrs": ipv4, "ipv6_cidrs": ipv6},
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def parse_utc_timestamp(value: object) -> datetime:
    if not isinstance(value, str) or not value:
        raise RuntimeError("Cloudflare IP range cache has no preparation timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise RuntimeError("Cloudflare IP range cache timestamp is invalid") from error
    if parsed.tzinfo is None:
        raise RuntimeError("Cloudflare IP range cache timestamp has no timezone")
    return parsed.astimezone(timezone.utc)


def load_route_document(route_file: Path) -> tuple[str, dict]:
    if not route_file.is_file():
        raise RuntimeError("Traefik route file not found")
    original_text = route_file.read_text(encoding="utf-8")
    config = yaml.safe_load(original_text)
    http = config.get("http") if isinstance(config, dict) else None
    if not isinstance(http, dict):
        raise RuntimeError("Traefik HTTP configuration is missing")
    if not isinstance(http.get("middlewares"), dict):
        raise RuntimeError("Traefik middleware configuration is malformed")
    if not isinstance(http.get("routers"), dict) or not isinstance(http.get("services"), dict):
        raise RuntimeError("Traefik router/service configuration is malformed")
    service = http["services"].get("paradigmhp-svc")
    servers = service.get("loadBalancer", {}).get("servers") if isinstance(service, dict) else None
    if not isinstance(servers, list) or len(servers) != 1 or not isinstance(servers[0], dict):
        raise RuntimeError("Paradigm upstream has an unexpected shape")
    upstream = servers[0].get("url")
    if not isinstance(upstream, str) or not re.fullmatch(r"https?://[^/:]+:3000", upstream):
        raise RuntimeError("Paradigm upstream URL has an unexpected shape")
    return original_text, config


def atomic_write(
    path: Path,
    text: str,
    *,
    mode: int,
    owner: Optional[tuple[int, int]] = None,
) -> None:
    if not path.parent.is_dir():
        raise RuntimeError("Atomic write parent directory does not exist")
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary_name, mode)
        if owner is not None:
            try:
                os.chown(temporary_name, owner[0], owner[1])
            except PermissionError:
                pass
        os.replace(temporary_name, path)
        directory_fd = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def write_ranges_cache(
    cache_file: Path,
    ipv4: list[str],
    ipv6: list[str],
    *,
    prepared_at: Optional[datetime] = None,
) -> None:
    normalized_ipv4, normalized_ipv6 = validate_cloudflare_ranges(ipv4, ipv6)
    timestamp = (prepared_at or datetime.now(timezone.utc)).astimezone(timezone.utc)
    payload = {
        "schema_version": CACHE_SCHEMA_VERSION,
        "source": CF_IPS_URL,
        "prepared_at": timestamp.isoformat().replace("+00:00", "Z"),
        "ipv4_cidrs": normalized_ipv4,
        "ipv6_cidrs": normalized_ipv6,
        "sha256": ranges_digest(normalized_ipv4, normalized_ipv6),
    }
    atomic_write(
        cache_file,
        json.dumps(payload, ensure_ascii=True, indent=2, sort_keys=True) + "\n",
        mode=0o600,
    )


def load_cached_ranges(
    cache_file: Path,
    *,
    now: Optional[datetime] = None,
) -> tuple[list[str], list[str]]:
    if not cache_file.is_file():
        raise RuntimeError("Prepared Cloudflare IP range cache not found")
    cache_mode = stat.S_IMODE(cache_file.stat().st_mode)
    if cache_mode & 0o077:
        raise RuntimeError("Prepared Cloudflare IP range cache permissions are too broad")
    try:
        payload = json.loads(cache_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("Prepared Cloudflare IP range cache is unreadable") from error
    if not isinstance(payload, dict) or payload.get("schema_version") != CACHE_SCHEMA_VERSION:
        raise RuntimeError("Prepared Cloudflare IP range cache schema is unsupported")
    if payload.get("source") != CF_IPS_URL:
        raise RuntimeError("Prepared Cloudflare IP range cache source is invalid")
    prepared_at = parse_utc_timestamp(payload.get("prepared_at"))
    current_time = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    age = current_time - prepared_at
    if age < timedelta(minutes=-5) or age > timedelta(seconds=CACHE_MAX_AGE_SECONDS):
        raise RuntimeError("Prepared Cloudflare IP range cache is stale")
    ipv4, ipv6 = validate_cloudflare_ranges(payload.get("ipv4_cidrs"), payload.get("ipv6_cidrs"))
    expected_digest = ranges_digest(ipv4, ipv6)
    actual_digest = payload.get("sha256")
    if not isinstance(actual_digest, str) or not hmac.compare_digest(actual_digest, expected_digest):
        raise RuntimeError("Prepared Cloudflare IP range cache checksum is invalid")
    return ipv4, ipv6


def prepare_cloudflare_cache(
    route_file: Path,
    cache_file: Path,
    *,
    fetcher: Callable[[], tuple[list[str], list[str]]] = fetch_cloudflare_ranges,
    now: Optional[datetime] = None,
) -> dict:
    # The route must exist and parse before any release can be queued.
    load_route_document(route_file)
    ipv4, ipv6 = fetcher()
    normalized_ipv4, normalized_ipv6 = validate_cloudflare_ranges(ipv4, ipv6)
    write_ranges_cache(cache_file, normalized_ipv4, normalized_ipv6, prepared_at=now)
    # Re-read the on-disk cache so prepare cannot succeed after a partial/corrupt write.
    load_cached_ranges(cache_file, now=now)
    return {
        "origin_lock_prepared": True,
        "cloudflare_range_count": len(normalized_ipv4) + len(normalized_ipv6),
    }


def discover_app_aliases(container_name: str) -> list[str]:
    labels = json.loads(
        subprocess.check_output(
            ["docker", "inspect", container_name, "--format", "{{json .Config.Labels}}"],
            text=True,
        )
    ) or {}
    hosts = set()
    for key, value in labels.items():
        if not re.fullmatch(r"traefik\.http\.routers\.[^.]+\.rule", str(key)):
            continue
        for call in re.findall(r"Host\(([^)]*)\)", str(value)):
            for host in re.findall(r"[`\"']([A-Za-z0-9._-]+)[`\"']", call):
                hosts.add(host.lower())
    return sorted(hosts - MAIN_HOSTS - {KEYSTATIC_HOST})


def middleware_list(router: dict) -> list[str]:
    value = router.get("middlewares") or []
    if not isinstance(value, list):
        raise RuntimeError("Router middleware list has an unexpected shape")
    return [str(item) for item in value]


def prepend_once(values: list[str], name: str) -> list[str]:
    return [name, *[item for item in values if item != name]]


def apply_cached_origin_lock(
    route_file: Path,
    cache_file: Path,
    app_uuid: str,
    new_container: str,
    new_ip: str,
    *,
    alias_discoverer: Callable[[str], list[str]] = discover_app_aliases,
    now: Optional[datetime] = None,
) -> dict:
    original_text, config = load_route_document(route_file)
    ipv4, ipv6 = load_cached_ranges(cache_file, now=now)
    if not app_uuid or not new_container:
        raise RuntimeError("Required Traefik apply inputs are missing")
    try:
        ipaddress.ip_address(new_ip)
    except ValueError as error:
        raise RuntimeError("New upstream address is invalid") from error

    http = config["http"]
    middlewares = http["middlewares"]
    routers = http["routers"]
    services = http["services"]
    service = services["paradigmhp-svc"]
    servers = service["loadBalancer"]["servers"]
    servers[0]["url"] = f"http://{new_ip}:3000"

    http_router = routers.get("paradigmhp-http")
    https_router = routers.get("paradigmhp-https")
    if not isinstance(http_router, dict) or not isinstance(https_router, dict):
        raise RuntimeError("Paradigm routers are missing")
    if http_router.get("service") != "paradigmhp-svc" or https_router.get("service") != "paradigmhp-svc":
        raise RuntimeError("Paradigm router service target is unexpected")

    cloudflare_ranges = [*ipv4, *ipv6]
    middlewares[MIDDLEWARE_NAME] = {"ipAllowList": {"sourceRange": cloudflare_ranges}}
    tick = chr(96)
    main_rule = f"Host({tick}paradigmjp.com{tick}) || Host({tick}www.paradigmjp.com{tick})"
    keystatic_rule = f"Host({tick}{KEYSTATIC_HOST}{tick})"
    demo_rule = f"Host({tick}{DEMO_HOST}{tick})"

    http_router["rule"] = main_rule
    http_router["priority"] = 1000
    http_router["middlewares"] = prepend_once(middleware_list(http_router), MIDDLEWARE_NAME)
    https_router["rule"] = main_rule
    https_router["priority"] = 1000
    https_router["middlewares"] = prepend_once(middleware_list(https_router), MIDDLEWARE_NAME)

    keystatic_http = copy.deepcopy(routers.get("keystatic-http") or http_router)
    keystatic_http.update({
        "rule": keystatic_rule,
        "priority": 1000,
        "middlewares": prepend_once(middleware_list(keystatic_http), MIDDLEWARE_NAME),
        "service": "paradigmhp-svc",
    })
    routers["keystatic-http"] = keystatic_http

    keystatic_https = copy.deepcopy(routers.get("keystatic-https") or https_router)
    keystatic_https.update({
        "rule": keystatic_rule,
        "priority": 1000,
        "middlewares": prepend_once(middleware_list(keystatic_https), MIDDLEWARE_NAME),
        "service": "paradigmhp-svc",
    })
    routers["keystatic-https"] = keystatic_https

    demo_http = copy.deepcopy(http_router)
    demo_http.update({
        "rule": demo_rule,
        "priority": 1000,
        "middlewares": prepend_once(middleware_list(demo_http), MIDDLEWARE_NAME),
        "service": "paradigmhp-svc",
    })
    routers["paradigmhp-demo-http"] = demo_http

    demo_https = copy.deepcopy(https_router)
    demo_https.update({
        "rule": demo_rule,
        "priority": 1000,
        "middlewares": prepend_once(middleware_list(demo_https), MIDDLEWARE_NAME),
        "service": "paradigmhp-svc",
    })
    routers["paradigmhp-demo-https"] = demo_https

    # Retire the former static Astro route. Keeping a second router for the
    # same host makes Traefik selection ambiguous after each release.
    routers.pop("astrodemo-http", None)
    routers.pop("astrodemo-https", None)
    services.pop("astrodemo-svc", None)

    aliases = alias_discoverer(new_container)
    if aliases:
        alias_rule = " || ".join(f"Host({tick}{host}{tick})" for host in aliases)
        routers["paradigmhp-origin-alias-http"] = {
            "entryPoints": ["http"],
            "middlewares": [MIDDLEWARE_NAME, "redirect-to-https"],
            "priority": 1000,
            "rule": alias_rule,
            "service": "paradigmhp-svc",
        }
        routers["paradigmhp-origin-alias-https"] = {
            "entryPoints": ["https"],
            "middlewares": [MIDDLEWARE_NAME, "gzip"],
            "priority": 1000,
            "rule": alias_rule,
            "service": "paradigmhp-svc",
            "tls": {"certResolver": "letsencrypt"},
        }
    else:
        routers.pop("paradigmhp-origin-alias-http", None)
        routers.pop("paradigmhp-origin-alias-https", None)

    rendered = yaml.safe_dump(config, sort_keys=False, allow_unicode=True)
    reparsed = yaml.safe_load(rendered)["http"]
    if reparsed["services"]["paradigmhp-svc"]["loadBalancer"]["servers"][0]["url"] != f"http://{new_ip}:3000":
        raise RuntimeError("Rendered upstream failed validation")
    if reparsed["middlewares"][MIDDLEWARE_NAME]["ipAllowList"]["sourceRange"] != cloudflare_ranges:
        raise RuntimeError("Rendered cached Cloudflare range set failed validation")
    for name in ("paradigmhp-demo-http", "paradigmhp-demo-https"):
        demo_router = reparsed["routers"].get(name, {})
        if demo_router.get("rule") != demo_rule or demo_router.get("service") != "paradigmhp-svc":
            raise RuntimeError("Rendered demo host route failed validation")
    if any(router.get("service") == "astrodemo-svc" for router in reparsed["routers"].values()):
        raise RuntimeError("Rendered route still contains the legacy Astro demo service")
    protected = [
        "paradigmhp-http",
        "paradigmhp-https",
        "keystatic-http",
        "keystatic-https",
        "paradigmhp-demo-http",
        "paradigmhp-demo-https",
    ]
    if aliases:
        protected.extend(["paradigmhp-origin-alias-http", "paradigmhp-origin-alias-https"])
    for name in protected:
        if reparsed["routers"][name].get("middlewares", [None])[0] != MIDDLEWARE_NAME:
            raise RuntimeError("Rendered protected router failed validation")

    changed = rendered != original_text
    if changed:
        route_stat = route_file.stat()
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup = route_file.with_name(f"{route_file.name}.bak-release-{timestamp}-origin-lock")
        shutil.copy2(route_file, backup)
        os.chmod(backup, 0o600)
        atomic_write(
            route_file,
            rendered,
            mode=stat.S_IMODE(route_stat.st_mode),
            owner=(route_stat.st_uid, route_stat.st_gid),
        )

    return {
        "origin_lock_verified": True,
        "changed": changed,
        "cloudflare_range_count": len(cloudflare_ranges),
        "protected_alias_count": len(aliases) + 4,
    }


def main() -> None:
    if len(sys.argv) < 2:
        raise RuntimeError("Origin lock mode is required")
    mode = sys.argv[1]
    if mode == "--prepare":
        if len(sys.argv) != 4:
            raise RuntimeError("Prepare requires route and cache files")
        result = prepare_cloudflare_cache(Path(sys.argv[2]), Path(sys.argv[3]))
    elif mode == "--apply":
        if len(sys.argv) != 7:
            raise RuntimeError("Apply requires route, cache, app, container, and upstream inputs")
        result = apply_cached_origin_lock(
            Path(sys.argv[2]),
            Path(sys.argv[3]),
            sys.argv[4],
            sys.argv[5],
            sys.argv[6],
        )
    else:
        raise RuntimeError("Unknown origin lock mode")
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"origin_lock_ok": False, "error": str(error)}), file=sys.stderr)
        raise SystemExit(1) from error
