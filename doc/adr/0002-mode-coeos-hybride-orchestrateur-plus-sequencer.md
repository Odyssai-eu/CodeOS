# Mode CoeOS : hybride orchestrateur (prompt) + sequencer (code), executor dédié

Le mode CoeOS (3e mode primaire à côté de Build/Plan) est un agent primary
Orchestrator qui planifie dans un Task File puis dispatche chaque tâche au
subagent du bon rôle, le rôle→modèle venant du Routing Brain (console `:4800`)
— jamais de pipeline-as-model (décision gelée 2026-07-15 respectée). Les
planchers du Sequencer (triage, skeptic forcé, review forcé) restent actifs en
filet : la rigueur se décide en code, l'orchestration se décide en prompt.
Décision au grill 2026-07-16.

Deux invariants antérieurs sont amendés, pas violés :

1. **Anti-récursion** : `task` reste refusé à tous les subagents ; seul
   l'Orchestrator (primary) le détient → un seul niveau de spawn, pas de
   récursion.
2. **Séparation d'écriture** : les agents éditeurs deviennent { debugger,
   agent par défaut, **executor** } — et l'Executor n'est joignable que par
   dispatch du mode CoeOS. Posé par `permission.edit`, pas par prompt.

**Considered options** : tout-en-code (sequencer étendu lisant task.md —
orchestration rigide, invisible dans l'UI) ; tout-en-prompt (déjà réfuté
2026-07-15 : un triage bien formé peut juger skeptic=false à tort).
