# Troubleshooting

## "The picker only shows one model / 404 model_not_loaded"

In the model picker the provider is **OdyssAI**, exposing **CoeOS** and **CoeOS
SE**. These are served by two separate engines:

- **OdyssAI-X** — `<engine-host>:8000`, public `/v1`.
- **CoeOS box** (`coeos-box`) — `<box-host>:4600`, docker container `coeos-box`, serves
  `/v1` (may be gated by a static `COEOS_API_KEY`).

Auto-swap is off, so an engine serves one model at a time. If a model is
missing, list what is actually loaded and load or select accordingly:

```bash
curl http://<engine-host>:8000/v1/models   # OdyssAI-X → CoeOS
curl http://<box-host>:4600/v1/models   # the CoeOS box
```

If a request 404s with `model_not_loaded`, load the missing model on its engine
or switch to the one that is ready.

## "coeos-code can't reach any engine"

coeos-code no longer hardcodes an endpoint. It **resolves the engine at startup**,
in this order — the first that answers wins:

1. `CODEOS_ENGINE_URL` environment variable.
2. `~/.codeos/pairing.json` — provisioned per machine (like an SSH key):
   `{ "enrollSecret": "...", "engines": [{ "baseUrl": "...", "apiKey": "..." }] }`.
   Nothing extractable is embedded in the app itself.
3. The last resolved URL, persisted from a previous run.
4. **LAN discovery** — probes `/.well-known` for `vendor=odyssai.eu` on ports
   `8000` and `4600`, then `POST /admin/pair` using the pre-shared enrollment
   secret to obtain an API key.
5. Degraded mode (no engine) if all of the above fail.

If nothing resolves:

- Check `~/.codeos/pairing.json` exists and is valid JSON with a reachable
  `baseUrl`. If the machine was never provisioned, that file is missing — drop
  a valid one in place.
- Confirm the engine is up (`curl` the `/v1/models` endpoints above).
- To force a specific engine, export `CODEOS_ENGINE_URL` before launch and
  restart coeos-code.

## "An MCP doesn't respond" (rag / graphify / docling)

Almost always coeos-code's **Local Network permission**. macOS asks on the first
LAN access — if you declined it: System Settings → Privacy & Security → Local
Network → enable coeos-code, then relaunch the app.

## "A bash command was blocked or asked for confirmation"

Expected — coeos-code ships `permission.bash` guardrails:

- **Denied outright:** `rm -rf /` and `rm -rf ~` (and equivalents).
- **Ask first:** force-push, `git reset --hard`, `git clean`, and `bootout`.

If you genuinely need one of the "ask" commands, confirm the prompt. The hard
denials are non-negotiable and won't run.

## "I reinstalled and something breaks (settings, etc.)"

**Stale renderer.** If you swap the app while it's running, the open instance
points at files that no longer exist → errors. **Full ⌘Q, then relaunch.**
General rule: always quit coeos-code before reinstalling.

## "The theme / UI didn't change after an update"

Your stored theme choice wins over the default. Go to Settings → theme and pick
**coeos-code Forge** explicitly. (Forge's light mode is deliberately restrained —
dark mode is the signature.)

The app is **English-only** now — there is no language selector to hunt for.
coeos-code still replies in the language you write in; only the UI chrome is
English. The footer reads `coeos-code <version>` (currently 0.3.x).

## "No session doc / no MEMORY.md"

Project memory lives in `.codeos/MEMORY.md` and session docs are written to
`docs/sessions/` by the session-doc plugin. If nothing gets written:

- The session must be **meaningful** (~6 messages minimum).
- The engine must be reachable — the doc is produced by a direct model call.
- Subagent sub-sessions produce no doc; only the root session does.
- It's **best-effort**: if the model answers poorly that turn, it's skipped and
  retried on the next.

## "Gatekeeper blocks the app"

Shouldn't happen since **v0.2.0** — the app is signed with a Developer ID and
notarised by Apple, so it installs without any `xattr` / Gatekeeper dance. If
you're on an **older, un-notarised** dmg: `xattr -cr /Applications/coeos-code.app`,
or better, grab a current notarised build.

## "Multi-Mac: another Mac can't reach the coeos-code server"

The shared server runs under launchd as `eu.odyssai.codeos.server` on the MBP
and is reachable over mDNS at `mbp-m5-32.local:4096` (never a hardcoded IP).

- Confirm the agent is loaded: `launchctl list | grep eu.odyssai.codeos`.
- Reach it by hostname, not IP: `curl http://mbp-m5-32.local:4096/`.
- If mDNS doesn't resolve, both Macs must be on the same LAN with Bonjour
  reachable.

## Everything's broken — full rollback

Roll back to the last known-good tag, then reinstall the archived notarised
dmg:

```bash
cd ~/Claude/code/coeos-code && git tag --list 'codeos-v*' | sort -V | tail -5
git checkout <last-good-tag>
```

Then reinstall the matching notarised dmg from `~/coeos-code-releases/`.

See also: [[Build-et-Release|Build and Release]] · [[Contexte-MCP|MCP context]]
