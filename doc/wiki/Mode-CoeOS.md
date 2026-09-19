# Mode CoeOS — architecture

> v2 (2026-07-16). Réfs : `PLAN.md`, ADRs `doc/adr/0002` et `0003`,
> glossaire `CONTEXT.md` section « coeos-code Orchestration ».

Le mode CoeOS est le troisième mode primaire de coeos-code (à côté de Build et
Plan) : un **Orchestrator** suit la logique du travail et appelle les agents
quand il faut. Claude Code n'a pas d'équivalent.

## Le flux

```
Sophie ──> [coeos] Orchestrator (primary, ne code jamais)
              │ 1. explore/panel (subagents read-only)
              │ 2. taskfile plan  ──> .opencode/plans/<sessionID>/task.md
              │ 3. taskfile approve ──> GO global (Question à Sophie)
              │ 4. boucle par tâche :
              │      read → status doing → task(executor) → task(reviewer) → status done
              │      (échec → 1 retry debugger → blocked, poursuite)
              │ 5. récap final
              ▼
        événements taskrun.* / taskfile.updated (SSE)
              ▼
        Mission Control (trois panneaux, live)
```

## Les invariants, et OÙ ils vivent

La règle du fork : **la rigueur se décide en code, pas en prompt.**

| Invariant | Mécanisme | Fichier |
|---|---|---|
| Seul l'Orchestrator manipule le Task File | garde `ctx.agent === "coeos"` dans le tool | `packages/opencode/src/tool/taskfile.ts` |
| L'executor n'est joignable que par le mode CoeOS | garde APRÈS lookup dans TaskTool (le bypass mention `@executor` ne la contourne pas) | `packages/opencode/src/tool/task.ts` |
| Un `task_id` repris appartient au parent | validation `parentID` + `subagent_type` | `packages/opencode/src/tool/task.ts` |
| Pas de récursion de subagents | `task` refusé par défaut aux subagents (childToolDenies) ; seul le primary `coeos` le détient | `task.ts` + `coeos-config.ts` |
| Une tâche non approuvée ne démarre pas | hash par tâche (id\|role\|description) vs set approuvé au GO ; transition `doing` refusée | `packages/opencode/src/session/taskfile.ts` |
| Deps avant dispatch | transition `doing` refusée si deps ≠ done | `tool/taskfile.ts` |
| Pas de last-write-wins sur task.md | concurrence optimiste (hash contenu) + rename atomique | `session/taskfile.ts` |
| Recovery après crash | `doing` orphelins → `todo`, sous lock file | `session/taskfile.ts` |
| Review avant done | étape de dispatch de l'Orchestrator (prompt) + planchers Sequencer session racine (code) | `coeos-config.ts` + `codeos-sequencer.js` |

## Le Task File (ADR 0003)

`task.md` est la **source de vérité** — pas l'état serveur. Éditable à la
main mi-run : re-prioriser, rayer (`[x]`), bloquer. L'Orchestrator relit
avant chaque dispatch et obéit. Une tâche **ajoutée ou reformulée** après le
GO perd son approbation (son hash sort du set) : mini-GO requis avant
qu'elle démarre. Format :

```markdown
# Plan: Titre
<!-- taskfile v1 approved:abc123def456,… -->

- [ ] T1 (role: executor, points: 3) Description
- [~] T2 (role: executor, points: 5, bg) Tâche indépendante, en cours
  deps: T1
- [x] T3 (role: explore, points: 1) Finie
- [!] T4 (role: executor, points: 2) Bloquée après retry
```

## Routing par compétence (« deux harnais, un cerveau »)

Chaque agent coeos-code pointe le modèle que la console CoeOS (`:4800`) affecte
à SON rôle — la même score-table que le superagent headless. Rôles du mode :
`codeos-orchestrator`, `codeos-executor` (manifeste
`coeos-roles.json`, repo coeos-agent, commit `b8e7705`). Séquence
cross-repo obligatoire : manifeste CoeOS d'abord, puis entrées agents +
`ROLE_MANIFEST_KEY` de `coeos-config.ts` dans le même commit coeos-code.
Dégradation : console down → mapping persisté **revalidé contre
`/v1/models`** → modèle par défaut. Jamais de pipeline-as-model.

## Contrat TaskRun (Mission Control)

`packages/schema/src/taskrun.ts` — commité AVANT l'UI, c'est le contrat :
`taskrun.started|updated|completed|blocked` (+ `taskfile.updated` à chaque
écriture du fichier), émis sur le bus SSE par le tool taskfile. Les stamps
`startedAt`/`endedAt` couvrent la session executor seule.

## Ce que le mode ne promet PAS (v2)

- Durabilité des background jobs : mémoire process. La durabilité est celle
  du Task File (recovery doing→todo au restart).
- Parallélisme d'édition : les tâches `bg` doivent être indépendantes
  (pas de worktrees isolés en v2).
- Events perdus avant montage de Mission Control : pas de replay.
