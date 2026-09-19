# coeos-code — User Guide

coeos-code is your coding harness: a fork of OpenCode, packaged as a signed and
notarized macOS app, wired **exclusively** to the OdyssAI engine, with your
methodology baked into the binary. It codes, reviews itself, debugs, documents,
and **remembers every project**. The app is English-only — coeos-code answers in
whatever language you write to it.

## Where to start

1. [[Installation]] — install the app (main Mac and Neo)
2. [[Premiers-pas|Getting started]] — the interface, the models, your first session
3. [[Commandes|Commands]] — the 10 slash commands, the core of the method

## Day to day

- [[Agents]] — who does what (panel, reviewer, debugger, explore…)
- [[Memoire-et-Docs|Memory & Docs]] — what coeos-code writes and remembers on its own
- [[Canvas]] — the side panel: agents / plan / changes
- [[Contexte-MCP|MCP Context]] — RAG, graphify, docling: the knowledge plugged in
- [[Multi-Mac]] — resume a MacBook Pro session on Neo

## Reference

- [[Garde-fous|Guardrails]] — what coeos-code refuses or asks you to confirm
- [[Depannage|Troubleshooting]] — the known failures and their real fixes
- [[Build-et-Release|Build & Release]] — rebuild, sign, notarize, roll back

## Engine and models

coeos-code runs only on the OdyssAI engine — no cloud provider, no API key to paste.
In the model picker the provider is **OdyssAI**; the two models are **CoeOS**
and **CoeOS box**.

There is **no hardcoded endpoint**. coeos-code resolves the engine at startup, in
order:

1. `CODEOS_ENGINE_URL` env var, if set
2. `~/.codeos/pairing.json` — provisioned per machine (like an SSH key),
   `{ enrollSecret, engines: [{ baseUrl, apiKey }] }`; nothing extractable is
   shipped inside the app
3. the last persisted engine
4. LAN discovery — `/.well-known` with `vendor=odyssai.eu` on ports `8000` and
   `4600`, then `POST /admin/pair` using the pre-shared enroll secret
5. graceful degradation if none resolve

Backends: **OdyssAI-X** on `<engine-host>:8000` (public `/v1`); **CoeOS box** on
`<box-host>:4600` (docker container `coeos-box`, serving `/v1`, optionally gated by a
static `COEOS_API_KEY`).

---
*coeos-code 0.3.x — Developer ID signed, Apple notarized (v0.2.0+): installs with no
xattr / Gatekeeper dance. The footer shows "coeos-code <version>". Repo:
`Odyssai-eu/coeos-code` on the odyssai.eu forge.*
