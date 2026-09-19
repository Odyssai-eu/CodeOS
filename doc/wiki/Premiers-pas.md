# Getting started

## Install and first launch

coeos-code ships as a signed (Developer ID) and Apple-notarised app since v0.2.0.
No `xattr` dance, no Gatekeeper override — open it like any normal Mac app.

The app is **English-only** (no language selector). coeos-code still answers in
whatever language you write to it in.

## The interface

Default theme is **coeos-code Forge** (navy/cyan/orange — the signature is dark
mode; light mode is deliberately restrained). Left sidebar = projects and
sessions. Center = the conversation. Right, optional: the [[Canvas]].

The footer shows the running version, e.g. `coeos-code 0.3.x`.

## The models

The picker at the bottom of the input area lists provider **OdyssAI** with
exactly **two models** — by design, coeos-code is locked CoeOS-only:

| Model | Use |
|---|---|
| **CoeOS** | The main one — reasoning, code, debugging |
| **CoeOS box** | The light one — exploration, quick tasks |

Under the hood these are served over an OpenAI-compatible `/v1`:

- **CoeOS** → OdyssAI-X, `<engine-host>:8000` (public `/v1`).
- **CoeOS box** → `coeos-box` docker container, `<box-host>:4600` (may be gated by a
  static `COEOS_API_KEY`).

**No hardcoded endpoint.** coeos-code resolves its engine at startup through a
fallback chain: `CODEOS_ENGINE_URL` env → `~/.codeos/pairing.json`
(provisioned keys) → last persisted value → LAN discovery
(`/.well-known`, vendor `odyssai.eu`, ports 8000/4600) + `POST /admin/pair`
using the pre-shared enrollment secret → degraded mode. The
`~/.codeos/pairing.json` file (`{enrollSecret, engines:[{baseUrl,apiKey}]}`)
is provisioned per machine, like an SSH key — nothing extractable is baked
into the binary.

If a model answers `404 model_not_loaded`, it just isn't loaded engine-side
(no auto-swap). See [[Depannage|Troubleshooting]].

## First session

1. Open a project (folder) from the sidebar.
2. New session — ask your question, or lead with a command:
   - **New repo?** → `/onboard` generates the project's AGENTS.md.
   - **Architecture decision?** → `/panel <the question>`.
   - **Plan to harden?** → `/grill-me <the topic>`.
   - **Goal to reach no matter what?** → `/goal <the goal>`.
3. At the end of a meaningful session, coeos-code writes the session doc and
   updates the project memory on its own — see [[Memoire-et-Docs|Memory & Docs]].

Ten commands are available: `/panel` `/gate` `/goal` `/grill-me` `/review`
`/debug` `/verify` `/onboard` `/session-doc` `/fable`. Full reference in
[[Commandes|Commands]].

## Always-on rules

Every session starts with the coeos-code rules injected (evidence first, real
root-cause fix, dead-horse rule, Fibonacci points, no emojis, answer in the
user's language) plus the project memory if one exists. You never have to
restate them.

The engine can also spin up specialised agents behind the scenes — direct,
alternative, sceptique, explore, reviewer, debugger — with a hidden
grill-reviewer (MiniMax) for adversarial passes. See [[Agents]].

**Guardrails.** Shell actions run through a permission layer: `rm -rf /` and
`rm -rf ~` are denied outright; force-push, `reset --hard`, `clean`, and
`bootout` prompt for confirmation before running.

**Project memory.** Each project keeps a `.codeos/MEMORY.md` and auto-written
`docs/sessions` (via the session-doc plugin), so context survives across
sessions.

## Multi-Mac

coeos-code can run its engine as a launchd service (`eu.odyssai.codeos.server`) on
the MBP, reachable over mDNS at `mbp-m5-32.local:4096` — never a hardcoded IP.

Next: [[Commandes|Commands]] · [[Agents]]
