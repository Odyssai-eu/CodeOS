# MCP natif coeos-code — review par le panel à 3

> v2 (2026-07-16, refonte grill-host 2026-07-23). Réfs : `PLAN.md` (branche `mcp-panel`), skill
> `grill-with-docs-codeos`.

coeos-code expose un **serveur MCP natif** qui laisse Claude Code (ou tout hôte
MCP) faire réviser un plan par les **deux mandats de review CoeOS** — le grill
(cross-modèle) et le sceptique (routé compétence) — et poser des décisions
ouvertes au **panel à 3**. Chaque agent sur SON modèle, jamais un modèle unique.

## Ce que ça expose

Sous-commande `mcp-serve` (stdio), deux outils :

| Outil | Rôle |
|---|---|
| `grill_review` | Révise un PLAN via les DEUX mandats de review CoeOS — grill (cross-modèle, MiniMax) + sceptique (routé compétence) ; verdict UNANIME `VERDICT: APPROVED`/`REVISE`. Read-only. |
| `panel_ask` | Pose une décision/question ouverte au panel, rend la synthèse (sans verdict structuré). |

Le nom `mcp` étant déjà pris (commande client d'auth MCP), la sous-commande
serveur s'appelle `mcp-serve`.

## Comment ça marche

```
Claude Code ──(stdio MCP)──> codeos mcp-serve ──(HTTP)──> serveur coeos-code
                                        grill_review              │
                                                                  ▼
                                                     grill-host (read-only)
                                                     ├─ @grill-reviewer  (modèle grill : MiniMax, cross-modèle)
                                                     └─ @sceptique       (modèle sceptique : routé score-table)
                                                     └─ synthèse → VERDICT unanime
                                        panel_ask                 │
                                                                  ▼
                                                     panel-host (read-only)
                                                     ├─ @direct / @alternative / @sceptique (panel à 3)
                                                     └─ synthèse (décision, pas de verdict structuré)
```

- `mcp-serve` ne boote **pas** d'instance opencode : il proxifie le serveur
  coeos-code déjà configuré (`CODEOS_SERVER_URL`, défaut `http://127.0.0.1:4096`).
- `grill_review` passe par **`grill-host`** (dispatch grill-reviewer + sceptique, APPROVED seulement si les deux approuvent) ; `panel_ask` par **`panel-host`** (`mode: primary`, `hidden`,
  `edit/write/bash: deny`, `task` borné à direct/alternative/sceptique) — la
  review ne modifie **jamais** rien (garantie structurelle, pas un vœu de
  prompt).
- **Verdict garanti** : le tool lit la synthèse ; pas de `VERDICT:` extractible
  → `REVISE` par défaut (jamais un APPROVED supposé).
- **Review incomplète ≠ APPROVED** : si un reviewer n'a pas abouti (timeout,
  erreur), le verdict est forcé à `REVISE`.

## Brancher dans Claude Code

Prérequis : un serveur coeos-code joignable (launchd `eu.odyssai.codeos.server`
sur `:4096`, ou `opencode serve --port 4096`) dont la config porte
`grill-host` + `panel-host` + la command `/panel` (tous dans `COEOS_DEFAULT_CONFIG`).

```bash
# binaire = l'entrée CLI de coeos-code (bun run .../packages/opencode/src/index.ts,
# ou le binaire packagé). Exemple en dev :
claude mcp add codeos -- bun run \
  ~/Claude/code/OdyssAI-coeos-code/packages/opencode/src/index.ts mcp-serve

claude mcp list        # -> codeos: connected (grill_review, panel_ask)
```

Variables d'environnement (optionnelles) :

| Var | Défaut | Rôle |
|---|---|---|
| `CODEOS_SERVER_URL` | `http://127.0.0.1:4096` | serveur coeos-code cible (ex. `http://mbp-m5-32.local:4096` en LAN) |
| `CODEOS_SERVER_PASSWORD` | — | si le serveur exige un Basic auth (`OPENCODE_SERVER_PASSWORD`) |
| `CODEOS_SERVER_USERNAME` | `opencode` | username du Basic |

Serveur down au moment d'un appel : le tool fait un retry/backoff (5s/10s/20s)
puis rend une erreur claire — pas de spinner infini.

## L'usage principal : `grill-with-docs-codeos`

La skill `grill-with-docs-codeos` orchestre le tout : Act 1 interview + docs,
Act 2 boucle `grill_review` sur `PLAN.md` jusqu'à `VERDICT: APPROVED` ou
`MAX_ROUNDS`, log dans `PLAN-REVIEW-LOG.md`. C'est l'équivalent des variantes
`-minimax`/`-codex`, mais les reviewers sont **les deux mandats CoeOS** (grill cross-modèle +
sceptique routé), pas un modèle unique.

## Sécurité

- Read-only structurel (agents `edit/bash: deny`).
- **Ne pas mettre de secret dans un plan** soumis au panel : il est loggé dans
  la session DB CoeOS (`~/.local/share/opencode/.../db.sqlite`).
- Le serveur `:4096` est ouvert par défaut (pas d'auth) ; sur un réseau
  partagé, poser `OPENCODE_SERVER_PASSWORD` (décision séparée) et le passer via
  `CODEOS_SERVER_PASSWORD`.

Voir aussi : [[Mode-CoeOS]] · [[Build-et-Release]].
