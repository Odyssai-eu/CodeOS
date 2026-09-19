# Plan: MCP natif coeos-code + skill grill-with-docs-codeos

_À grill via MiniMax (Codex cassé : gpt-5.6-sol > CLI 0.133.0). Décisions
Sophie 2026-07-16 : panel à 3 comme reviewer ; variante deux actes ; primary
review read-only forcé (D1) ; launchd corrigé (D2, fait) ; transport =
**MCP natif dans coeos-code**, pas un wrapper séparé._

## Goal

Permettre à Claude Code (et tout hôte MCP) de faire réviser un plan par le
**panel à 3 de CoeOS** (direct / alternative / sceptique — trois mandats
opposés, convergence sur faits vérifiés) au lieu d'un reviewer mono-modèle.
Livré en deux morceaux : (1) un **serveur MCP natif** exposé par coeos-code lui-
même, qui offre un outil `panel_review` (et un `panel_ask` générique) adossé
au `/panel` déjà servi ; (2) une **skill `grill-with-docs-codeos`** deux
actes (interview docs + review panel en boucle) qui consomme cet outil.

## Contexte vérifié (scouting 2026-07-16, ne pas re-explorer)

- `/panel` est un **command** de `COEOS_DEFAULT_CONFIG.command`
  (`packages/desktop/src/main/coeos-config.ts:332`) : template `$ARGUMENTS`
  qui fait dispatcher @direct/@alternative/@sceptique puis synthétiser un
  VERDICT. Les 3 critiques sont `edit:deny, bash:deny` (read-only structurel).
- `POST /session/:sessionID/command` (`groups/session.ts:343`, handler
  `handlers/session.ts:329`, impl `prompt.ts:1355`) : payload
  `{command, arguments, agent?, model?}`, **SYNCHRONE** — rend le message de
  synthèse du primary (le VERDICT est dans son `text` part). Bonus : lire les
  3 enfants via `GET /session/:id/children` + `/message`.
- Command custom de `OPENCODE_CONFIG_CONTENT` **joignable** via cet endpoint
  (`command/index.ts:90`, `config.ts:467`).
- Serveur live `0.0.0.0:4096`, **sans auth** aujourd'hui (Basic optionnel via
  `OPENCODE_SERVER_PASSWORD`, `server/auth.ts`).
- CLI : sous-commandes yargs dans `packages/opencode/src/index.ts:81-94`. La
  commande `mcp` (`cli/cmd/mcp.ts`) est le **client** d'auth MCP — le nom est
  pris. `acp` existe (`AcpCommand`). SDK v2 réutilisable
  (`createOpencodeClient`, `Session2.create/command/children/messages`).
- Squelette serveur MCP maison à copier : `Companion/server/routes/mcp.ts`
  (`McpServer` + Streamable HTTP + Zod). opencode n'a que du MCP **client**.
- Le template panel rend un VERDICT libre, **pas** `APPROVED/REVISE` structuré
  → l'outil MCP contraint le format via `arguments` (zéro modif config).

## Approche

Branche `mcp-panel`. Direct-push interdit tant que le grill n'a pas convergé
et Sophie signé. WU découpés, chacun avec un « Done = » vérifiable.

1. **WU1 — Transport natif (le fork à trancher au grill)** [3 pts]
   Décision D3 : le MCP est **natif** (ship dans coeos-code). Deux formes natives
   possibles — le grill tranche :
   - **(a) recommandée — sous-commande stdio `mcp-serve`** : nouvelle
     `McpServeCommand` (yargs, `index.ts`), sert MCP sur **stdio**, se
     branche dans Claude Code par `claude mcp add codeos -- <bin> mcp-serve`.
     Elle ne boote PAS une instance opencode (coût standalone déjà identifié
     lourd en WU6 desktop) : elle **proxifie** vers le serveur HTTP coeos-code
     déjà configuré (`CODEOS_SERVER_URL`, défaut `http://127.0.0.1:4096`) via
     `createOpencodeClient`. Native = livrée par coeos-code, ergonomie stdio pour
     l'hôte, réutilise la config CoeOS du serveur qui tourne.
   - **(b) alternative — route HTTP `/mcp`** sur le serveur opencode
     (Streamable HTTP, transport Companion). Claude Code s'y branche par
     `claude mcp add --transport http codeos http://…:4096/mcp`. Réutilise le
     serveur mais dépend de son uptime (→ D2 launchd, corrigé).
   **Done =** `claude mcp add` réussit ; `claude mcp list` montre `codeos`
   connecté ; un `tools/list` renvoie les outils.

