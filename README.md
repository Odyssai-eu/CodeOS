# CodeOS

> **My dream coding machine.** Agentic coding that *decides with a panel, hardens plans with an adversarial grill, and acts on verified evidence — never on a guess.*

`macOS · Apple Silicon only` · `Fork of opencode` · `Talks only to CoeOS` · `MIT`

CodeOS is an opinionated desktop coding app built on [opencode](https://github.com/sst/opencode). It keeps opencode's engine and wraps it in a multi-agent working discipline — the **TMB methodology** — where hard decisions go through a three-mandate panel, plans get grilled by a *different* model before a line of code is written, and every claim is grounded in the actual repository.

It connects to exactly one kind of backend: a **CoeOS** inference engine. No other provider.

---

## Requirements

- **macOS on Apple Silicon (arm64) only.** No Intel, Windows or Linux builds are shipped.
- **A CoeOS engine.** CodeOS lists whatever models your engine publishes — pick the ones for Plan and Build in **Settings → Models**. Two ways to get one:
  - **CoeOS** — the hosted OdyssAI-x engine → **[odyssai.eu](https://odyssai.eu)**
  - **CoeOS SE** — the self-hosted edition, one command: `uvx coeos-se` → **[pypi.org/project/coeos-se](https://pypi.org/project/coeos-se/)**

  No endpoint is baked into the binary — the app resolves its engine at startup (environment variable, a per-machine pairing file, or local-network discovery). Nothing to hardcode, nothing that leaks when you ship a build.

## Install

Download the latest signed + notarized `.dmg` from **[Releases](../../releases)**, open it, and drag **CodeOS** to Applications. On first launch macOS asks for **Local Network** access — CodeOS needs it to reach your engine, so allow it.

---

## The TMB methodology

Most coding tools autocomplete. CodeOS runs a *method*: **decide with a panel, harden with a grill, act on evidence, never patch a dead horse.** It is encoded in the agents and commands below, not left to a prompt.

### Mode CoeOS — the orchestrator

A third primary mode alongside Build and Plan. The **Orchestrator** never writes code itself. It:

1. **Understands** the repo (through a read-only explore agent, or the panel for a real architecture call).
2. **Plans** the work into a Task File (`task.md`) — one task = one verifiable deliverable, sized in Fibonacci points.
3. Waits for your **GO** — no work is dispatched before you approve the plan.
4. **Dispatches** each task to the right specialist, **reviews the diff after every task that touched files**, and only then marks it done. A half-result declared "done" is a failure.

The Task File is the source of truth — you can edit it by hand mid-run, and what's written there wins.

### The decision panel — `/panel`

For any consequential decision, three agents run in parallel with **opposed mandates**:

- **Direct** — defends the *simplest* option that reaches the goal.
- **Alternative** — builds the best option *different* from the obvious one; forbidden to agree out of comfort.
- **Sceptique (red-team)** — tries to *break* both: unverified assumptions, side effects, hidden costs, irreversibilities. "Soft consensus is a failure of your mission."

Each answer is anchored in cited `file:line` facts. You **act only on convergence**. No consensus → the orchestrator does *not* decide alone; it hands you the positions and the stakes.

### The grill — `/grill-me`

Two-act plan hardening, before any code:

1. **Interview** — CodeOS interrogates your plan without mercy, one question at a time, reading the code to answer for itself whenever it can, until every branch (scope, edge cases, data, errors, migrations, security, done-criteria) is resolved. It writes the locked plan.
2. **Cross-model review** — the plan goes to a reviewer running a **different model family** (its whole point), whose mandate is to destroy it against the real repo. It returns `VERDICT: APPROVED` or `VERDICT: REVISE` + blocking points. Revise → fix the founded points, resubmit, up to 3 rounds. Nothing gets built until you sign off. *Complacent approval is a failure.*

### The goal loop — `/goal`

Give it a measurable target and it **iterates until done**: every loop is act → **verify the result factually** (run it, don't assume) → measure the gap. It stops only when the criterion is met *and verified*, or a real blocker needs your decision. Stack two patches on the same dying approach and it stops, switches, and says so — no snowballing.

### The gate — `/gate`

The checklist before any consequential move: **verified facts** (everything else is flagged "assumption") · **goal + measurable success criterion** · **≥2 real options** · **the choice + the concrete signal that would say it's wrong** · **the smallest test that settles it.** If a line can't be filled, the gate isn't passed.

### Specialist agents

| Agent | Role |
|---|---|
| **executor** | Implements one bounded task, exactly — verifies before returning, stops instead of improvising a workaround. |
| **reviewer** | Adversarial code review of a diff: real bugs, regressions, security, dangerous debt — `file:line`, failure scenario, minimal fix. No cosmetics, no compliments. |
| **debugger** | Evidence-first: reproduce → isolate → **prove the root cause** → minimal fix → re-verify. A workaround that masks the symptom is forbidden. |
| **explore** | Read-only: locate, map, summarize code with cited `file:line`. Never writes. |

### Commands

| Command | What it does |
|---|---|
| `/panel` | Convene the three-mandate panel on a decision; act only on convergence. |
| `/gate` | Fill the pre-action gate: facts / goal+criterion / ≥2 options / error signal / smallest test. |
| `/goal` | Goal mode — iterate to a measurable done, verifying each step. |
| `/grill-me` | Interview your plan, then have a different model adversarially review it. |
| `/review` | Adversarial review of the current session's work. |
| `/debug` | Evidence-first debugging: reproduce, isolate, prove, fix. |
| `/verify` | Factual check — build, typecheck, tests — raw report, no changes. |
| `/onboard` | Generate the project's `AGENTS.md`: structure, conventions, commands, pitfalls. |
| `/fable` | Apply the Fable five-gate task loop. |
| `/session-doc` | End-of-session doc: Done / Difficulties / To-do, Fibonacci points. |

Agents also talk to Claude Code and other MCP clients through a native MCP server, exposing the grill and the panel as tools.

---

## Built on opencode

CodeOS is a fork of **[opencode](https://github.com/sst/opencode)** (MIT). The visible identity is CodeOS; the engine internals stay close to upstream so improvements can be merged back. All credit for the underlying agent runtime goes to the opencode authors.

## License

**MIT** — see [LICENSE](LICENSE). Copyright © 2025 opencode, © 2026 OdyssAI — CodeOS.
