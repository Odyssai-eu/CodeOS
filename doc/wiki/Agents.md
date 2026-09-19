# Agents

coeos-code ships with specialized subagents. You invoke them directly with
`@<name>`, or a [[Commandes|command]] orchestrates them. Each one has a strict
mandate and a color. They all run on the **CoeOS** models served through the
**OdyssAI** provider (the exception is noted below).

## The panel (via `/panel`)

| Agent | Mandate | Color |
|---|---|---|
| **@direct** | Argues for the SIMPLEST option that meets the goal, anchored on facts from the repo | green |
| **@alternative** | Builds the best option DIFFERENT from the obvious one; only concedes when the facts force it | orange |
| **@sceptique** | Red-team: hunts for why it will break (unverified assumptions, side effects, irreversible steps) | red |

Three agents can be wrong together, so they argue over **verified facts**, not
rhetoric. You only act once the three converge.

## The coding roles

| Agent | Role | Via |
|---|---|---|
| **@reviewer** | Finds real bugs, ranked by severity, with a concrete failure scenario and a minimal fix. Zero complacency | `/review` |
| **@debugger** | Evidence-first: reproduce -> isolate -> prove the root cause -> minimal fix -> verify | `/debug` |
| **@explore** | Read-only research: locates, maps, summarizes. Never writes. Runs on **CoeOS box** (fast) | direct or orchestrated |

## The hidden reviewer

**@grill-reviewer** — used only by `/grill-me`, invisible in the picker. It is
**MiniMax** (a model other than CoeOS) on purpose: an adversarial plan review by
a different model catches what the author cannot see. Returns
`VERDICT: APPROVED / REVISE`.

## Why it helps

The panel stops you from charging at the first idea. The reviewer and debugger
bring a second set of eyes that a linear chat never gives you. The explore agent
spares the main session's context. All of this lives **inside the harness**, not
in a prompt you have to rewrite every time.

coeos-code answers in your language — the app itself is English-only (no language
selector), but the model matches whatever language you write in.

See also: [[Commandes]] · [[Canvas]] (watch the active subagents live)