2. **WU2 — Outil `panel_review`** [3 pts]
   Le cœur. Paramètres : `plan` (texte du PLAN.md), `context?` (glossaire/
   ADRs), `repo_dir?` (worktree cible pour le header directory). Le handler :
   crée une session (`Session2.create`), envoie `command:"panel"` avec des
   `arguments` = le plan + le contexte + l'**instruction de format**
   (« termine par exactement une ligne `VERDICT: APPROVED` ou
   `VERDICT: REVISE` suivie, si REVISE, des points bloquants numérotés »).
   Read-only forcé (D1) : `agent=` sur un primary **sans droits edit/bash**
   (à créer/choisir — un `panel-host` dédié, ou vérifier qu'un primary
   read-only existe). Retour de l'outil : le texte de synthèse (verdict +
   findings) ; option `include_critics` pour joindre les 3 sorties enfants.
   **Done =** appel réel contre le serveur `.44/.21` : le tool rend une
   synthèse se terminant par `VERDICT: APPROVED|REVISE` ; avec un plan bidon
   (hypothèse fausse citée), le sceptique la casse et le verdict = REVISE.

3. **WU3 — Garde read-only structurelle (D1)** [2 pts]
   Le primary qui dispatche le panel ne doit pas pouvoir éditer. Soit un
   agent `panel-host` (`mode:primary`, `edit/bash/write: deny`,
   `task:{direct/alternative/sceptique: allow, "*": deny}`) ajouté à
   `COEOS_DEFAULT_CONFIG` (attention à l'ordre des clés `task` — piège
   `Permission.disabled`, cf. fix `3eacc8503` : `"*":deny` en PREMIER), soit
   preuve qu'un primary read-only convient. Le MCP force cet agent, pas un
   choix d'appelant.
   **Done =** tenter une écriture depuis la session panel est refusé
   structurellement (permission), pas seulement par le prompt.

4. **WU4 — Skill `grill-with-docs-codeos`** [5 pts]
   Fichier `~/.claude/skills/grill-with-docs-codeos/SKILL.md`, calqué sur
   `grill-with-docs-minimax` (MIT, créditer THIRD-PARTY-NOTICES). Act 1 :
   interview + CONTEXT.md/ADRs (identique). Act 2 : au lieu de `mmx`, appelle
   l'outil MCP `panel_review` sur `PLAN.md`, boucle jusqu'à
   `VERDICT: APPROVED` ou `MAX_ROUNDS`. Log dans `PLAN-REVIEW-LOG.md`.
   Prérequis documenté : le serveur MCP `codeos` branché + un serveur CoeOS
   joignable.
   **Done =** `/grill-with-docs-codeos` lance l'interview puis fait réviser un
   vrai PLAN.md par le panel, itère, converge, écrit le log.

5. **WU5 — Docs** [1 pt]
   Wiki (comment brancher le MCP dans Claude Code, la matrice
   outil↔endpoint), section AGENTS.md.
   **Done =** doc commitée ; un tiers peut brancher le MCP en suivant.

Total : **14 points**.

## Décisions & tradeoffs

- **Panel à 3, pas mono-modèle** (Sophie) — le différenciateur ; coût 3
  agents/round assumé.
