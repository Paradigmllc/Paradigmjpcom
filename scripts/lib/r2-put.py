#!/usr/bin/env python3
"""Minimal dependency-free S3 PUT client for Cloudflare R2.

The production backup host intentionally does not need the Node dependency tree
to deliver an encrypted archive. This helper implements the AWS Signature V4
request with Python's standard library only.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import hmac
import http.client
import sys
from pathlib import Path
from urllib.parse import quote, urlsplit


def hmac_bytes(key: bytes, value: str) -> bytes:
    return hmac.new(key, value.encode("utf-8"), hashlib.sha256).digest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def upload(endpoint: str, access_key: str, secret_key: str, bucket: str, key: str, path: Path, content_type: str) -> None:
    parsed = urlsplit(endpoint)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("R2 endpoint must be an https URL")

    encoded_path = "/".join(quote(part, safe="-_.~") for part in (parsed.path.strip("/") + "/" + bucket + "/" + key).split("/"))
    if not encoded_path.startswith("/"):
        encoded_path = "/" + encoded_path
    payload_hash = sha256_file(path)
    now = dt.datetime.now(dt.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    region = "auto"
    service = "s3"
    host = parsed.netloc

    canonical_headers = (
        f"content-type:{content_type}\n"
        f"host:{host}\n"
        f"x-amz-content-sha256:{payload_hash}\n"
        f"x-amz-date:{amz_date}\n"
    )
    signed_headers = "content-type;host;x-amz-content-sha256;x-amz-date"
    canonical_request = "\n".join(
        ["PUT", encoded_path, "", canonical_headers, signed_headers, payload_hash]
    )
    credential_scope = f"{date_stamp}/{region}/{service}/aws4_request"
    string_to_sign = "\n".join(
        [
            "AWS4-HMAC-SHA256",
            amz_date,
            credential_scope,
            hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
        ]
    )
    date_key = hmac_bytes(("AWS4" + secret_key).encode("utf-8"), date_stamp)
    region_key = hmac_bytes(date_key, region)
    service_key = hmac_bytes(region_key, service)
    signing_key = hmac_bytes(service_key, "aws4_request")
    signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    authorization = (
        f"AWS4-HMAC-SHA256 Credential={access_key}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )

    connection = http.client.HTTPSConnection(host, timeout=120)
    try:
        connection.putrequest("PUT", encoded_path)
        connection.putheader("Content-Type", content_type)
        connection.putheader("Content-Length", str(path.stat().st_size))
        connection.putheader("Host", host)
        connection.putheader("x-amz-content-sha256", payload_hash)
        connection.putheader("x-amz-date", amz_date)
        connection.putheader("Authorization", authorization)
        connection.endheaders()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                connection.send(chunk)
        response = connection.getresponse()
        response_body = response.read(2048).decode("utf-8", "replace")
        if response.status < 200 or response.status >= 300:
            raise RuntimeError(f"R2 PUT failed with HTTP {response.status}: {response_body[:500]}")
    finally:
        connection.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--endpoint", required=True)
    parser.add_argument("--access-key", required=True)
    parser.add_argument("--secret-key", required=True)
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--key", required=True)
    parser.add_argument("--file", required=True, type=Path)
    parser.add_argument("--content-type", default="application/octet-stream")
    args = parser.parse_args()
    if not args.file.is_file():
        raise FileNotFoundError(args.file)
    upload(args.endpoint, args.access_key, args.secret_key, args.bucket, args.key, args.file, args.content_type)
    print(f"R2 upload completed: {args.bucket}/{args.key}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"R2 upload failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
