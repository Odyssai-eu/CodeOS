# Commands

coeos-code's 10 slash commands — your methodology, made executable. Type `/` in the
input box to list them. The app is English-only (no language selector), but
coeos-code always answers in your own language.

## The method

### `/fable <task>` — the five gates, end to end
The Fable method in one command. Discipline for any task where the first idea
may be wrong: multi-step work, unknowns, debugging, research to verify. It's not
a workflow that spits out files — it's *how* you run the task. Trivial work
(one-file edit, a lookup) skips the gates; otherwise the five gates run **in
order**, each passing before the next. When something blocks or a result
surprises you, name the current gate and re-run it.

- **G1 Scope** — state what "done" means and the check that proves it, before
  touching anything. No writable test = the task isn't understood. Read the
  standing rules and project memory first; separate known from assumed; name the
  1–3 load-bearing unknowns.
- **G2 Evidence** — never design from memory of what a file/API/dataset
  "probably" looks like: open it. Attack the load-bearing unknowns first with the
  cheapest probe; run one thin end-to-end pass before scaling.
- **G3 Adversarial** — before committing an answer, switch sides and try to
  **kill** it (what input makes it wrong? test it), then steelman what survives.
  Two failed attempts at the same fix = the diagnosis is wrong.
- **G4 Verify** — at the layer of the **claim**. "It ran" is not verified: look
  at the actual output, sample the edges (first, last, weirdest). Good news is
  suspect until you explain why the result is real.
- **G5 Report calibrated** — answer first, then support. Separate verified from
  assumed out loud; cite evidence precisely (paths, lines, the command, the
  number you saw).

Fable reaches for the other commands as tools: `/gate` (G1), `/panel` (G3),
`/verify` (G4), `/debug` (debugging under G2–G4).

## Decide

### `/panel <decision>`
The three-way panel for any consequential decision. Three subagents with
**opposing mandates** run in parallel: [[Agents|@direct]] (the simplest option
that reaches the goal), @alternative (the best *different* option), @sceptique
(why it will break). Each grounds its case on verified repo facts (files:lines).
The synthesis is unsmoothed. **Convergence → act. No consensus → coeos-code does not
decide for you; it surfaces the positions and the stakes, and you call it.**

### `/gate <action>`
The gate before a consequential move: verified facts / goal + measurable
criterion / ≥ 2 real options / choice + the concrete sign you're wrong (the
"dead horse") / the smallest test that settles it. Any point you can't fill = the
gate is **not** passed, and it says so.

### `/grill-me <topic>`
Two acts. **Act 1** — a relentless interview, one question at a time, most
discriminating first, each with a recommended answer, until every branch of the
decision tree is resolved into a locked plan. **Act 2** — an adversarial
cross-model review by @grill-reviewer (a MiniMax model, a **different** engine
running a destruction mandate): `VERDICT: APPROVED` or `VERDICT: REVISE` with
blocking points, up to 3 rounds. No code before your go-ahead.

## Build

### `/goal <objective>`
Goal mode. Lock a **measurable** done-criterion first (build green, test passes,
endpoint responds, file produced), then loop: action → factual verification (run
it, don't assume) → remaining gap. It stops in only two cases — the criterion is
**met and verified**, or a real blocker needs your decision. A half-result
declared "done" is a failure; a dead horse (two patches stacked on the same
approach) is called out.

### `/debug <symptom>`
Delegated to [[Agents|@debugger]], evidence-first protocol: reproduce → isolate →
**prove the root cause** (files:lines) → minimal fix → re-verify. It returns the
proof of the root, the fix, and the verification. If reproduction is impossible
it says so and lists what's missing — never an invented diagnosis.

## Control

### `/review [target]`
The session's diff goes to [[Agents|@reviewer]]: real bugs by severity
(blocking / major / minor), a concrete failure scenario, the minimal fix, each
tied to file:line. Founded blocking/major issues get a proposed fix, applied only
if you've already cleared that scope — otherwise it asks. No cosmetics, no
compliments; finding nothing is a valid result.

### `/verify [scope]`
Factual report only. It detects the tooling (package scripts, Makefile,
pyproject, cargo…), runs whatever exists among typecheck / lint / build / tests,
and reports exact command → exit code → last useful lines. Binary verdict
**GREEN / RED**. It fixes nothing.

## Document

### `/onboard`
Generates the project's AGENTS.md: what it is, the structure that matters,
conventions observed in the real code, build/test/run commands **verified by
running them**, and the gotchas. Read automatically at the start of every
session.

### `/session-doc`
On-demand session doc (Done / Difficulties / To-do, Fibonacci points). Note: an
**automatic** end-of-session pass already runs via the session-doc plugin, and
persistent project memory lives in `.codeos/MEMORY.md` — see [[Memoire-et-Docs]].

See also: [[Agents]] · [[Garde-fous]]
