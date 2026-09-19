# Installation

coeos-code is a native macOS app (Apple Silicon). English-only interface — coeos-code
itself replies in whatever language you write to it. Current line: **coeos-code
0.3.x**; the footer shows `coeos-code <version>`.

## On any Mac (recommended)

The app is **Developer ID signed and Apple-notarized** since v0.2.0: no Gatekeeper
workaround, no `xattr` dance — standard install.

1. Grab the certified dmg: `~/coeos-code-releases/codeos-v0.3.x-notarized-mac-arm64.dmg`
   (or the latest build in the repo's `packages/desktop/dist/`).
2. Double-click → drag **coeos-code** into Applications.
3. Launch. On first network access, macOS prompts "coeos-code wants to access the
   local network" → **Allow**. This is mandatory: the engine, RAG and docling
   live on the LAN.

No account, no manual API key to paste. The model provider shows up as **OdyssAI**
in the picker, exposing two models: **CoeOS** and **CoeOS box**.

## How coeos-code finds its engine (no hardcoded endpoint)

There is no baked-in URL anymore. On startup coeos-code resolves the engine through a
fixed chain, first hit wins:

1. **`CODEOS_ENGINE_URL`** environment variable — explicit override.
2. **`~/.codeos/pairing.json`** — provisioned credentials (see below).
3. **Persisted value** — whatever was resolved and saved on a previous run.
4. **LAN discovery** — probes `/.well-known` for `vendor=odyssai.eu` on ports
   `8000` and `4600`, then enrolls via `POST /admin/pair` using the pre-shared
   enrollment secret.
5. **Degraded** — no engine reachable; the app runs but can't talk to a model.

### `~/.codeos/pairing.json` — provisioned per machine

Treat it like an SSH key: it is provisioned **per machine**, never bundled with the
app, and nothing extractable ships inside the binary. Shape:

```json
{
  "enrollSecret": "…",
  "engines": [
    { "baseUrl": "http://<engine-host>:8000", "apiKey": "…" }
  ]
}
```

The engines behind the two models:

- **OdyssAI-X** — `<engine-host>:8000`, serves a public `/v1`. Backs **CoeOS**.
- **CoeOS box** — `<box-host>:4600` (docker container `coeos-box`), serves `/v1`, may be
  gated by a static `COEOS_API_KEY`. Backs **CoeOS box**.

## On MacBook Neo

Same dmg, same procedure, plus its own `~/.codeos/pairing.json`. To share sessions
with the MacBook Pro, see [[Multi-Mac]].

## Update

No auto-update (deliberately off — no third-party channel). A new version is a new
dmg, or a rebuild from the repo: see [[Build-et-Release]].

## Uninstall

Remove `/Applications/coeos-code.app`. Data lives in:

- `~/.local/share/opencode/` — sessions and local database (shared with the server)
- `~/Library/Application Support/eu.odyssai.codeos/` — app preferences
- `~/.codeos/` — app-managed assets (rules, plugin, MCP wrapper) regenerated on each
  launch, **plus `pairing.json`** — delete it too if you're deprovisioning the machine
- `.codeos/MEMORY.md` and `docs/sessions/` inside each project — project memory and
  auto session docs (session-doc plugin); leave them if you keep the project

See also: [[Premiers-pas|Getting started]] · [[Depannage|Troubleshooting]]
