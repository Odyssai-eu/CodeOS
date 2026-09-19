# Multi-Mac: continue one session across Macs

Start a session on the MacBook Pro and pick it up on Neo, live. The trick: both
apps talk to the **same server** instead of each running its own internal engine.

## Architecture

A headless coeos-code server runs permanently on the **MacBook Pro** (launchd service
`eu.odyssai.codeos.server`, port `4096`, survives reboot). It shares the same
storage as the app (`~/.local/share/opencode`) → **the same sessions**.

Note the two are distinct layers:

- The **coeos-code server** (this page) is where sessions, files, shell and git live.
- The **model engine** (OdyssAI / CoeOS) is resolved separately by each client —
  no hardcoded endpoint, see [[Installation]].

## Setup (once per machine)

In coeos-code → **Select Server**:

| Machine | URL to enter |
|---|---|
| MacBook Pro (the host) | `http://127.0.0.1:4096` |
| MacBook Neo | `http://mbp-m5-32.local:4096` |

> Neo's address uses the **mDNS name** (`.local`), stable even if the IP changes.
> Never hardcode an IP.

## Result

- Both Macs see the same sessions, in real time.
- Tools (files, shell, git) run **server-side** (on the MacBook Pro): Neo is a
  full remote control.
- You can close the app on the MacBook Pro without killing a running session —
  the server keeps running.
- Single writer on the store: no need to worry, the server handles it.

## Back to the local engine

Same **Select Server** menu → set `http://127.0.0.1:<local port>` (or the
built-in-engine option). Reversible at any time.

## Network prerequisites

Both Macs on the same LAN. On first access from Neo, macOS may prompt for an
incoming-connection authorization on the MacBook Pro → accept it.

coeos-code is English-only; it replies in your language. The footer shows the running
build as `coeos-code <version>` (0.3.x). The app is Developer ID-signed and Apple-
notarized (v0.2.0+), so it installs without any `xattr` / Gatekeeper workaround.

See also: [[Installation]] · [[Build-et-Release]]
