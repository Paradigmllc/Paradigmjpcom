#!/usr/bin/env node

import assert from "node:assert/strict"

import {
  decodeCustomLabels,
  enforceRouterPriorities,
} from "./ensure-production-routing.mjs"

const source = [
  "traefik.enable=true",
  "traefik.http.routers.http-0-demo.entryPoints=http",
  "traefik.http.routers.http-0-demo.rule=Host(`example.com`) && PathPrefix(`/`)",
  "traefik.http.routers.http-0-demo.service=http-0-demo",
  "traefik.http.routers.https-0-demo.entryPoints=https",
  "traefik.http.routers.https-0-demo.rule=Host(`example.com`) && PathPrefix(`/`)",
  "traefik.http.routers.https-0-demo.service=https-0-demo",
  "traefik.http.routers.https-0-demo.tls=true",
  "traefik.http.routers.https-0-demo.priority=50",
  "traefik.http.services.https-0-demo.loadbalancer.server.port=3000",
  "caddy_ingress_network=coolify",
  "",
].join("\n")

assert.equal(decodeCustomLabels(source), source)
assert.equal(
  decodeCustomLabels(Buffer.from(source, "utf8").toString("base64")),
  source,
)

const first = enforceRouterPriorities(source, 100000)
assert.deepEqual(first.routers, ["http-0-demo", "https-0-demo"])
assert.match(first.labels, /traefik\.http\.routers\.http-0-demo\.priority=100000/)
assert.match(first.labels, /traefik\.http\.routers\.https-0-demo\.priority=100000/)
assert.doesNotMatch(first.labels, /priority=50/)
assert.match(first.labels, /caddy_ingress_network=coolify/)

const second = enforceRouterPriorities(first.labels, 100000)
assert.equal(second.labels, first.labels)
assert.deepEqual(second.routers, first.routers)

assert.throws(
  () => enforceRouterPriorities("traefik.enable=true\n", 100000),
  /No Traefik HTTP routers/,
)
assert.throws(() => enforceRouterPriorities(source, 0), /positive safe integer/)

console.log("ensure-production-routing tests passed")
