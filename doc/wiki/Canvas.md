# Canvas

The right-hand side panel that shows the live state of a session: agents, plan,
and changes. **Off by default.**

## Enabling it

Settings → General → **Session canvas** → ON. (Desktop only.)

A collapse/expand button then appears on the right edge of the session view.

## The three sections

| Section | What you see |
|---|---|
| **Agents** | The subagents of the current session (e.g. the three mandates a `/panel` spawns — `direct`, `alternative`, `sceptique`), with their **running / idle** status in real time |
| **Plan** | The session todos: pending (dot), in progress (orange dot), done (checked, struck through) |
| **Changes** | Files touched in the session, with lines added (+) / removed (−) |

The full agent roster coeos-code can spawn is `direct`, `alternative`, `sceptique`,
`explore`, `reviewer`, `debugger` (the hidden `grill-reviewer`, backed by
MiniMax, does not surface in the canvas). See [[Agents]] for what each one does.

## Best moment to open it

Run a `/panel` or a `/grill-me` with the canvas open: you watch the three
mandates appear and work in parallel, each in its own color. This is where the
orchestration becomes visible instead of scrolling past in the chat.

## Status

Canvas **v1**: read-only, fixed width. v2 (interactions, resize, clickable
diffs) is on the backlog. If anything misbehaves, flip the toggle back OFF —
nothing else is affected.

Labels are English-only, like the rest of coeos-code 0.3.x; the app itself still
replies in whatever language you write in.

See also: [[Agents]] · [[Commandes]]
