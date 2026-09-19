# Plan Review Log: MCP natif coeos-code + skill grill-with-docs-codeos

Act 1 (grill-with-docs) : requirements lockés via AskUserQuestion 2026-07-16 —
reviewer = panel à 3 (pas mono-modèle) ; livrable = MCP natif + variante deux
actes grill-with-docs-codeos ; D1 primary review read-only forcé ; D2 launchd
corrigé (commit) ; D3 transport = MCP NATIF dans coeos-code (forme stdio-proxy vs
route HTTP à trancher). MAX_ROUNDS=5. Reviewer Act 2 = MiniMax-M3 (Codex cassé).

## Round 1 — MiniMax

8 findings, VERDICT: REVISE. A confirmé par lecture du code : /command
synchrone (verdict dans le text part), collision nom `mcp` (→ `mcp-serve` ok),
agent override via payload propagé par le handler. Findings intégrés (bloc
« Amendements round 1 » du PLAN) :
F1 verdict via json_schema+grep fallback ; F2 rejeter APPROVED si un enfant
panel != completed ; F3 stdio portable / http Claude-Code-only ; F4 auditer
que /panel n'a pas de champ agent ; F5 OPENCODE_SERVER_PASSWORD (race sur
:4096 ouvert) ; F6 test asserte "*":deny en 1re clé ; F7 retry/backoff si
serveur down ; F8 shadow skill nommé panel (noté).

Correction acceptée : « (a) évite le bootstrap » était trompeur — (a) et (b)
dépendent du serveur live, le gain de (a) est ergonomique (stdio).

### Claude's response
Tout intégré, aucun rejet. Le plan reste 14 pts (findings = durcissements de
WU1/WU2/WU3, pas de scope neuf).

## Round 2 — MiniMax

F1-F8 confirmés adressés (json_schema vérifié prompt.ts:1242 ; children
status ; etc.). 7 raffinements (N1-N7), VERDICT: REVISE. Notables :
- N2 : F5 entrait en conflit avec les Non-buts (toucher le serveur live) →
  résolu : proxy opt-in, sécuriser le live = décision Sophie séparée.
- N4 : WU2 mergé seulement après WU3 (sinon panel avec primary write-enabled).
Tous intégrés (bloc « Amendements round 2 »), aucun rejet, scope inchangé.

## Round 3 — MiniMax

VERDICT: APPROVED. Aucun blocker réel résiduel. 10 points sondés (latence sync,
json_schema, agent override, concurrence, coût, steps, cleanup, taille plan,
fork parentID, permissions session-level). 3 raffinements non bloquants
intégrés (B6 steps>=10, B8 test plan volumineux, B10 permissions via
ag.permission confirmé). Le plan peut passer en code.

### Resolution
Convergence en 3 rounds MiniMax (Codex indisponible). Plan final : PLAN.md,
14 pts, 5 WU avec Done vérifiables + ordre WU3→WU2 imposé. En attente du
sign-off Sophie avant tout code.
