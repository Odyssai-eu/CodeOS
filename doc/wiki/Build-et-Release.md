# Build and release

For when you (or the agent) need to rebuild the app. Current release line:
**coeos-code 0.3.x** — the footer shows `coeos-code <version>`. English-only UI; coeos-code
replies in the user's language.

## Certified rebuild (signed + notarized)

From `packages/desktop`, with the Apple Developer account active:

```bash
cd ~/Claude/code/coeos-code/packages/desktop
export OPENCODE_CHANNEL=prod
export APPLE_API_KEY=~/.appstoreconnect/AuthKey_<KEY_ID>.p8
export APPLE_API_KEY_ID=<KEY_ID>
export APPLE_API_ISSUER=$(grep -oE "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" ~/.appstoreconnect/ids)
export CSC_NAME="Dupont Sophie (U2YXX868N2)"
bun run prebuild && bun run build && bun run package
```

`~/.appstoreconnect/ids` holds labeled text (`Issuer ID : <uuid>` / `key ID :
<id>`), not a bare UUID — the `grep -oE` above extracts just the issuer UUID
notarytool requires (a plain `cat` fails with "must be a valid UUID", hit
2026-07-16).

Output: `dist/mac-arm64/coeos-code.app` + `dist/codeos-desktop-mac-arm64.{dmg,zip}`.
Apple notarization takes 2-15 min (server-side wait). The `.p8` key stays in
`~/.appstoreconnect/`, **never in the repo**.

Since v0.2.0 the app is **Developer ID signed + Apple notarized**, so it installs
and launches with no `xattr` / Gatekeeper prompt.

## Verify the certification

```bash
spctl -a -t exec -vv dist/mac-arm64/coeos-code.app
# expected: accepted — source=Notarized Developer ID
xcrun stapler validate dist/mac-arm64/coeos-code.app
```

## Fast rebuild (dev, unsigned)

To iterate without notarizing, set `notarize: false` / `dmg.sign: false` in
`electron-builder.config.ts` and `CSC_IDENTITY_AUTO_DISCOVERY=false`. The app
will then need an `xattr -cr` to launch.

## Install locally

```bash
rm -rf /Applications/coeos-code.app
cp -R dist/mac-arm64/coeos-code.app /Applications/
```

Certified build = no `xattr` needed. **Quit coeos-code first** — otherwise you keep a
stale renderer (see [[Depannage|Troubleshooting]]).

## Safety net

- Tags/releases on the forge: `codeos-v0.1.0` (milestone 1), `codeos-v0.2.0`
  (signed + notarized), `codeos-v0.3.x` (current). **Always prefix `codeos-`** —
  the upstream OpenCode tag namespace is already taken (`v0.1.0` exists there).
- dmgs archived outside the repo: `~/coeos-code-releases/`.
- Rollback: `git checkout codeos-vX.Y.Z` then rebuild, or reinstall the matching
  archived dmg.

## What lives where

| Want to change | File |
|---|---|
| Add/change a command, an agent, a guardrail | `packages/desktop/src/main/coeos-config.ts` |
| Doc + memory plugin (session-doc) | `packages/desktop/src/main/assets/coeos-session-doc.js` |
| Theme | `packages/ui/src/theme/themes/codeos-forge.json` |
| Canvas | `packages/app/src/pages/session/session-canvas-panel.tsx` |
| Identity/signature | `packages/desktop/electron-builder.config.ts` |

`coeos-config.ts` is where the shipped surface is defined: the **10 commands**
(`/panel` `/gate` `/goal` `/grill-me` `/review` `/debug` `/verify` `/onboard`
`/session-doc` `/fable`), the visible **agents** (direct, alternative, sceptique,
explore, reviewer, debugger — plus the hidden grill-reviewer backed by MiniMax),
and the `permission.bash` guardrails (deny `rm -rf /` and `~`; ask on
`push --force`, `reset --hard`, `git clean`, `bootout`).

## No hardcoded engine

coeos-code ships with **no baked-in endpoint** and nothing extractable embedded. It
resolves its engine at startup, in order:

1. `CODEOS_ENGINE_URL` env var
2. `~/.codeos/pairing.json` — provisioned per-machine like an SSH key,
   `{enrollSecret, engines:[{baseUrl, apiKey}]}`
3. the persisted last-known-good engine
4. LAN discovery — `/.well-known` probe (`vendor=odyssai.eu`, ports `8000` and
   `4600`) then `POST /admin/pair` using the pre-shared enroll secret
5. graceful degrade if none resolves

In the model picker the provider shows as **OdyssAI**, exposing **CoeOS**
(OdyssAI-X, `<engine-host>:8000`, public `/v1`) and **CoeOS box** (docker container
`coeos-box` on `<box-host>:4600`, serves `/v1`, may be gated by a static `COEOS_API_KEY`).
None of this is compiled in — a fresh build carries no endpoint, so releasing does
not leak infra.

## Project memory

Each project gets `.codeos/MEMORY.md` plus auto-written `docs/sessions/` entries,
produced by the session-doc plugin (`coeos-session-doc.js`). These are per-project
artifacts, not part of the app bundle — no build step touches them.

## Multi-Mac (shared engine over LAN)

A `launchd` job `eu.odyssai.codeos.server` runs the shared server on the MBP,
reachable at the mDNS URL `mbp-m5-32.local:4096` (never a hardcoded IP). Other
Macs on the LAN point coeos-code at it through the same engine-resolution chain above.

See also: [[Installation]] · [[Depannage|Troubleshooting]]