- **Natif dans coeos-code** (Sophie) — ship avec le produit ; forme exacte
  (stdio-proxy vs route HTTP) au grill, reco = stdio-proxy (évite le
  bootstrap standalone lourd de WU6, garde l'ergonomie stdio de Claude Code).
- **Verdict structuré injecté par l'outil**, pas de modif du template panel.
- **Read-only structurel** (D1) via agent sans droits, pas via prompt.
- **launchd corrigé** (D2, commit fait) — pertinent surtout pour la forme (b).

## Risques / questions ouvertes

- **Latence & timeout** : `/command` est synchrone et un panel = 3 agents ; un
  round peut être long. L'hôte MCP (Claude Code) a-t-il un timeout d'outil qui
  couperait ? À mesurer ; prévoir un mode async (créer session → renvoyer un
  handle → outil `panel_poll`) si le sync dépasse la limite.
- **Read-only host** : faut-il créer `panel-host` ou un primary read-only
  existe-t-il ? (à vérifier en WU3, ne pas supposer.)
- **Découverte serveur** : `CODEOS_SERVER_URL` explicite vs auto-discovery
  LAN — la forme stdio-proxy exige une URL ; défaut `127.0.0.1:4096` + env.
- **Auth** : ouvert aujourd'hui ; si password ajouté, le proxy doit passer
  Basic — prévoir `CODEOS_SERVER_PASSWORD` optionnel.
- **Boucle qui ne converge pas** : le panel peut renvoyer REVISE indéfiniment
  → `MAX_ROUNDS` dur dans la skill, deadlock remonté à l'humain.

## Non-buts

- Pas de bootstrap d'instance opencode standalone (coût WU6 connu) — le MCP
  proxifie un serveur déjà configuré.
- Pas de modif du template `/panel` ni des agents panel existants.
- Pas de pilotage d'un run CoeOS complet (Orchestrateur/Task File) par le MCP
  dans cette itération — seulement le panel review. (Extension future.)
- Pas de déploiement `.39`/prod ; pas de touche au serveur live sans GO.

## Amendements round 1 (MiniMax, 8 findings intégrés)

- **F1 (verdict garanti)** — WU2 : ne PAS dépendre du prompt pour le format.
  Forcer `format:{type:"json_schema"}` dans le payload command si le modèle le
  supporte (`prompt.ts` gère json_schema) ; sinon fallback : relire le texte
  et `grep ^VERDICT:`. Si aucun verdict extractible → REVISE par défaut.
- **F2 (panel incomplet ≠ APPROVED)** — WU2 : après le run, vérifier le
  statut des 3 sessions enfants (`GET /session/:id/children` + statut). Si un
  critique n'a pas `completed` (timeout, rate-limit), forcer REVISE motif
  « panel incomplet » — jamais un APPROVED sur 2 avis.
- **F3 (transport)** — WU1 : (a) stdio = portable ; (b) HTTP = Claude-Code-only,
  documenté comme tel.
- **F4 (agent override)** — WU3 : auditer que la command `/panel` de
  `COEOS_DEFAULT_CONFIG` ne déclare PAS de champ `agent:` (sinon le payload
  `agent=panel-host` du MCP est ignoré). Vérifié au scouting : le template
  panel n'a que `description` + `template`, pas d'`agent` → l'override tiendra,
  mais le WU3 le re-teste (ne pas supposer).
- **F5 (auth/race)** — WU1 : `OPENCODE_SERVER_PASSWORD` posé sur le serveur,
  Basic passé par le proxy — sinon un process local peut injecter dans la
  session panel mid-run.
- **F6 (test read-only fiable)** — WU3 : le test « écriture refusée » doit
  ASSERTER que la 1re clé de `task` est `"*": "deny"` (piège
  `Permission.disabled`, commit `3eacc8503`), sinon faux positif.
- **F7 (serveur down)** — WU1 : retry/backoff dans `mcp-serve`, pas de crash.
- **F8 (shadow skill)** — Risque noté : `command/index.ts:134` charge aussi les
  skills ; un skill nommé `panel` masquerait la command. Non bloquant, à
  surveiller (garder le nom `panel` réservé côté command).

## Amendements round 2 (MiniMax, 7 raffinements)

- **N1** — WU2/F2 : critère « enfant incomplet » élargi : REVISE si le statut
  d'un critique ∈ {non-completed, error, length-cap, content-filter, idle
  après timeout}, pas seulement `!= completed`.
- **N2 (conflit résolu)** — WU1/F5 : NE PAS poser de password sur le serveur
  live (viole les Non-buts « pas de touche au serveur live sans GO »). Le
  proxy est opt-in : si `CODEOS_SERVER_PASSWORD` présent → Basic ; sinon mode
  dev sans auth + avertissement stderr. Sécuriser le live = décision Sophie
  séparée, hors itération.
- **N3** — WU1/F7 : kill-switch — après 3 retries (5s/10s/20s) le bin sort
  `exit 1` + stderr clair, pas de spinner infini qui bloque le tool MCP.
- **N4 (ordonnancement)** — WU2 ne peut être **mergé qu'après WU3** : sinon
  `panel_review` invoque `/panel` avec un primary write-enabled = fuite
  read-only silencieuse. Dépendance dure : WU3 (garde) avant WU2 (outil) en
  intégration, même si dev en parallèle.
- **N5** — WU1 : vérifier que `createOpencodeClient` (SDK v2) propage
  `Authorization: Basic` via sa config `headers` ; sinon fallback `fetch`
  manuel dans le proxy. Ne pas supposer.
- **N6 (secrets)** — WU2 : le plan est loggé dans la session DB CoeOS
  (`~/.local/share/opencode/.../db.sqlite`). Doc explicite : ne pas mettre de
  secret dans un PLAN.md soumis au panel ; le tool n'est pas un canal sûr pour
  du secret client.
- **N7 (PATH)** — WU1 install : `mcp-serve` doit être résolvable par l'hôte
  (`claude mcp add codeos -- <bin>`). Postinstall qui symlink vers
  `~/.local/bin/`, ou doc de l'ajout PATH manuel. Testé par `claude mcp list`.

## Amendements round 3 (MiniMax — APPROVED, raffinements non bloquants)

- **B6** — WU3 : `panel-host.steps >= 10` (dispatch + 3 enfants + synthèse),
  sinon le panel peut ne pas converger.
- **B8** — WU2 Done : tester avec un plan > 50k tokens (le dispatch tient, les
  3 enfants reçoivent l'essentiel).
- **B10 (confirmé)** : les permissions read-only viennent de `ag.permission`
  de l'agent `panel-host`, pas du payload command — donc `panel-host` DOIT
  porter `permission` dans sa def (déjà dans WU3). L'`agent=` du payload
  applique bien l'agent (donc ses permissions).
